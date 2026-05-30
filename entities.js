// Entity hierarchy, movement logic, and procedural rendering for Retro Platformer

class Entity {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
        this.type = type;
        this.grounded = false;
        this.active = true;
        this.dead = false;
        this.deathTimer = 0;
    }

    update(tilemap) {
        if (!this.active) return;
        Physics.updateEntityPhysics(this, tilemap);
    }

    draw(ctx, cameraX) {
        // Implemented by subclasses
    }
}

// ==========================================
// PLAYER CLASS WITH RICH SPRITE ANIMATIONS
// ==========================================
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 12, 14, 'player');
        this.powerLevel = 0; // 0 = Small, 1 = Big, 2 = Fire
        this.facing = 'right'; // 'left' or 'right'
        
        // State variables
        this.invulnTimer = 0;
        this.jumpHoldTimer = 0;
        this.shootCooldown = 0;
        
        // Anim state variables
        this.animTimer = 0;
        this.animFrame = 0;
        
        // Adjust sizes
        this.normalWidth = 12;
        this.smallHeight = 14;
        this.bigHeight = 26;

        this.score = 0;
        this.coins = 0;
        this.lives = 3;
    }

    powerUp() {
        if (this.powerLevel < 2) {
            this.powerLevel++;
            if (this.powerLevel === 1) {
                this.y -= (this.bigHeight - this.smallHeight);
                this.height = this.bigHeight;
            }
            sound.playSFX('powerup');
        }
    }

    damage(game) {
        if (this.invulnTimer > 0 || this.dead) return;

        if (this.powerLevel > 0) {
            this.powerLevel = 0;
            this.height = this.smallHeight;
            this.invulnTimer = 120;
            sound.playSFX('powerdown');
        } else {
            this.die(game);
        }
    }

    die(game) {
        this.dead = true;
        this.vy = -6;
        this.vx = 0;
        this.deathTimer = 180;
        sound.playSFX('death');
    }

    onCollideVertical(dir, tile) {
        if (dir === 'top') {
            const hitResult = game.tilemap.bounceBlock(tile.tx, tile.ty, this);
            if (hitResult) {
                if (hitResult.type === 'bounce' && hitResult.spawnItem) {
                    game.spawnItem(tile.tx * 16, (tile.ty - 1) * 16, hitResult.spawnItem);
                } else if (hitResult.type === 'break') {
                    game.spawnDebris(tile.tx * 16 + 8, tile.ty * 16 + 8);
                }
            }
        }
    }

    onCollideHorizontal(dir, tile) {}

    // Simple Autoplay AI
    runAutoplayAI(game) {
        if (this.dead) return;

        // Auto move right
        game.keys['ArrowRight'] = true;
        game.keys['ArrowLeft'] = false;

        // Look ahead for obstacles (solid tiles or enemies)
        const checkDistance = 45;
        const playerCenterY = this.y + this.height / 2;
        const lookX = this.x + this.width + checkDistance;
        
        const tileX = Math.floor(lookX / 16);
        const tileY1 = Math.floor((this.y + this.height - 4) / 16);
        const tileY2 = Math.floor(this.y / 16);
        
        let needsToJump = false;

        // Jump over solid blocks/pipes
        if (game.tilemap.isSolid(tileX, tileY1) || game.tilemap.isSolid(tileX, tileY2) || game.tilemap.isSolid(tileX + 1, tileY1)) {
            needsToJump = true;
        }

        // Jump over pits
        const floorTileX = Math.floor((this.x + this.width + 10) / 16);
        const floorTileY = Math.floor((this.y + this.height + 8) / 16);
        if (!game.tilemap.isSolid(floorTileX, floorTileY) && !game.tilemap.isSolid(floorTileX, floorTileY - 1)) {
            needsToJump = true;
        }

        // Jump over enemies
        for (let enemy of game.enemies) {
            if (!enemy.dead && enemy.x > this.x && enemy.x < this.x + 60 && Math.abs(enemy.y - this.y) < 30) {
                needsToJump = true;
                break;
            }
        }

        // Apply jump key
        if (needsToJump) {
            if (this.grounded) {
                game.keys['Space'] = true;
            }
        } else {
            // Release jump key if in midair to vary height or land
            if (!this.grounded && this.vy > -2) {
                game.keys['Space'] = false;
            } else {
                game.keys['Space'] = false;
            }
        }

        // Auto shoot fireballs if powered up
        if (this.powerLevel === 2 && Math.random() < 0.05) {
            game.keys['KeyJ'] = true;
        } else {
            game.keys['KeyJ'] = false;
        }
    }

    handleControls(keys) {
        if (this.dead) return;

        const isRunning = keys['ShiftLeft'] || keys['KeyJ'];
        const accel = isRunning ? Physics.RUN_ACCEL : Physics.ACCEL;
        const maxSpeed = isRunning ? Physics.MAX_RUN_SPEED : Physics.MAX_SPEED;

        // Horizontal Movement
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx += accel;
            this.facing = 'right';
            if (this.vx > maxSpeed) this.vx = maxSpeed;
        } else if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx -= accel;
            this.facing = 'left';
            if (this.vx < -maxSpeed) this.vx = -maxSpeed;
        } else {
            this.vx *= Physics.FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Jump Controls
        const isJumpKeyPressed = keys['Space'] || keys['KeyK'];
        if (isJumpKeyPressed) {
            if (this.grounded) {
                this.vy = Physics.JUMP_FORCE;
                this.grounded = false;
                this.jumpHoldTimer = 15;
                sound.playSFX('jump');
            } else if (this.jumpHoldTimer > 0) {
                this.vy -= 0.18;
                this.jumpHoldTimer--;
            }
        } else {
            this.jumpHoldTimer = 0;
        }

        // Shoot fireballs
        if ((keys['ShiftLeft'] || keys['KeyJ']) && this.powerLevel === 2 && this.shootCooldown === 0) {
            this.shootCooldown = 20;
            const fbX = this.facing === 'right' ? this.x + this.width + 2 : this.x - 8;
            const fbDir = this.facing === 'right' ? 1 : -1;
            game.spawnFireball(fbX, this.y + this.height/2, fbDir);
            sound.playSFX('shoot');
        }

        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    update(tilemap) {
        if (this.dead) {
            this.vy += 0.25;
            this.y += this.vy;
            this.deathTimer--;
            return;
        }

        super.update(tilemap);

        // Update animation frames based on running speed
        if (this.grounded) {
            if (Math.abs(this.vx) > 0.1) {
                this.animTimer += Math.abs(this.vx) * 0.8;
                this.animFrame = Math.floor(this.animTimer) % 3; // 3 running frames
            } else {
                this.animFrame = 0; // idle frame
            }
        } else {
            this.animFrame = 4; // jump frame
        }

        if (this.invulnTimer > 0) {
            this.invulnTimer--;
        }

        if (this.y > tilemap.height) {
            this.die(game);
        }
    }

    draw(ctx, cameraX) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            return;
        }

        const drawX = this.x - cameraX;
        const drawY = this.y;

        ctx.save();
        if (this.facing === 'left') {
            ctx.scale(-1, 1);
            ctx.translate(-2 * drawX - this.width, 0);
        }

        let primaryColor = '#ff3b30';
        let overallsColor = '#0058b8';
        if (this.powerLevel === 2) {
            primaryColor = '#ffffff';
            overallsColor = '#ff3b30';
        }

        // Draw Player with frame-based animations
        if (this.powerLevel === 0) {
            // --- SMALL PLAYER DRAWING ---
            
            // Adjust body offsets based on walking frame
            let legOffset = 0;
            let armOffset = 0;
            if (this.animFrame === 1) {
                legOffset = 1;
                armOffset = -1;
            } else if (this.animFrame === 2) {
                legOffset = -1;
                armOffset = 1;
            } else if (this.animFrame === 4) { // jumping
                legOffset = 2;
                armOffset = -2;
            }

            // Head/Face
            ctx.fillStyle = '#ffcc99'; // Skin
            ctx.fillRect(drawX + 3, drawY + 1, 7, 6);
            ctx.fillStyle = '#8c5a00'; // Hair/mustache
            ctx.fillRect(drawX + 2, drawY + 3, 2, 4);
            ctx.fillRect(drawX + 6, drawY + 5, 4, 2);
            ctx.fillStyle = '#000'; // Eyes
            ctx.fillRect(drawX + 7, drawY + 2, 1, 2);

            // Cap
            ctx.fillStyle = primaryColor;
            ctx.fillRect(drawX + 3, drawY - 1, 8, 2);
            ctx.fillRect(drawX + 5, drawY + 0, 6, 1);

            // Body & Overalls
            ctx.fillStyle = overallsColor;
            ctx.fillRect(drawX + 2, drawY + 7, 8, 5);
            
            // Shirt/Arms
            ctx.fillStyle = primaryColor;
            ctx.fillRect(drawX + 1, drawY + 7 + armOffset, 2, 3);
            ctx.fillRect(drawX + 9, drawY + 7 - armOffset, 2, 3);

            // Boots
            ctx.fillStyle = '#6c3a00';
            ctx.fillRect(drawX + 2 - legOffset, drawY + 12, 3, 2);
            ctx.fillRect(drawX + 7 + legOffset, drawY + 12, 3, 2);
        } else {
            // --- BIG PLAYER DRAWING ---
            let legOffset = 0;
            let armOffset = 0;
            if (this.animFrame === 1) {
                legOffset = 2;
                armOffset = -2;
            } else if (this.animFrame === 2) {
                legOffset = -1;
                armOffset = 2;
            } else if (this.animFrame === 4) { // jumping
                legOffset = 3;
                armOffset = -3;
            }

            // Head/Face
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(drawX + 3, drawY + 4, 7, 7);
            ctx.fillStyle = '#8c5a00'; // Hair/mustache
            ctx.fillRect(drawX + 2, drawY + 6, 2, 5);
            ctx.fillRect(drawX + 6, drawY + 9, 4, 2);
            ctx.fillStyle = '#000'; // Eye
            ctx.fillRect(drawX + 7, drawY + 5, 1, 2);

            // Cap
            ctx.fillStyle = primaryColor;
            ctx.fillRect(drawX + 3, drawY, 8, 2);
            ctx.fillRect(drawX + 4, drawY + 2, 8, 2);

            // Overalls
            ctx.fillStyle = overallsColor;
            ctx.fillRect(drawX + 3, drawY + 11, 7, 11);
            
            // Sleeves
            ctx.fillStyle = primaryColor;
            ctx.fillRect(drawX + 1, drawY + 11 + armOffset, 2, 8);
            ctx.fillRect(drawX + 10, drawY + 11 - armOffset, 2, 8);
            
            // Yellow buttons
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(drawX + 4, drawY + 14, 1, 1);
            ctx.fillRect(drawX + 8, drawY + 14, 1, 1);

            // Boots
            ctx.fillStyle = '#6c3a00';
            ctx.fillRect(drawX + 2 - legOffset, drawY + 22, 4, 4);
            ctx.fillRect(drawX + 7 + legOffset, drawY + 22, 4, 4);
        }

        ctx.restore();
    }
}

