// Physics and Collision Engine for retro platformer

const Physics = {
    GRAVITY: 0.35,
    MAX_FALL_SPEED: 8.0,
    FRICTION: 0.85,
    ACCEL: 0.2,
    RUN_ACCEL: 0.35,
    MAX_SPEED: 2.0,
    MAX_RUN_SPEED: 3.5,
    JUMP_FORCE: -6.0,

    // Check collision between two axis-aligned bounding boxes (AABB)
    checkAABB(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    },

    // Get tiles that overlap with an entity's bounding box
    getOverlappingTiles(x, y, width, height, tilemap) {
        const tiles = [];
        const startX = Math.floor(x / tilemap.tileSize);
        const endX = Math.floor((x + width) / tilemap.tileSize);
        const startY = Math.floor(y / tilemap.tileSize);
        const endY = Math.floor((y + height) / tilemap.tileSize);

        for (let tx = startX; tx <= endX; tx++) {
            for (let ty = startY; ty <= endY; ty++) {
                if (tilemap.isSolid(tx, ty)) {
                    tiles.push({
                        tx: tx,
                        ty: ty,
                        x: tx * tilemap.tileSize,
                        y: ty * tilemap.tileSize,
                        width: tilemap.tileSize,
                        height: tilemap.tileSize,
                        type: tilemap.getTileAt(tx, ty)
                    });
                }
            }
        }
        return tiles;
    },

    // Update entity position and check collisions against the tilemap
    updateEntityPhysics(entity, tilemap) {
        // Apply gravity if not on ground
        if (!entity.grounded) {
            entity.vy += Physics.GRAVITY;
            if (entity.vy > Physics.MAX_FALL_SPEED) {
                entity.vy = Physics.MAX_FALL_SPEED;
            }
        }

        entity.grounded = false;

        // --- Handle Horizontal Movement & Collisions ---
        entity.x += entity.vx;
        
        let tiles = this.getOverlappingTiles(entity.x, entity.y, entity.width, entity.height, tilemap);
        for (let tile of tiles) {
            if (entity.vx > 0) { // Moving right
                entity.x = tile.x - entity.width;
                entity.vx = 0;
                if (entity.onCollideHorizontal) entity.onCollideHorizontal('right', tile);
            } else if (entity.vx < 0) { // Moving left
                entity.x = tile.x + tile.width;
                entity.vx = 0;
                if (entity.onCollideHorizontal) entity.onCollideHorizontal('left', tile);
            }
        }

        // --- Handle Vertical Movement & Collisions ---
        entity.y += entity.vy;
        
        tiles = this.getOverlappingTiles(entity.x, entity.y, entity.width, entity.height, tilemap);
        for (let tile of tiles) {
            if (entity.vy > 0) { // Falling down (landing)
                entity.y = tile.y - entity.height;
                entity.vy = 0;
                entity.grounded = true;
                if (entity.onCollideVertical) entity.onCollideVertical('bottom', tile);
            } else if (entity.vy < 0) { // Jumping up (hitting ceiling)
                entity.y = tile.y + tile.height;
                entity.vy = 0;
                if (entity.onCollideVertical) entity.onCollideVertical('top', tile);
            }
        }
        
        // Prevent moving off the left side of screen/camera boundary
        if (entity.type === 'player') {
            const camLeft = tilemap.cameraX || 0;
            if (entity.x < camLeft) {
                entity.x = camLeft;
                entity.vx = 0;
            }
        }
    }
};
