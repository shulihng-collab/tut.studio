// Tilemap and Level rendering system for Retro Platformer

class Tilemap {
    constructor(tileSize = 16) {
        this.tileSize = tileSize;
        this.cameraX = 0;
        this.cols = 0;
        this.rows = 15; // 270px height / 16px tile size = ~16.8 rows. Let's use 17 rows.
        this.height = 270;
        this.grid = [];
        this.blockBounces = []; // Track blocks that are currently bouncing when hit
        
        // Define tile constants
        this.TILE_EMPTY = 0;
        this.TILE_GROUND = 1;
        this.TILE_QUESTION = 2;
        this.TILE_BRICK = 3;
        this.TILE_SOLID = 4;
        this.TILE_PIPE_TL = 5;
        this.TILE_PIPE_TR = 6;
        this.TILE_PIPE_L = 7;
        this.TILE_PIPE_R = 8;
        this.TILE_FLAGPOLE = 9;
        this.TILE_FLAG = 10;
        this.TILE_CASTLE_BRICK = 11;
        this.TILE_CASTLE_DOOR = 12;
        this.TILE_USED_BLOCK = 13;
        
        this.loadLevel();
    }

    loadLevel() {
        // Level design mapping. 
        // We will represent the map as an array of rows where each character represents a tile type.
        // . = Sky
        // G = Ground block (1)
        // Q = Question block (2)
        // B = Breakable Brick block (3)
        // S = Solid block (4)
        // [ = Pipe top-left (5)
        // ] = Pipe top-right (6)
        // ( = Pipe left body (7)
        // ) = Pipe right body (8)
        // P = Flagpole (9)
        // f = Flag (10)
        // C = Castle Brick (11)
        // D = Castle Door (12)
        // U = Used block (13)

        const levelLayout = [
            "............................................................................................................................................................................",
            "............................................................................................................................................................................",
            "............................................................................................................................................................................",
            "............................................................................................................................................................................",
            "............................................................................................................................................................................",
            ".......................................................Q.B.Q.B.Q............................................................................................................",
            "............................................................................................................................................................................",
            "........................Q..B.Q.B..........................................................SS...SS.................................................f......................",
            ".........................................................................................SSS...SSS................................................P......................",
            "......................................[].........................[].....................SSSS...SSSS................................C.C.C.........P......................",
            ".............Q........................().........................()....................SSSSS...SSSSS..............................CDCDC........P......................",
            "......................................().........................()...................SSSSSS...SSSSSS.............................CDCDC........P......................",
            "......................................()..[].....................()...................SSSSSSS...SSSSSSS............................CDCDC........P......................",
            "....................B.B...............()..().....................()...................SSSSSSSS...SSSSSSSS...........................C.D.C........P......................",
            "...................B.Q.B..............()..().....................()...................SSSSSSSSS...SSSSSSSSS.........................................................",
            "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
            "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
        ];

        this.rows = levelLayout.length;
        this.cols = levelLayout[0].length;
        this.width = this.cols * this.tileSize;

        // Parse into a grid of integers
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const char = levelLayout[r][c];
                switch (char) {
                    case 'G': this.grid[r][c] = this.TILE_GROUND; break;
                    case 'Q': this.grid[r][c] = this.TILE_QUESTION; break;
                    case 'B': this.grid[r][c] = this.TILE_BRICK; break;
                    case 'S': this.grid[r][c] = this.TILE_SOLID; break;
                    case '[': this.grid[r][c] = this.TILE_PIPE_TL; break;
                    case ']': this.grid[r][c] = this.TILE_PIPE_TR; break;
                    case '(': this.grid[r][c] = this.TILE_PIPE_L; break;
                    case ')': this.grid[r][c] = this.TILE_PIPE_R; break;
                    case 'P': this.grid[r][c] = this.TILE_FLAGPOLE; break;
                    case 'f': this.grid[r][c] = this.TILE_FLAG; break;
                    case 'C': this.grid[r][c] = this.TILE_CASTLE_BRICK; break;
                    case 'D': this.grid[r][c] = this.TILE_CASTLE_DOOR; break;
                    case 'U': this.grid[r][c] = this.TILE_USED_BLOCK; break;
                    default: this.grid[r][c] = this.TILE_EMPTY;
                }
            }
        }
    }

    isSolid(tx, ty) {
        if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) {
            // Screen boundaries behavior: bottom is pit (not solid), others solid/boundary
            if (ty >= this.rows) return false; // Bottom pit
            return true; // Screen top and sides
        }
        const val = this.grid[ty][tx];
        // Empty space, flagpole, flags, castle doors are not solid
        return val !== this.TILE_EMPTY && 
               val !== this.TILE_FLAGPOLE && 
               val !== this.TILE_FLAG &&
               val !== this.TILE_CASTLE_DOOR;
    }

    getTileAt(tx, ty) {
        if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return this.TILE_EMPTY;
        return this.grid[ty][tx];
    }

    setTileAt(tx, ty, val) {
        if (tx >= 0 && tx < this.cols && ty >= 0 && ty < this.rows) {
            this.grid[ty][tx] = val;
        }
    }

    // Trigger a block bounce when player hits it from underneath
    bounceBlock(tx, ty, player) {
        const type = this.getTileAt(tx, ty);
        if (type === this.TILE_QUESTION || type === this.TILE_BRICK) {
            // Check if already bouncing
            if (this.blockBounces.some(b => b.tx === tx && b.ty === ty)) return null;

            let spawnItem = null;
            if (type === this.TILE_QUESTION) {
                this.setTileAt(tx, ty, this.TILE_USED_BLOCK);
                // 30% chance for a powerup (mushroom), 70% for a coin
                spawnItem = Math.random() < 0.4 ? 'mushroom' : 'coin';
                sound.playSFX(spawnItem === 'coin' ? 'coin' : 'powerup');
            } else if (type === this.TILE_BRICK) {
                if (player.powerLevel > 0) {
                    // Big player breaks the block
                    this.setTileAt(tx, ty, this.TILE_EMPTY);
                    sound.playSFX('brick_break');
                    return { type: 'break', tx, ty };
                } else {
                    sound.playSFX('block_hit');
                }
            }

            // Record bounce animation state
            const bounce = {
                tx: tx,
                ty: ty,
                offsetY: 0,
                timer: 0,
                duration: 10, // frames
                spawnItem: spawnItem
            };
            this.blockBounces.push(bounce);
            return { type: 'bounce', tx, ty, spawnItem };
        }
        return null;
    }

    update() {
        // Update block bounces animation
        for (let i = this.blockBounces.length - 1; i >= 0; i--) {
            const b = this.blockBounces[i];
            b.timer++;
            
            // Simple sin/parabolic wave for visual bounce offset
            const progress = b.timer / b.duration;
            b.offsetY = -Math.sin(progress * Math.PI) * 6; // up to 6px offset

            if (b.timer >= b.duration) {
                this.blockBounces.splice(i, 1);
            }
        }
    }

    draw(ctx, cameraX) {
        this.cameraX = cameraX;
        const startCol = Math.floor(cameraX / this.tileSize);
        const endCol = startCol + Math.ceil(ctx.canvas.width / this.tileSize) + 1;

        // Draw background sky (light baby blue)
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw decorative mountains/clouds
        this.drawDecorations(ctx, cameraX);

        for (let r = 0; r < this.rows; r++) {
            for (let c = startCol; c < Math.min(this.cols, endCol); c++) {
                const type = this.grid[r][c];
                if (type === this.TILE_EMPTY) continue;

                let drawX = c * this.tileSize - cameraX;
                let drawY = r * this.tileSize;

                // Adjust drawing position if block is bouncing
                const bounce = this.blockBounces.find(b => b.tx === c && b.ty === r);
                if (bounce) {
                    drawY += bounce.offsetY;
                }

                this.drawTile(ctx, type, drawX, drawY);
            }
        }
    }

    drawDecorations(ctx, cameraX) {
        // Slow scrolling simple background clouds (parallax)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let i = 0; i < this.cols; i += 12) {
            // Draw a cloud
            const cx = i * this.tileSize - cameraX * 0.4;
            ctx.beginPath();
            ctx.arc(cx, 40, 15, 0, Math.PI * 2);
            ctx.arc(cx + 15, 35, 20, 0, Math.PI * 2);
            ctx.arc(cx + 30, 40, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw simple hills at the bottom
        ctx.fillStyle = '#00a800';
        for (let i = 0; i < this.cols; i += 20) {
            const hx = i * this.tileSize - cameraX * 0.7;
            ctx.beginPath();
            ctx.arc(hx, this.height - 32, 35, Math.PI, 0);
            ctx.fill();
        }
    }

    drawTile(ctx, type, x, y) {
        const size = this.tileSize;
        
        switch (type) {
            case this.TILE_GROUND:
                // Ground tile: Orange-brown dirt with dark cracks and highlighting
                ctx.fillStyle = '#d88038';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#000';
                // Bottom border & shadow
                ctx.fillRect(x, y + size - 1, size, 1);
                ctx.fillRect(x + size - 1, y, 1, size);
                // Cracks
                ctx.fillStyle = '#fc9c5c';
                ctx.fillRect(x, y, size - 1, 1);
                ctx.fillRect(x, y, 1, size - 1);
                ctx.fillStyle = '#8c4000';
                ctx.fillRect(x + 4, y + 4, 3, 3);
                ctx.fillRect(x + 10, y + 10, 3, 3);
                break;

            case this.TILE_QUESTION:
                // Animated question block (yellow-orange, white text/symbol)
                const pulse = Math.floor(Date.now() / 250) % 2;
                ctx.fillStyle = pulse === 0 ? '#fc9c5c' : '#fcb85c';
                ctx.fillRect(x, y, size, size);
                
                // Borders
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
                
                // Question symbol '?'
                ctx.fillStyle = '#9c4a00';
                ctx.font = "8px 'Press Start 2P'";
                ctx.fillText("?", x + 5, y + 11);
                
                // Little corner dots
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 1, y + 1, 1, 1);
                ctx.fillRect(x + size - 2, y + 1, 1, 1);
                ctx.fillRect(x + 1, y + size - 2, 1, 1);
                ctx.fillRect(x + size - 2, y + size - 2, 1, 1);
                break;

            case this.TILE_BRICK:
                // Breakable Brick: Reddish brown with horizontal lines
                ctx.fillStyle = '#b84418';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#f8b8a0'; // Highlight
                ctx.fillRect(x, y, size, 1);
                ctx.fillRect(x, y, 1, size);
                ctx.fillStyle = '#000'; // Mortar lines
                ctx.fillRect(x, y + 7, size, 1);
                ctx.fillRect(x, y + size - 1, size, 1);
                ctx.fillRect(x + 7, y, 1, 7);
                ctx.fillRect(x + 15, y, 1, 7);
                ctx.fillRect(x + 3, y + 8, 1, 7);
                ctx.fillRect(x + 11, y + 8, 1, 7);
                break;

            case this.TILE_SOLID:
                // Metal Solid block: Grey with rivet details
                ctx.fillStyle = '#808080';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(x, y, size, 1);
                ctx.fillRect(x, y, 1, size);
                ctx.fillStyle = '#404040';
                ctx.fillRect(x, y + size - 1, size, 1);
                ctx.fillRect(x + size - 1, y, 1, size);
                // Rivets
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 2, y + 2, 2, 2);
                ctx.fillRect(x + size - 4, y + 2, 2, 2);
                ctx.fillRect(x + 2, y + size - 4, 2, 2);
                ctx.fillRect(x + size - 4, y + size - 4, 2, 2);
                break;

            case this.TILE_USED_BLOCK:
                // Used block: Dull brown empty block
                ctx.fillStyle = '#8c5c38';
                ctx.fillRect(x, y, size, size);
                ctx.strokeStyle = '#4c2c10';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
                // Little corner dots
                ctx.fillStyle = '#4c2c10';
                ctx.fillRect(x + 2, y + 2, 1, 1);
                ctx.fillRect(x + size - 3, y + 2, 1, 1);
                ctx.fillRect(x + 2, y + size - 3, 1, 1);
                ctx.fillRect(x + size - 3, y + size - 3, 1, 1);
                break;

            case this.TILE_PIPE_TL: // Top-left pipe lip
                ctx.fillStyle = '#00a800';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#8cfc00'; // highlight
                ctx.fillRect(x + 2, y, 2, size);
                ctx.fillStyle = '#005800'; // shadow
                ctx.fillRect(x + size - 3, y, 3, size);
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, 1, size);
                ctx.fillRect(x, y, size, 1);
                ctx.fillRect(x, y + size - 1, size, 1);
                break;

            case this.TILE_PIPE_TR: // Top-right pipe lip
                ctx.fillStyle = '#00a800';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#005800'; // shadow
                ctx.fillRect(x, y, 2, size);
                ctx.fillRect(x + size - 3, y, 3, size);
                ctx.fillStyle = '#000';
                ctx.fillRect(x + size - 1, y, 1, size);
                ctx.fillRect(x, y, size, 1);
                ctx.fillRect(x, y + size - 1, size, 1);
                break;

            case this.TILE_PIPE_L: // Pipe left body
                ctx.fillStyle = '#00a800';
                ctx.fillRect(x + 2, y, size - 2, size);
                ctx.fillStyle = '#8cfc00'; // highlight
                ctx.fillRect(x + 4, y, 2, size);
                ctx.fillStyle = '#005800'; // shadow
                ctx.fillRect(x + size - 3, y, 3, size);
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 2, y, 1, size);
                break;

            case this.TILE_PIPE_R: // Pipe right body
                ctx.fillStyle = '#00a800';
                ctx.fillRect(x, y, size - 2, size);
                ctx.fillStyle = '#005800'; // shadow
                ctx.fillRect(x, y, 2, size);
                ctx.fillRect(x + size - 5, y, 3, size);
                ctx.fillStyle = '#000';
                ctx.fillRect(x + size - 3, y, 1, size);
                break;

            case this.TILE_FLAGPOLE:
                // Green flagpole
                ctx.fillStyle = '#8cfc00';
                ctx.fillRect(x + 7, y, 2, size);
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 6, y, 1, size);
                ctx.fillRect(x + 9, y, 1, size);
                break;

            case this.TILE_FLAG:
                // Green flag ball / flag banner
                ctx.fillStyle = '#fcb800'; // Gold ball on top
                ctx.beginPath();
                ctx.arc(x + 8, y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.stroke();
                break;

            case this.TILE_CASTLE_BRICK:
                // Castle Brick: Dark green/grey
                ctx.fillStyle = '#506070';
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = '#000';
                ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
                break;

            case this.TILE_CASTLE_DOOR:
                // Black open door
                ctx.fillStyle = '#000';
                ctx.fillRect(x, y, size, size);
                break;
        }
    }
}
