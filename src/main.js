import './style.css'
import Phaser from 'phaser'

// --- CONSTANTES DU JEU ---
const GRID_SIZE = 4;
const TILE_SIZE = 100;
const TILE_SPACING = 16;
const GAME_WIDTH = (TILE_SIZE * GRID_SIZE) + (TILE_SPACING * (GRID_SIZE + 1));
const GAME_HEIGHT = GAME_WIDTH + 100;
const TWEEN_DURATION = 100;

// Couleurs
const TILE_COLORS = { 0: '#cdc1b4', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
const TEXT_COLORS = { 2: '#776e65', 4: '#776e65', default: '#f9f6f2' };

// --- SÉLECTION DES ÉLÉMENTS HTML ---
const gameCanvas = document.querySelector("#gameCanvas");
const gameEndDiv = document.querySelector("#gameEndDiv");
const gameEndScoreSpan = document.querySelector("#gameEndScoreSpan");
const gameRestartBtn = document.querySelector("#gameRestartBtn");


// --- SCÈNE PHASER ---
class GameScene extends Phaser.Scene {
    constructor() {
        super("scene-game");
        this.grid = []; 
        this.visualGrid = []; 
        this.score = 0;
        this.canMove = true;
    }

    preload() {
        // ...
    }

    create() {
        this.score = 0;
        this.canMove = true;
        this.cameras.main.setBackgroundColor('#bbada0');
        
        this.initGrid();
        this.visualGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        
        this.drawGridBackground();

        this.scoreText = this.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT - 50, 
            'Score: 0', 
            { fontSize: '32px', fill: '#776e65', fontStyle: 'bold' }
        ).setOrigin(0.5);

        this.addRandomTile();
        this.addRandomTile();
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown', this.handleInput, this);
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);
    }

    // --- INITIALISATION ---

    initGrid() {
        this.grid = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                this.grid[y][x] = 0;
            }
        }
    }

    drawGridBackground() {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                let pos = this.getTilePosition(x, y);
                this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, Phaser.Display.Color.HexStringToColor(TILE_COLORS[0]).color).setOrigin(0.5);
            }
        }
    }
    
    // NOUVEAU: Fonction pour créer UN objet tuile
    createVisualTile(x, y, value) {
        let pos = this.getTilePosition(x, y);
        let container = this.add.container(pos.x, pos.y);
        
        let tileRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, Phaser.Display.Color.HexStringToColor(TILE_COLORS[value]).color).setOrigin(0.5);
        let tileText = this.add.text(0, 0, value, { fontSize: '48px', fill: TEXT_COLORS[value] || TEXT_COLORS.default, fontStyle: 'bold' }).setOrigin(0.5);
        
        // --- BONUS FIX: Gérer la taille de la police ---
        if (value >= 1024) {
            tileText.setFontSize('32px');
        } else if (value >= 128) {
            tileText.setFontSize('40px');
        }
        // --- FIN BONUS FIX ---

        container.add([tileRect, tileText]);
        container.setData('value', value);
        
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: TWEEN_DURATION,
            ease: 'Power2'
        });

        return container;
    }

    addRandomTile() {
        let emptyTiles = this.getEmptyTiles();
        if (emptyTiles.length > 0) {
            let spot = Phaser.Math.RND.pick(emptyTiles);
            let value = (Math.random() < 0.9) ? 2 : 4;
            
            this.grid[spot.y][spot.x] = value;
            
            let tile = this.createVisualTile(spot.x, spot.y, value);
            this.visualGrid[spot.y][spot.x] = tile;
        }
    }
    
    // --- GESTION DES MOUVEMENTS ---

    handleInput(event) {
        if (!this.canMove) return;

        let direction;
        switch (event.code) {
            case 'ArrowLeft': direction = { x: -1, y: 0 }; break;
            case 'ArrowRight': direction = { x: 1, y: 0 }; break;
            case 'ArrowUp': direction = { y: -1, x: 0 }; break;
            case 'ArrowDown': direction = { y: 1, x: 0 }; break;
            default: return;
        }

        this.move(direction);
    }
    
    move(direction) {
        this.canMove = false;
        let moved = false;
        
        let mergedGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

        let startX = (direction.x === 1) ? GRID_SIZE - 2 : 0;
        let endX = (direction.x === 1) ? -1 : GRID_SIZE;
        let iterX = (direction.x === 1) ? -1 : 1;

        let startY = (direction.y === 1) ? GRID_SIZE - 2 : 0;
        let endY = (direction.y === 1) ? -1 : GRID_SIZE;
        let iterY = (direction.y === 1) ? -1 : 1;
        
        // Boucle principale de mouvement
        for (let y = startY; y !== endY; y += iterY) {
            for (let x = startX; x !== endX; x += iterX) {
                
                let tile = this.visualGrid[y][x];
                if (!tile) continue;

                let currentY = y;
                let currentX = x;
                let targetY = y;
                let targetX = x;
                
                // 1. Trouver la destination
                while (
                    targetX + direction.x >= 0 && targetX + direction.x < GRID_SIZE &&
                    targetY + direction.y >= 0 && targetY + direction.y < GRID_SIZE &&
                    this.grid[targetY + direction.y][targetX + direction.x] === 0
                ) {
                    targetY += direction.y;
                    targetX += direction.x;
                }

                // 2. Vérifier la fusion
                let nextY = targetY + direction.y;
                let nextX = targetX + direction.x;
                let targetTile = null;

                if (nextY >= 0 && nextY < GRID_SIZE && nextX >= 0 && nextX < GRID_SIZE) {
                    targetTile = this.visualGrid[nextY][nextX];
                }

                if (targetTile && 
                    targetTile.getData('value') === tile.getData('value') && 
                    !mergedGrid[nextY][nextX]) 
                {
                    // Fusion
                    mergedGrid[nextY][nextX] = true;
                    targetY = nextY;
                    targetX = nextX;
                    
                    let newValue = tile.getData('value') * 2;
                    this.grid[targetY][targetX] = newValue;
                    this.grid[currentY][currentX] = 0;
                    
                    // --- LA CORRECTION DU BUG EST ICI ---
                    this.visualGrid[currentY][currentX] = null;
                    // --- FIN DE LA CORRECTION ---
                    
                    this.score += newValue;
                    
                    this.animateTileMove(tile, targetX, targetY, true, targetTile, newValue);
                    moved = true;
                    
                } else if (targetX !== currentX || targetY !== currentY) {
                    // Mouvement simple
                    this.grid[targetY][targetX] = tile.getData('value');
                    this.grid[currentY][currentX] = 0;
                    
                    this.visualGrid[targetY][targetX] = tile;
                    this.visualGrid[currentY][currentX] = null;

                    this.animateTileMove(tile, targetX, targetY);
                    moved = true;
                }
            }
        }
        
        if (!moved) {
            this.canMove = true;
            return;
        }
        
        this.scoreText.setText('Score: ' + this.score);
        
        this.time.delayedCall(TWEEN_DURATION + 20, () => {
             this.addRandomTile();
             if (this.checkGameOver()) {
                 this.gameOver();
             } else {
                 this.canMove = true;
             }
        });
    }

    animateTileMove(tile, targetX, targetY, isMerging = false, targetTile = null, newValue = 0) {
        let pos = this.getTilePosition(targetX, targetY);

        this.tweens.add({
            targets: tile,
            x: pos.x,
            y: pos.y,
            duration: TWEEN_DURATION,
            ease: 'Power2',
            onComplete: () => {
                if (isMerging) {
                    tile.destroy();
                    targetTile.setData('value', newValue);
                    
                    let rect = targetTile.getAt(0); 
                    let text = targetTile.getAt(1); 
                    
                    rect.setFillStyle(Phaser.Display.Color.HexStringToColor(TILE_COLORS[newValue]).color);
                    text.setText(newValue);
                    text.setFill(TEXT_COLORS[newValue] || TEXT_COLORS.default);

                    // --- BONUS FIX: Gérer la taille de la police ---
                    if (newValue >= 1024) {
                        text.setFontSize('32px');
                    } else if (newValue >= 128) {
                        text.setFontSize('40px');
                    } else {
                        text.setFontSize('48px'); // Réinitialiser au cas où
                    }
                    // --- FIN BONUS FIX ---
                    
                    this.tweens.add({
                        targets: targetTile,
                        scale: 1.1,
                        duration: TWEEN_DURATION / 2,
                        yoyo: true,
                        ease: 'Power2'
                    });
                }
            }
        });
    }

    // --- GESTION DU SWIPE ---
    startSwipe(pointer) { this.swipeStartX = pointer.x; this.swipeStartY = pointer.y; }
    endSwipe(pointer) {
        let dx = pointer.x - this.swipeStartX;
        let dy = pointer.y - this.swipeStartY;
        if (Math.abs(dx) < 50 && Math.abs(dy) < 50) return;
        
        let direction;
        if (Math.abs(dx) > Math.abs(dy)) {
            direction = (dx > 0) ? {x: 1, y: 0} : {x: -1, y: 0};
        } else {
            direction = (dy > 0) ? {x: 0, y: 1} : {x: 0, y: -1};
        }
        if (this.canMove) this.move(direction);
    }
    
    // --- OUTILS ---
    getTilePosition(x, y) {
        return {
            x: (x * TILE_SIZE) + (x * TILE_SPACING) + TILE_SPACING + TILE_SIZE / 2,
            y: (y * TILE_SIZE) + (y * TILE_SPACING) + TILE_SPACING + TILE_SIZE / 2
        };
    }
    
    getEmptyTiles() {
        let emptyTiles = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.grid[y][x] === 0) emptyTiles.push({ x, y });
            }
        }
        return emptyTiles;
    }

    // --- FIN DU JEU ---
    checkGameOver() {
        if (this.getEmptyTiles().length > 0) return false;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                let currentValue = this.grid[y][x];
                if (x < GRID_SIZE - 1 && this.grid[y][x + 1] === currentValue) return false;
                if (y < GRID_SIZE - 1 && this.grid[y + 1][x] === currentValue) return false;
            }
        }
        return true; 
    }
    
    gameOver() {
      this.canMove = false;
      this.scene.pause(); 
      gameEndScoreSpan.textContent = this.score;
      gameEndDiv.style.display = "flex";
    }
}

// --- CONFIGURATION PHASER ---
const config = {
    type: Phaser.WEBGL, 
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    canvas: gameCanvas,
    physics: {
      default: "arcade",
      arcade: { debug: false }
    },
    scene: []
};

// --- INITIALISATION DU JEU ---
const game = new Phaser.Game(config);
game.scene.add("scene-game", GameScene);
game.scene.start("scene-game");

gameRestartBtn.addEventListener("click", () => {
  gameEndDiv.style.display = "none";
  // On 'restart' la scène pour nettoyer toutes les tuiles
  game.scene.stop('scene-game'); 
  game.scene.start('scene-game');
});