// ==========================================
// ENEMY (GOOMBA-LIKE MUSHROOM)
// ==========================================
class Goomba extends Entity {
    constructor(x, y) {
        super(x, y, 14, 14, 'goomba');
        this.vx = -0.6;
    }

    onCollideHorizontal(dir, tile) {
        this.vx = -this.vx;
    }

    update(tilemap) {
        if (this.dead) {
            this.deathTimer--;
            if (this.deathTimer <= 0) this.active = false;
            return;
        }
        super.update(tilemap);

        if (this.y > tilemap.height) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        const drawY = this.y;

        if (this.dead) {
            ctx.fillStyle = '#a84400';
            ctx.fillRect(drawX, drawY + 8, 14, 6);
            ctx.fillStyle = '#fcb8fc';
            ctx.fillRect(drawX + 2, drawY + 10, 10, 4);
            return;
        }

        ctx.fillStyle = '#a84400';
        ctx.fillRect(drawX + 2, drawY, 10, 2);
        ctx.fillRect(drawX + 1, drawY + 2, 12, 6);
        
        ctx.fillStyle = '#fcbc98';
        ctx.fillRect(drawX + 3, drawY + 8, 8, 4);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 4, drawY + 5, 2, 3);
        ctx.fillRect(drawX + 8, drawY + 5, 2, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(drawX + 4, drawY + 5, 1, 1);
        ctx.fillRect(drawX + 8, drawY + 5, 1, 1);

        const walkCycle = Math.floor(Date.now() / 150) % 2;
        ctx.fillStyle = '#000';
        if (walkCycle === 0) {
            ctx.fillRect(drawX + 1, drawY + 12, 4, 2);
            ctx.fillRect(drawX + 8, drawY + 12, 5, 2);
        } else {
            ctx.fillRect(drawX + 2, drawY + 12, 5, 2);
            ctx.fillRect(drawX + 9, drawY + 12, 4, 2);
        }
    }
}

