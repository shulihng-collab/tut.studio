// Game Engine controller, inputs, entity loops, state management

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tilemap = new Tilemap();
        this.player = new Player(40, 100);
        this.keys = {};
        
        // Entity lists
        this.enemies = [];
        this.items = [];
        this.debrisList = [];
        this.fireballs = [];
        this.floatingCoins = [];

        // Game states
        this.state = 'start'; // 'start', 'playing', 'paused', 'gameover', 'victory'
        this.cameraX = 0;
        this.timeLeft = 400; // Classic level timer
        this.timerTicks = 0;
        this.autoplay = false; // DEMO autoplay mode!

        // UI screen elements
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.victoryScreen = document.getElementById('victoryScreen');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.audioToggle = document.getElementById('audioToggle');
        this.demoToggle = document.getElementById('demoToggle');

        this.setupInputs();
        this.setupAudioButton();
        this.setupDemoButton();
        this.spawnEnemies();
    }

    spawnEnemies() {
        this.enemies = [];
        // Spawn Goombas at various positions along the map
        const goombaSpawns = [
            250, 480, 680, 850, 980, 1150, 1300, 1500, 1720, 1900
        ];
        goombaSpawns.forEach(x => {
            this.enemies.push(new Goomba(x, 180));
        });
    }

    spawnItem(x, y, type) {
        if (type === 'coin') {
            this.floatingCoins.push(new FloatingCoin(x, y));
            this.player.coins++;
            this.player.score += 200;
            if (this.player.coins >= 100) {
                this.player.coins = 0;
                this.player.lives++;
                sound.playSFX('powerup');
            }
        } else if (type === 'mushroom') {
            const shroom = new Mushroom(x, y);
            shroom.vy = -1.5;
            this.items.push(shroom);
        }
    }

    spawnFireball(x, y, dir) {
        this.fireballs.push(new Fireball(x, y, dir));
    }

    spawnDebris(x, y) {
        this.debrisList.push(new Debris(x, y, -2, -4));
        this.debrisList.push(new Debris(x, y, 2, -4));
        this.debrisList.push(new Debris(x, y, -1, -6));
        this.debrisList.push(new Debris(x, y, 1, -6));
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            // If autoplay is active, suppress player inputs except space/jump/direction changes if they want to override,
            // but to keep it fully animated and autonomous, let's keep keys tracking unless they override.
            if (!this.autoplay) {
                this.keys[e.code] = true;
            }
            
            // Start or Restart game on ENTER
            if (e.code === 'Enter') {
                if (this.state === 'start') {
                    this.startGame();
                } else if (this.state === 'gameover' || this.state === 'victory') {
                    this.resetGame();
                    this.startGame();
                }
            }

            // Pause toggle with ESC or KeyP
            if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.state === 'playing') {
                    this.state = 'paused';
                    this.pauseScreen.classList.add('active');
                } else if (this.state === 'paused') {
                    this.state = 'playing';
                    this.pauseScreen.classList.remove('active');
                }
            }

            // Audio mute toggle with KeyM
            if (e.code === 'KeyM') {
                this.toggleAudio();
            }

            // Autoplay toggle with KeyT
            if (e.code === 'KeyT') {
                this.toggleDemo();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.autoplay) {
                this.keys[e.code] = false;
            }
        });
    }

    setupAudioButton() {
        this.audioToggle.addEventListener('click', () => {
            this.toggleAudio();
        });
    }

    setupDemoButton() {
        if (this.demoToggle) {
            this.demoToggle.addEventListener('click', () => {
                this.toggleDemo();
            });
        }
    }

    toggleAudio() {
        const isMuted = sound.toggleMute();
        this.audioToggle.textContent = `🔊 MUSIC: ${isMuted ? 'OFF' : 'ON'}`;
    }

    toggleDemo() {
        this.autoplay = !this.autoplay;
        if (this.demoToggle) {
            this.demoToggle.textContent = `🤖 AUTOPLAY: ${this.autoplay ? 'ON' : 'OFF'}`;
            this.demoToggle.classList.toggle('active', this.autoplay);
        }
        // Reset keys state when toggling
        this.keys = {};
        if (this.state === 'start') {
            this.startGame();
        }
    }

    startGame() {
        this.state = 'playing';
        this.startScreen.classList.remove('active');
        this.gameOverScreen.classList.remove('active');
        this.victoryScreen.classList.remove('active');
        this.pauseScreen.classList.remove('active');
        sound.startBGM();
    }

    resetGame() {
        this.player = new Player(40, 100);
        this.tilemap.loadLevel();
        this.spawnEnemies();
        this.items = [];
        this.debrisList = [];
        this.fireballs = [];
        this.floatingCoins = [];
        this.cameraX = 0;
        this.timeLeft = 400;
        this.timerTicks = 0;
    }

    update() {
        if (this.state !== 'playing') return;

        // If autoplay is active, run the AI controller
        if (this.autoplay) {
            this.player.runAutoplayAI(this);
        }

        // 1. Update Game Timer
        this.timerTicks++;
        if (this.timerTicks >= 60) {
            this.timerTicks = 0;
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.player.die(this);
            }
        }

        // 2. Update Tilemap Bounces
        this.tilemap.update();

        // 3. Update Player Controls & Kinematics
        this.player.handleControls(this.keys);
        this.player.update(this.tilemap);

        // Check if player died sequence ends
        if (this.player.dead && this.player.deathTimer <= 0) {
            this.state = 'gameover';
            this.gameOverScreen.classList.add('active');
            sound.stopBGM();
            return;
        }

        // 4. Update Camera Scroll
        const targetCamX = this.player.x - this.canvas.width / 3;
        if (targetCamX > this.cameraX) {
            this.cameraX = targetCamX;
            const maxCamX = this.tilemap.width - this.canvas.width;
            if (this.cameraX > maxCamX) this.cameraX = maxCamX;
        }
        this.tilemap.cameraX = this.cameraX;

        // 5. Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(this.tilemap);
            
            if (enemy.x < this.cameraX - 100) {
                this.enemies.splice(i, 1);
                continue;
            }

            if (!enemy.active) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Player vs Enemy Collisions
            if (!enemy.dead && !this.player.dead && Physics.checkAABB(this.player, enemy)) {
                if (this.player.vy > 0 && (this.player.y + this.player.height - this.player.vy) <= enemy.y + 4) {
                    enemy.dead = true;
                    enemy.deathTimer = 30;
                    enemy.vx = 0;
                    this.player.vy = -4.5;
                    this.player.score += 100;
                    sound.playSFX('stomp');
                } else {
                    this.player.damage(this);
                }
            }
        }

        // 6. Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(this.tilemap);

            if (!item.active) {
                this.items.splice(i, 1);
                continue;
            }

            if (Physics.checkAABB(this.player, item)) {
                item.active = false;
                this.player.powerUp();
                this.player.score += 1000;
            }
        }

        // 7. Update Fireballs
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update(this.tilemap);

            if (!fb.active) {
                this.fireballs.splice(i, 1);
                continue;
            }

            for (let enemy of this.enemies) {
                if (!enemy.dead && Physics.checkAABB(fb, enemy)) {
                    enemy.dead = true;
                    enemy.deathTimer = 30;
                    enemy.vy = -3.0;
                    fb.active = false;
                    this.player.score += 100;
                    sound.playSFX('stomp');
                    break;
                }
            }
        }

        // 8. Update Floating Coins and Particle Debris
        this.floatingCoins.forEach(coin => coin.update());
        this.floatingCoins = this.floatingCoins.filter(c => c.active);

        this.debrisList.forEach(deb => deb.update());
        this.debrisList = this.debrisList.filter(d => d.active);

        // 9. Flagpole and Level complete checks
        const checkTileX = Math.floor((this.player.x + this.player.width/2) / 16);
        const checkTileY = Math.floor((this.player.y + this.player.height/2) / 16);
        const currentTile = this.tilemap.getTileAt(checkTileX, checkTileY);
        
        if (currentTile === this.tilemap.TILE_FLAGPOLE) {
            this.state = 'victory';
            this.victoryScreen.classList.add('active');
            sound.stopBGM();
            sound.playSFX('powerup');
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw level tilemap
        this.tilemap.draw(this.ctx, this.cameraX);

        // 2. Draw debris & coins
        this.debrisList.forEach(deb => deb.draw(this.ctx, this.cameraX));
        this.floatingCoins.forEach(coin => coin.draw(this.ctx, this.cameraX));

        // 3. Draw items
        this.items.forEach(item => item.draw(this.ctx, this.cameraX));

        // 4. Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx, this.cameraX));

        // 5. Draw fireballs
        this.fireballs.forEach(fb => fb.draw(this.ctx, this.cameraX));

        // 6. Draw player
        this.player.draw(this.ctx, this.cameraX);

        // 7. Draw HUD
        this.drawHUD();

        // 8. Draw Autoplay Indicator
        if (this.autoplay) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.fillRect(8, 240, 130, 20);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = "7px 'Press Start 2P'";
            this.ctx.fillText("🤖 AUTOPLAY ACTIVE", 14, 252);
        }
    }

    drawHUD() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "8px 'Press Start 2P'";

        this.ctx.fillText("MARIO", 16, 16);
        this.ctx.fillText(String(this.player.score).padStart(6, '0'), 16, 26);

        this.ctx.fillText("🪙x" + String(this.player.coins).padStart(2, '0'), 120, 26);

        this.ctx.fillText("WORLD", 240, 16);
        this.ctx.fillText("1-1", 250, 26);

        this.ctx.fillText("TIME", 380, 16);
        this.ctx.fillText(String(Math.max(0, this.timeLeft)).padStart(3, '0'), 385, 26);
    }
}

// Instantiate and start loop
let game;
window.addEventListener('load', () => {
    game = new Game();

    function loop() {
        game.update();
        game.draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
});