// ==========================================
// POWERUP ITEM (MUSHROOM)
// ==========================================
class Mushroom extends Entity {
    constructor(x, y) {
        super(x, y, 14, 14, 'mushroom');
        this.vx = 1.0;
    }

    onCollideHorizontal(dir, tile) {
        this.vx = -this.vx;
    }

    update(tilemap) {
        super.update(tilemap);
        if (this.y > tilemap.height) this.active = false;
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        const drawY = this.y;

        ctx.fillStyle = '#fc3c00';
        ctx.fillRect(drawX + 2, drawY, 10, 2);
        ctx.fillRect(drawX + 1, drawY + 2, 12, 6);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX + 3, drawY + 3, 2, 2);
        ctx.fillRect(drawX + 9, drawY + 3, 2, 2);
        ctx.fillRect(drawX + 6, drawY + 5, 2, 2);

        ctx.fillStyle = '#fce4a0';
        ctx.fillRect(drawX + 4, drawY + 8, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 5, drawY + 9, 1, 2);
        ctx.fillRect(drawX + 8, drawY + 9, 1, 2);
    }
}

// ==========================================
// FLOATING/SPAWNED COIN
// ==========================================
class FloatingCoin {
    constructor(x, y) {
        this.x = x + 3;
        this.y = y;
        this.vy = -4.5;
        this.active = true;
        this.timer = 0;
        this.width = 10;
        this.height = 16;
    }

    update() {
        this.vy += 0.35;
        this.y += this.vy;
        this.timer++;
        if (this.timer > 30) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        const drawY = this.y;
        
        const spin = Math.floor(Date.now() / 60) % 4;
        let w = this.width;
        let off = 0;
        if (spin === 1 || spin === 3) { w = 6; off = 2; }
        if (spin === 2) { w = 2; off = 4; }

        ctx.fillStyle = '#fcbc00';
        ctx.fillRect(drawX + off, drawY, w, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX + off + Math.floor(w/3), drawY + 2, Math.max(1, Math.floor(w/4)), 10);
    }
}

// ==========================================
// FIREBALL PROJECTILE
// ==========================================
class Fireball extends Entity {
    constructor(x, y, dir) {
        super(x, y, 8, 8, 'fireball');
        this.vx = dir * 3.5;
        this.vy = 1;
    }

    onCollideHorizontal(dir, tile) {
        this.active = false;
    }

    onCollideVertical(dir, tile) {
        if (dir === 'bottom') {
            this.vy = -3.0;
        } else {
            this.active = false;
        }
    }

    update(tilemap) {
        super.update(tilemap);
        if (this.y > tilemap.height) this.active = false;
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        const drawY = this.y;

        const frame = Math.floor(Date.now() / 50) % 2;
        ctx.fillStyle = frame === 0 ? '#ff3b30' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(drawX + 4, drawY + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = frame === 0 ? '#ffcc00' : '#ff3b30';
        ctx.fillRect(drawX + 3, drawY + 3, 2, 2);
    }
}

// ==========================================
// BRICK PARTICLE DEBRIS
// ==========================================
class Debris {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.gravity = 0.3;
    }

    update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        if (this.y > 270) this.active = false;
    }

    draw(ctx, cameraX) {
        ctx.fillStyle = '#b84418';
        ctx.fillRect(this.x - cameraX - 3, this.y - 3, 6, 6);
    }
}
