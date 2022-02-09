import Vector2 from "./src/Vector2.js";

// ============================================================================================================================================= //
//   GENERAL VARIABLES AND FUNCTIONS
// ============================================================================================================================================= //

const game = document.getElementById("game");
let paused = true;

let world = [];
let entities = [];
let projectiles = [];
let lines = [];

const HALFPI = Math.PI / 2;

let screenHalf = new Vector2(100, 100);
let movement = [0, 0, 0, 0]; // 0 = up, 1 = down, 2 = left, 3 = right
let mouseScreenPos = new Vector2(0, 0);
let mouseWorldPos = new Vector2(0, 0);

let player = null;
let firingProjectiles = false;
let firingLasers = false;

function round(num, to = 1000){
    return (Math.round(num * to) / to);
}

function findAngleFromUnitVector(unitVector){
    return HALFPI + (unitVector.X < 0 ? Math.acos(unitVector.Y) : -Math.acos(unitVector.Y));
}

function findAngle(pos1, pos2){
    return findAngleFromUnitVector(Vector2.subtract(pos1, pos2).normalize());
}

function findUnitVectorFromAngle(angle){
    return new Vector2(-Math.sin(angle - HALFPI), Math.cos(angle - HALFPI));
}

// ============================================================================================================================================= //
//   Pathfinding
// ============================================================================================================================================= //

const pX = new Vector2(1, 0);
const nX = new Vector2(-1, 0);
const pY = new Vector2(0, 1);
const nY = new Vector2(0, -1);

/**
 * A class which contains the path as an array (if found).
 *
 * @param {Vector2} startPos The path's start point
 * @param {Vector2} finishPos The path's end point
 * @returns {{ Entity: Entity; HitPos: Vector2; Side: boolean}} Entity = Hit entity (Nullable), HitPos = Exact location, Side = Side of entity hit (true = Horizontal side, false = Vertical side, null = Nothing hit)
 */
class Pathfind {
    constructor(startPos, finishPos){
        
        startPos = new Vector2(Math.floor(startPos.X), Math.floor(startPos.Y));
        finishPos = new Vector2(Math.floor(finishPos.X), Math.floor(finishPos.Y));
        // Keeps track of what paths are going where
        this._pathMap = [];
        this._path = [];
        this.record(startPos, startPos)

        let searchingPositions = [startPos];
        let newSearchingPositions = [];

        let found = null; // What position has reached the finish point
        let running = true; // Remains true if there are spaces to search
        let searching = null; // Temporary variable to search/record paths
        let timeout = 100;

        const search = (searching, origin) => {
            if(this.record(searching, origin)) newSearchingPositions.push(searching);
        }

        while(running){
            timeout--;
            searchingPositions.forEach(origin => {
                // Look +X
                search(Vector2.add(origin, pX), origin);
                // Look -X
                search(Vector2.add(origin, nX), origin);
                // Look +Y
                search(Vector2.add(origin, pY), origin);
                // Look -Y
                search(Vector2.add(origin, nY), origin);
                
                // Look +X +Y
                search(Vector2.add(Vector2.add(origin, pX), pY), origin);
                // Look +X -Y
                search(Vector2.add(Vector2.add(origin, pX), nY), origin);
                // Look -X +Y
                search(Vector2.add(Vector2.add(origin, nX), pY), origin);
                // Look -X -Y
                search(Vector2.add(Vector2.add(origin, nX), nY), origin);
            });
            if(newSearchingPositions.length == 0 || timeout == 0){
                running = false;
            }
            else{
                newSearchingPositions.forEach(newPosition => {
                    if(newPosition.X == finishPos.X && newPosition.Y == finishPos.Y){
                        found = newPosition;
                        running = false;
                    }
                });
                if(!found){
                    // Creates a copy of the newSearchingPositions array for the next run
                    searchingPositions = [...newSearchingPositions]; 
                    newSearchingPositions.length = 0;
                }
            }
        }
        if(found != null){
            this._found = true;      
            let track = finishPos;
            searching = finishPos;
            do{      
                this._path.push(searching);    
                searching = track;
                track = this.read(searching); 
                
            } while (!(track.X == searching.X && track.Y == searching.Y))      
        }
        else{ 
            this._found = false;
        }
    }
    record(position, origin){
        if(this._pathMap[position.X] == null) this._pathMap[position.X] = []; // If no Y array exists at column X, add it
        // The final 2 readWorld function calls only make a difference if a diagonal movement is being recorded.
        if(this._pathMap[position.X][position.Y] == null && !readWorld(position.X, position.Y) && !readWorld(position.X, origin.Y) && !readWorld(origin.X, position.Y)){
            this._pathMap[position.X][position.Y] = origin;
            return true;
        }
        return false;     
    }
    read(position){
        return this._pathMap[position.X][position.Y];
    }
    /**
     * Returns if a path has been found between the start and finish
     * @returns {boolean} 
     */
    get found(){
        return this._found;
    }
    /**
     * Returns the path from the finish position to the start position
     * @returns {[Vector2]]} 
     */
    get path(){
        return this._path;
    }
}

// ============================================================================================================================================= //
//   Raycasting
// ============================================================================================================================================= //

/**
 * Returns an Object containing the Block coordinates and the exact hit position.
 * If the Block coordinates are null, no block was found.
 *
 * @param {Vector2} start The origin of the raycast
 * @param {Vector2} rayVector The ray's direction
 * @returns {{ Coordinates: Vector2; HitPos: Vector2; Side: boolean}} Coordinates = World coordinates (Nullable), HitPos = Exact location, Side = Side of entity hit (true = Horizontal side, false = Vertical side, null = Nothing hit)
 */
function findBlockFromRay(start, rayVector, test = false){
/*
    Divide both X and Y by X and Y
    {50, 25}
    yRatio = 25 / 50 = 0.5s
    xRatio = 50 / 25 = 2

    Iterate through X:
    Find which Y is at X
    Y = startY + (yRatio * X)
    Check +X and -X

    Iterate through Y
    Find which X is at Y
    X = startX + (xRatio * Y)
    Check +Y and -Y
    */

    // Line equation
    let xRatio = rayVector.X / rayVector.Y;
    let yRatio = rayVector.Y / rayVector.X;
    // Which direction the for loop travels
    let xDirection = rayVector.X >= 0 ? 1: -1;
    let yDirection = rayVector.Y >= 0 ? 1: -1;
 
    // Gets the offset of the X and Y coordinates of the start position away from the grid
    let roundingX = start.X - Math.floor(start.X);
    let roundingY = start.Y - Math.floor(start.Y);
    // Aligning the start positions to the grid. Starting from 0 or 1 depending on which way the ray is facing.
    // If the coordinates are already on the grid, no rounding needs to take place.
    // Otherwise, take away the offset away from the start position to get the starting coordinates aligned to the grid.
    let startX = xDirection + (roundingX == 0 ? 0 : (xDirection == 1 ? 0 : 1) - roundingX);
    let startY = yDirection + (roundingY == 0 ? 0 : (yDirection == 1 ? 0 : 1) - roundingY);

    // {Coordinates, HitPos}
    let finish = Vector2.add(start, rayVector);
    let closestX = {Coordinates: null, HitPos: finish, Side: null};
    let closestY = {Coordinates: null, HitPos: finish, Side: null};

    // Since it checks from the start point, any further results after the first don't matter.
    for(let x = startX; Math.abs(x) <= Math.abs(rayVector.X); x += xDirection){
        let xOffset = start.X + x;
        let yOffset = start.Y + (yRatio * x);
        let readX = Math.floor(xOffset);
        let readY = Math.floor(yOffset);
        if(readWorld(readX, readY)){    
            closestX = {Coordinates: new Vector2(readX, readY), HitPos: new Vector2(xOffset, yOffset), Side: false};
            break;
        }
        else if(readWorld(readX - 1, readY)){
            closestX = {Coordinates: new Vector2(readX - 1, readY), HitPos: new Vector2(xOffset, yOffset), Side: false};
            break;
        }
    }

    for(let y = startY; Math.abs(y) <= Math.abs(rayVector.Y); y += yDirection){
        let xOffset = start.X + (xRatio * y);
        let yOffset = start.Y + y;
        let readX = Math.floor(xOffset);
        let readY = Math.floor(yOffset);
        if(readWorld(readX, readY)){
            closestY = {Coordinates: new Vector2(readX, readY), HitPos: new Vector2(xOffset, yOffset), Side: true};
            break;
        }
        else if(readWorld(readX, readY - 1)){
            closestY = {Coordinates: new Vector2(readX, readY - 1), HitPos: new Vector2(xOffset, yOffset), Side: true};
            break;
        }
    }

    let xDist = Vector2.subtract(closestX.HitPos, start).magnitude;
    let yDist = Vector2.subtract(closestY.HitPos, start).magnitude;

    // Checks the magnitude of the two found points and returns the one closest to the start
    if(xDist < yDist)
        return closestX;
    else
        return closestY;
}

/**
 * Returns an Object containing the Block coordinates and the exact hit position.
 * If the Block coordinates are null, no block was found.
 *
 * @param {Vector2} start The origin of the raycast
 * @param {Vector2} finish The raycast's end point
 * @returns {{ Coordinates: Vector2; HitPos: Vector2; Side: boolean}} Coordinates = World coordinates (Nullable), HitPos = Exact location, Side = Side of entity hit (true = Horizontal side, false = Vertical side, null = Nothing hit)
 */
function findBlockBetween(start, finish){
    return findBlockFromRay(start, Vector2.subtract(start, finish));
}

/**
 * Returns a Vector2 representing a ray between the start and finish positions.
 *
 * @param {Vector2} start The origin of the ray
 * @param {Vector2} finish Where the way should end
 * @returns {Vector2} Ray's direction
 */
function getRayDirection(start, finish){
    return Vector2.subtract(start, finish)
}

/**
 * Returns an Object containing an entity and the exact hit position.
 * If the Entity is null, no entity was found.
 *
 * @param {Vector2} start The origin of the raycast
 * @param {Vector2} finish The raycast's end point
 * @param {String} faction What kind of entity the raycast should attempt to find (E.g. "Hostile" or "Friendly") 
 * @returns {{ Entity: Entity; HitPos: Vector2; Side: boolean}} Entity = Hit entity (Nullable), HitPos = Exact location, Side = Side of entity hit (true = Horizontal side, false = Vertical side, null = Nothing hit)
 */
function findEntityFromRay(start, finish, faction){
    let rayVector = Vector2.subtract(start, finish);
    let yRatio = rayVector.Y / rayVector.X;
    let hitPoints = [];

    // Calculates the bounds of the ray so it doesn't find anything outside of ray's path.
    let upperBound = new Vector2(Math.max(start.X, finish.X), Math.max(start.Y, finish.Y));
    let lowerBound = new Vector2(Math.min(start.X, finish.X), Math.min(start.Y, finish.Y));

    entities.forEach(entity => {
        if((find == null || entity.faction == faction) && !entity.immune){
            let topLeft = Vector2.subtract(entity.hitboxHalf, entity.position);
            let bottomRight = Vector2.add(entity.position, entity.hitboxHalf);
            let coordinate = 0;
            // Check Top and Bottom bounds
            // y = mx + c
            // y - c = mx
            // (y - c) / m = x
            // fX = sX + ((fY - sY) / yRatio)

            if(topLeft.Y < upperBound.Y && topLeft.Y > lowerBound.Y){
                coordinate = start.X + ((topLeft.Y - start.Y) / yRatio);
                if(coordinate >= topLeft.X && coordinate <= bottomRight.X){
                    hitPoints.push({Entity: entity, HitPos: new Vector2(coordinate, topLeft.Y), Side: true});
                }
            }

            if(bottomRight.Y < upperBound.Y && bottomRight.Y > lowerBound.Y){
                coordinate = start.X + ((bottomRight.Y - start.Y) / yRatio);
                if(coordinate >= topLeft.X && coordinate <= bottomRight.X){
                    hitPoints.push({Entity: entity, HitPos: new Vector2(coordinate, bottomRight.Y), Side: true});
                }
            }

            // Check Left and Right bounds
            // fX = sX + ((fY - sY) / yRatio)
            // fX - sX = (fY - sY) / yRatio
            // (fX - sX) * yRatio = fY - sY
            // fY = sY + ((fx - sX) * yRatio)
            if(topLeft.X < upperBound.X && topLeft.X > lowerBound.X){
                coordinate = start.Y + ((topLeft.X - start.X) * yRatio);
                if(coordinate >= topLeft.Y && coordinate <= bottomRight.Y){
                    hitPoints.push({Entity: entity, HitPos: new Vector2(topLeft.X, coordinate), Side: false});
                }
            }

            if(bottomRight.X < upperBound.X && bottomRight.X > lowerBound.X){
                coordinate = start.Y + ((bottomRight.X - start.X) * yRatio);
                if(coordinate >= topLeft.Y && coordinate <= bottomRight.Y){
                    hitPoints.push({Entity: entity, HitPos: new Vector2(bottomRight.X, coordinate), Side: false});
                }
            }
            
        }
    });

    // {Entity, Vector2}
    let closest = {Entity: null, HitPos: finish, Side: null};
    // Nothing was hit, 
    if(hitPoints.length == 0) {
        return closest;
    }

    let closestMagnitude = rayVector.magnitude;
    hitPoints.forEach(element => {
        let checkingMagnitude = Vector2.subtract(start, element.HitPos).magnitude;
        if(checkingMagnitude < closestMagnitude){
            closestMagnitude = checkingMagnitude;
            closest = element;
        }
    });

    return closest;
}

function recalculateMousePos(){
    let middleOffset = Vector2.subtract(screenHalf, new Vector2(mouseScreenPos.X, mouseScreenPos.Y));
    mouseWorldPos = Vector2.add(new Vector2(
        (middleOffset.X / zoomMultiplier), 
        (middleOffset.Y / zoomMultiplier)
    ), player.position);
}

// ============================================================================================================================================= //
//   WORLD
// ============================================================================================================================================= //

function placeWorld(x, y, id){
    if(world[x] == null)
        world[x] = [];
    world[x][y] = id;
}

function placeHorizontal(y, x1, x2, id){
    for(let i = Math.min(x1, x2); i <= Math.max(x1, x2); i++){
        placeWorld(i, y, id);
    }  
}

function placeVertical(x, y1, y2, id){
    for(let i = Math.min(y1, y2); i <= Math.max(y1, y2); i++){
        placeWorld(x, i, id);
    }
}

function placeBox(x1, y1, x2, y2, id){
    for(let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++){
        for(let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++){
            placeWorld(x, y, id);
        }
    }
}

function readWorld(x, y){
    if(world[x] == null)
        world[x] = [];
    return world[x][y];
}

function start(){
    paused = false;

    clearInterval(game.interval);

    // Clears the arrays
    entities.length = 0;
    projectiles.length = 0;
    lines.length = 0;

    // Outer walls
    placeHorizontal(10, 10, 30, 1);
    placeHorizontal(30, 10, 30, 1);
    placeVertical(10, 10, 30, 1);
    placeVertical(30, 10, 30, 1);

    // Building 1
    placeHorizontal(12, 12, 22, 1);
    placeHorizontal(18, 12, 22, 1);
    placeVertical(12, 12, 18, 1);
    placeVertical(22, 12, 18, 1);

    placeWorld(17, 18, null);
    placeWorld(14, 14, 1);

    // Building 2
    placeBox(15, 23, 28, 28, 1);
    placeBox(16, 24, 27, 27, null);
    placeWorld(21, 23, null);

    // Building 3
    placeBox(24, 13, 28, 20, 1);
    placeBox(26, 13, 26, 20, null);

    // Area2
    placeBox(30, 10, 50, 30, 1);
    placeBox(31, 11, 49, 29, null);
    placeWorld(30, 20, null);

    placeHorizontal(22, 37, 47, 1);

    entities.push(new Enemy(12, 28));
    entities.push(new Enemy(26.8, 25));
    entities.push(new LargeEnemy(21.2, 13.6));
    entities.push(new LargeEnemy(47.2, 14.1));
    entities.push(new ClusterEnemy(47, 27));
    entities.push(new MovingEnemy(37, 12));

    player = new Player(20.2, 21.99);
    entities.push(player);

    placeWorld(10, 10, 1);

    game.interval = setInterval(update, 20);
}

// ============================================================================================================================================= //
//   DRAWING
// ============================================================================================================================================= //

let zoomMultiplier = 30;
let canvas = game.getContext("2d");
const HEALTHBAR_HEIGHT = 5;

function draw(){

    // Clear canvas
    canvas.clearRect(0, 0, game.width, game.height);

    // The walls start anti-aliasing strangely (gaps in between individual wall blocks) without rounding.
    let originX = Math.round(screenHalf.X - (player.position.X * zoomMultiplier));
    let originY = Math.round(screenHalf.Y - (player.position.Y * zoomMultiplier));

    // World
    for(let x = 0; x < world.length; x++){
        if(world[x] != null){
            for(let y = 0; y < world.length; y++){
                if(world[x][y] == 1){
                    canvas = game.getContext("2d");
                    canvas.fillStyle = "#DDDDDD";
                    canvas.fillRect(originX + x * zoomMultiplier, originY + y * zoomMultiplier, zoomMultiplier, zoomMultiplier);
                }
            }
        }
    }

    // Lines {x1: 0, x2: 0, y1: 0, y2: 0}

    lines.forEach(line => {
        canvas.lineWidth = line.thickness;
        canvas.strokeStyle = line.colour;
        canvas.beginPath();
        canvas.moveTo(originX + line.pos1.X * zoomMultiplier, originY + line.pos1.Y * zoomMultiplier);
        canvas.lineTo(originX + line.pos2.X * zoomMultiplier, originY + line.pos2.Y * zoomMultiplier);
        canvas.stroke();
    });

    // Projectiles
    for(const i in projectiles){
        let projectile = projectiles[i];
        let position = projectile.position;
        //if(projectile.oldPositions.length > 1){
            // Used to draw bullets bouncing off walls, not yet implemented
        //}
        // Draw last oldPos to currentPos
        canvas.lineWidth = projectile.hitbox.Y * zoomMultiplier;
        canvas.strokeStyle = projectile.colour;
        let start = projectile.oldPositions[projectile.oldPositions.length - 1];
        canvas.beginPath();
        canvas.moveTo(originX + start.X * zoomMultiplier, originY + start.Y * zoomMultiplier);
        canvas.lineTo(originX + position.X * zoomMultiplier, originY + position.Y * zoomMultiplier);
        canvas.stroke();
    }

    // Entities
    for(const i in entities){
        let entity = entities[i];

        let x = originX + (entity.position.X - entity.hitboxHalf.X) * zoomMultiplier;
        let y = originY + (entity.position.Y - entity.hitboxHalf.Y) * zoomMultiplier;
        let xSize = entity.hitbox.X * zoomMultiplier;
        let ySize = entity.hitbox.Y * zoomMultiplier

        // Body
        canvas.fillStyle = entity.colour;
        canvas.fillRect(x, y, xSize, ySize);

        if(entity instanceof LivingEntity){
            // Healthbar
            if(entity._showHealthbar){
                let healthbarOffset = y - 10
                let healthPercentage = (1 / entity.maxHealth) * entity.health
                canvas.fillStyle = "#000000";
                canvas.fillRect(x - 1, healthbarOffset - 1, xSize + 2, HEALTHBAR_HEIGHT + 2);

                canvas.fillStyle = "#FF0000";
                canvas.fillRect(x, healthbarOffset, xSize, HEALTHBAR_HEIGHT);
                canvas.fillStyle = "#00FF00";
                canvas.fillRect(x, healthbarOffset, xSize * healthPercentage, HEALTHBAR_HEIGHT);
            }

            // Turrets
            canvas.translate(originX + entity.position.X * zoomMultiplier, originY + entity.position.Y * zoomMultiplier);
            canvas.rotate(entity.angle);
            canvas.fillStyle = "#777777";
            if(entity instanceof ClusterEnemy){
                canvas.fillRect(-0.1 * zoomMultiplier, -0.25 * zoomMultiplier, 1 * zoomMultiplier, 0.5 * zoomMultiplier );
            }
            else{
                canvas.fillRect(-0.1 * zoomMultiplier, -0.1 * zoomMultiplier, 1 * zoomMultiplier, 0.2 * zoomMultiplier );
            }
        }
        // Reset ctx
        canvas.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    // Instructions
    canvas.font = "20px Arial";
    canvas.fillStyle = "#FFFFFF";
    canvas.fillText("Movement - WASD", 10, 20); 
    canvas.fillText("Fire projectile - Left Click", 10, 40); 
    canvas.fillText("Fire laser - R", 10, 60); 
    canvas.fillText("Pause - P", 10, 80); 
    canvas.fillText("Reset - Space", 10, 100); 
    canvas.fillText("Pathfind test - J", 10, 120); 
}

// ============================================================================================================================================= //
//   Lines / Lasers
// ============================================================================================================================================= //

class Line{
    constructor(pos1, pos2){
        this._pos1 = pos1;
        this._pos2 = pos2;
        this._width = 2;
        this._colour = "yellow";
        this._lifeTime = 25;
        this._removed = false;
    }
    get pos1(){
        return this._pos1;
    }
    get pos2(){
        return this._pos2;
    }
    get colour(){
        return this._colour;
    }
    get thickness(){
        return this._width;
    }
    get lifeTime(){
        return this._lifeTime;
    }
    get removed(){
        return this._removed;
    }
    update(){
        this._lifeTime--;
        if(this._lifeTime <= 0)
            this._removed = true;
    }
}

class Laser extends Line {
    constructor(pos1, pos2){
        super(pos1, pos2);
        this._width = 4;
        this._lifeTime = 20;
        this._colour = "rgba(255, 255, 0, 1)";
        this._opacity = 1;
    }
    update(){
        this._opacity -= 0.05;
        this._colour = "rgba(255, 255, 0, " + this._opacity + ")";
        this._width -= 0.2;
        super.update();
    }
}

// ============================================================================================================================================= //
//   Entities
// ============================================================================================================================================= //

class Entity {
    constructor(posX, posY){
        this.setHitbox(0.1, 0.1);
        this._position = new Vector2(posX, posY);
        this._angle = 0;   
        this._removed = false;
        this._colour = "rgba(255, 255, 255, 1)";
        this._cooldown = 0; // Used for character firing reloading or projectile timeout      
    }
    update(){
        // Projectile's update methods can return the entity the projectile hit as well as null/true/false.
        if(this._removed) return;
        if(this._cooldown > 0) this._cooldown--;
    }
    setHitbox(x, y){
        this._hitbox = new Vector2(x, y);
        this._hitboxHalf = new Vector2(x / 2, y / 2);
    }
    get position(){
        return this._position;
    }
    get hitboxHalf(){
        return this._hitboxHalf;
    }
    get hitbox(){
        return this._hitbox;
    }
    get angle(){
        return this._angle;
    }
    get colour(){ // Adds the opacity to the rgba colour string depending on if the entity is being hit.
        return this._colour;
    }
    get removed(){
        return this._removed;
    }
    set position(pos){
        this._position = pos;
    }
}

// Basic marker for testing purposes
class Marker extends Entity{
    constructor(posX, posY, colour = "blue"){
        super(posX, posY);
        this.setHitbox(0.4, 0.4);
        this._colour = colour;
    }
    update(){
        // Do nothing
    }
}

class MovingEntity extends Entity {
    constructor(posX, posY){
        super(posX, posY);
        this._momentum = new Vector2(0.0, 0.0);
    }
    update(){
        // The update method returns a value based off of what was hit and from what direction.

        // If null, nothing was hit.
        // If true, hit the bottom or top of the wall.
        // If false, hit the left or right of the wall.

        super.update();

        // Position + Momentum * lastUpdate.Milliseconds;
        // Update entity position
        let newPosition = Vector2.add(this._position, this._momentum);
        let oldEntityHitboxTopLeftCorner = new Vector2(this._position.X - this._hitboxHalf.X, this._position.Y - this._hitboxHalf.Y);
        let newEntityHitboxTopLeftCorner = new Vector2(newPosition.X - this._hitboxHalf.X, newPosition.Y - this._hitboxHalf.Y);
        
        //*/
        let overlapTile = new Vector2(0, 0);
        let overlapCount = 0;
        let edgeCase = false;

        let x = Math.floor(newEntityHitboxTopLeftCorner.X);
        let y = Math.floor(newEntityHitboxTopLeftCorner.Y);

        // Use do loops instead of for loops
        // To ensure for loops run at least once to ensure collision detection always happens,
        //      I have to use <= in the condition. This means I can inadvertently check the 
        //      world space NEXT TO the block, therefore colliding with something it can't touch
        // The x and y variables cannot change within the loops themselves, or else they'll 
        //      meet the conditions required to stop the loop too early. Therefore the change
        //      has to happen after the condition, but before the next loop.

        // If one total collision happens, one of two things happen:
        // 1: If the entity is moving ONLY vertically OR horizonally, ONLY x OR y will be reset to 0, basic collision.
        // 2: The collision will be resolved in the edge case block further down.

        // hitFace is null if no wall is hit, true if it hits vertically, false if it hits horizontally.
        let hitFace = null;
        do { // Y
            do { // X
                if (readWorld(x, y) == 1)
                {
                    // overlapTile might need to be used for positioning the entity correctly during an edge case.
                    overlapTile = new Vector2(x, y);
                    // overlapCount keeps track of how many obstacles have been hit, used for the edge case code.
                    overlapCount++;
                    
                    // If moving directly vertically.
                    if (x < oldEntityHitboxTopLeftCorner.X + this._hitbox.X && x + 1 > oldEntityHitboxTopLeftCorner.X && this._momentum.Y != 0)
                    {
                        hitFace = true;
                        if (this._momentum.Y > 0)
                            newPosition.Y = y - this._hitboxHalf.Y;
                        else
                            newPosition.Y = y + this._hitboxHalf.Y + 1;
                    }
                    // If moving directly horizontally
                    else if (y < oldEntityHitboxTopLeftCorner.Y + this._hitbox.Y && y + 1 > oldEntityHitboxTopLeftCorner.Y && this._momentum.X != 0)
                    {
                        hitFace = false;
                        if (this._momentum.X > 0)
                            newPosition.X = x - this._hitboxHalf.X;
                        else
                            newPosition.X = x + this._hitboxHalf.X + 1;
                    }
                    else // If moving diagonally over an obstacle, further checks have to be done
                        edgeCase = true;
                }
                // The bottom and right edge of the entity will align with the position of the wall if pressed
                //      against it, so a small number is subtracted to make sure the next wall isnt checked if
                //      pressed up against it. Otherwise, the non-moving entity will "hit" the wall its next to
                //      and run the code above (and in certain circumstances, the edge case code below).
            } while (x++ < Math.floor(newEntityHitboxTopLeftCorner.X + this._hitbox.X - 0.0001));
            x = Math.floor(newEntityHitboxTopLeftCorner.X); // Reset X for the next loop
        } while (y++ < Math.floor(newEntityHitboxTopLeftCorner.Y + this._hitbox.Y - 0.0001));

        // Diagonal moving checks. If MORE than one total collisions happen, the edge case will be resolved since 
        //      the edge case only occurs when approaching the corner of one obstacle diagonally.
        if (edgeCase && overlapCount == 1)
        {
            let travelDistance = new Vector2(
                newEntityHitboxTopLeftCorner.X - oldEntityHitboxTopLeftCorner.X,
                newEntityHitboxTopLeftCorner.Y - oldEntityHitboxTopLeftCorner.Y
            );
            if (Math.abs(travelDistance.X) > Math.abs(travelDistance.Y))
            {
                // More horizontal movement
                hitFace = false;
                if (this._momentum.X > 0)
                    newPosition.X = overlapTile.X - this._hitboxHalf.X;
                else
                    newPosition.X = overlapTile.X + this._hitboxHalf.X + 1;
            }
            else
            {
                // More vertical movement
                hitFace = true;
                if (this._momentum.Y > 0)
                    newPosition.Y = overlapTile.Y - this._hitboxHalf.Y;
                else
                    newPosition.Y = overlapTile.Y + this._hitboxHalf.Y + 1;
            }
        }
        this._position = new Vector2(round(newPosition.X), round(newPosition.Y));

        // Returns true if entity hit a wall
        return hitFace;
    }
}

// Entity has HP, healthbars, and factions.
class LivingEntity extends MovingEntity {
    constructor(posX, posY){
        super(posX, posY);
        this.setHealth(0);
        this._isHit = 0;
        this._showHealthbar = 0;
        this._faction = null;
    }
    update(){
        if(this._isHit > 0) this._isHit--;
        if(this._showHealthbar > 0) this._showHealthbar--;
        super.update();
    }
    setHealth(hp){
        this._health = hp;
        this._maxHealth = hp;
    }
    damage(value = 1){
        this._isHit = 4;
        this._health -= value;
        if(this._health <= 0)
            this._removed = true;
        else
            this._showHealthbar = 75;
    }
    get health(){
        return this._health;
    }
    get maxHealth(){
        return this._maxHealth;
    }
    get healthbar(){
        return this._showHealthbar > 0;
    }
    get colour(){
        return this._isHit > 0 ? "rgba(200, 200, 200, 0.1)" : this._colour;
    }
    get faction(){
        return this._faction;
    }
    get immune(){
        return this._isHit > 0;
    }
}

// The character the user controls
class Player extends LivingEntity {
    constructor(posX, posY){
        super(posX, posY);
        this.setHitbox(0.75, 0.75);
        this._momentum = new Vector2(0, 0);
        this.setHealth(10);
        this._colour = "rgba(0, 200, 0, 1)";
        this._laserCooldown = 0;
        this._faction = "Friendly"
    }
    update(){
        this._momentum = new Vector2((movement[2] - movement[3]) / 5, (movement[1] - movement[0]) / 5);
        this._angle = findAngle(this._position, mouseWorldPos);
        if(this._laserCooldown > 0) this._laserCooldown--;
        super.update();

        if(firingProjectiles && this._cooldown == 0){
            this._cooldown = 5;
            projectiles.push(new Projectile(this._position, getRayDirection(player.position, mouseWorldPos), "Hostile", 0.5));
        }
        if(firingLasers && this._laserCooldown == 0){
            this._laserCooldown = 50;
            let rayVector = getRayDirection(player.position, mouseWorldPos).normalize().multiply(100);
            let result = findBlockFromRay(player.position, rayVector);
            let closest = findEntityFromRay(player.position, result.HitPos, "Hostile");
            if(closest.Entity != null){
                lines.push(new Laser(player.position, closest.HitPos));
                closest.Entity.damage(3);
            }
            else{
                lines.push(new Laser(player.position, result.HitPos));
            }
        }
    }

}

class Enemy extends LivingEntity {
    constructor(posX, posY){
        super(posX, posY);
        this.setHealth(5);
        this.setHitbox(0.75, 0.75);
        this._colour = "rgba(255, 0, 0, 1)";
        this._cooldown = 50;
        this._faction = "Hostile";
    }
    changeAngle(){
        this._angle = findAngle(this._position, player.position);
    }
    canSeePlayer(){
        // findBlockFromRay returns the block the ray hits, if it hits nothing it means it has a direct line of sight to the player
        return findBlockBetween(this._position, player.position).Coordinates == null;
    }
    getDirectionToPlayer(){
        return Vector2.subtract(this._position, player.position).normalize();
    }
    update(){
        this.changeAngle();
        if(this.canSeePlayer()){
            if(this._cooldown <= 0){
                let rayDirection = this.getDirectionToPlayer();
                projectiles.push(new Projectile(this._position, rayDirection, "Friendly", 1.2));
                this._cooldown = 25;
            }
        }
        else{
            // Move
        }
        super.update();
    }
}

class LargeEnemy extends Enemy{
    constructor(posX, posY){
        super(posX, posY);
        this.setHealth(10);
        this._colour = "rgba(150, 0, 0, 1)";
        this._cooldown = 50;
        this.setHitbox(1, 1);
    }
    update(){
        this.changeAngle();
        if(this.canSeePlayer()){
            if(this._cooldown <= 0){
                let rayDirection = this.getDirectionToPlayer();
                projectiles.push(new BouncingProjectile(this._position, rayDirection, "Friendly", 2));
                this._cooldown = 50;
            }
        }
        else{
            // MOVE
        }
        super.update();
    }
}

class ClusterEnemy extends Enemy{
    constructor(posX, posY){
        super(posX, posY);
        this.setHealth(5);
        this._colour = "rgba(200, 100, 0, 1)";
        this._cooldown = 30;
    }
    update(){
        this.changeAngle();
        if(this.canSeePlayer()){
            if(this._cooldown <= 0){
                let rayDirection = this.getDirectionToPlayer();
                projectiles.push(new ClusterProjectile(this._position, rayDirection, "Friendly", 1));
                this._cooldown = 50;
            }
        }
        else{
            // MOVE
        }
        super.update();
    }
}

const PATHFIND_OFFSET = new Vector2(0.5, 0.5);
class MovingEnemy extends Enemy {
    constructor(posX, posY){
        super(posX, posY);
        this._colour = "purple";
        this._path = null;
        this._pathIndex = 0;
        this._pathCooldown = 25;
    }
    update(){
        this.changeAngle();
        this._pathCooldown--;
        if(this.canSeePlayer()){
            this._momentum = Vector2.zero;
            if(this._cooldown <= 0){
                let rayDirection = this.getDirectionToPlayer();
                projectiles.push(new Projectile(this._position, rayDirection, "Friendly", 1.2));
                this._cooldown = 25;
            }
        }
        else{
            if(this._pathCooldown <= 0 || this._path == null){ // Refresh path;
                let pathfind = new Pathfind(this._position, player.position);
                if(pathfind.found){
                    this._path = pathfind.path;
                    this._pathIndex = pathfind.path.length - 1;
                    this._pathCooldown = 25;
                }
            }
            else{
                let direction = null;
                let foundNextSpot = false;
    
                do{
                    let newSpot = Vector2.add(this._path[this._pathIndex], PATHFIND_OFFSET)
                    direction = Vector2.subtract(this._position, newSpot);
                    if(direction.magnitude < 0.1){
                        this._pathIndex--;
                    }
                    else{
                        foundNextSpot = true;
                    }
                } while (!foundNextSpot)
    
                this._momentum = direction.normalize().multiply(0.1);
            }
        }
        super.update();
    }
}

// ============================================================================================================================================= //
//   PROJECTILES
// ============================================================================================================================================= //

// Projectile uses Raycast

class Projectile extends Entity {
    constructor(startPoint, rayVector, desiredTarget, speed){
        super(startPoint.X, startPoint.Y);
        this._colour = "yellow";
        this.setHitbox(0.2, 0.2);
        this._speed = speed;

        this._direction = rayVector.normalize();
        this._desiredTarget = desiredTarget;
        this._cooldown = 125;
        this.getAngleFromDirection();

        this._oldPositions = [startPoint];
    }
    getAngleFromDirection(){
        this._angle = findAngleFromUnitVector(this._direction);
    }
    update(){
        this._oldPositions = [this._position];
        super.update();
        if(this._cooldown <= 0) this._removed = true;
        // Starting from current position, cast a ray facing this._direction. Find block, then find entity
        let rayVector = this._direction.multiply(this._speed);
        let blockResult = findBlockFromRay(this._position, rayVector, true);
        //{Coordinates, HitPos, Side}
        let entityResult = findEntityFromRay(this._position, blockResult.HitPos, this._desiredTarget);
        this._position = entityResult.HitPos;
        
        if(entityResult.Entity != null){
            entityResult.Entity.damage(this._damage);
            this._removed = true;
            return entityResult.Side;
        }
        else if(blockResult.Coordinates != null){
            this._removed = true;
            return blockResult.Side;
        } 
    }
    get position(){
        return this._position;
    }
    get angle(){
        return this._angle;
    }
    get oldPositions(){
        return this._oldPositions;
    }
}

class BouncingProjectile extends Projectile {
    constructor(shotFrom, rayDirection, desiredTarget, speed){
        super(shotFrom, rayDirection, desiredTarget, speed);
        this._cooldown = 200;
        this._bounceTimes = 5;
        this._damage = 2;
    }
    update(){
        let hit = super.update();   

        if(this._removed && this._bounceTimes > 0 && hit != null){
            this._bounceTimes--;
            this._removed = false;

            if(hit == true) // Bounce vertically
                this._direction.Y = -this._direction.Y;
            else // Bounce horizontally
                this._direction.X = -this._direction.X;
            this.getAngleFromDirection();      
        }
    }
}

class MiniBouncingProjectile extends BouncingProjectile {
    constructor(shotFrom, shotTo, desiredTarget){
        super(shotFrom, shotTo, desiredTarget, 0.4);
        this.setHitbox(0.2, 0.2);
        this._bounceTimes = 3;
        this._damage = 1;
        this._cooldown = 50;
    }
}

const CLUSTER_VARIATION = 0.2;
const CLUSTER_VARIATION_2 = CLUSTER_VARIATION * 2;
class ClusterProjectile extends BouncingProjectile {
    constructor(shotFrom, shotTo, desiredTarget, speed){
        super(shotFrom, shotTo, desiredTarget, speed);
        this.setHitbox(0.3, 0.3);
        this._cooldown = 25;
        this._damage = 2;
        this._bounceTimes = 10;
    }
    createNewCluster(m){
        projectiles.push(new MiniBouncingProjectile(this._position, new Vector2(
            m.X,
            m.Y,
        ), this._desiredTarget)); 
    }
    update(){
        let hit = super.update();
        if (hit == true)
            this._momentum.X = -this._momentum.X;
        else if(hit == false) 
            this._momentum.Y = -this._momentum.Y;

        if (this._removed){
            this.createNewCluster(findUnitVectorFromAngle(this._angle + CLUSTER_VARIATION_2));
            this.createNewCluster(findUnitVectorFromAngle(this._angle + CLUSTER_VARIATION));
            this.createNewCluster(findUnitVectorFromAngle(this._angle));
            this.createNewCluster(findUnitVectorFromAngle(this._angle - CLUSTER_VARIATION));
            this.createNewCluster(findUnitVectorFromAngle(this._angle - CLUSTER_VARIATION_2));
        }
    }
}

// ============================================================================================================================================= //
//   UPDATES
// ============================================================================================================================================= //

// Returns true if the entity/projectile is being removed
function iterate(item){
    item.update();
    return item.removed;
}

function update(e){
    if (paused) return;

    if(movement[0] != 0 || movement[1] != 0 || movement[2] != 0 || movement[3] != 0)
        recalculateMousePos();

    // Going backwards through the list to allow removing from the list mid-loop
    for(let i = entities.length - 1; i >= 0; i--){
        if(iterate(entities[i]))
            entities.splice(i, 1);
    }
    for(let i = projectiles.length - 1; i >= 0; i--){
        if(iterate(projectiles[i]))
            projectiles.splice(i, 1);
    }
    for(let i = lines.length - 1; i >= 0; i--){
        if(iterate(lines[i]))
            lines.splice(i, 1);
    }

    draw();
}

// ============================================================================================================================================= //
//   EVENT LISTENERS
// ============================================================================================================================================= //

let pauseDebounce = false;
document.addEventListener("keydown", (e) => {
    switch(e.key){
        case "d":
            movement[2] = 1;
            break;
        case "a":
            movement[3] = 1;
            break;
        case "s":
            movement[1] = 1;
            break;
        case "w":
            movement[0] = 1;
            break;
        case "p":
            if(!pauseDebounce){
                pauseDebounce = true;
                paused = !paused;
            }
            if(paused){
                canvas.fillStyle = "rgba(0, 0, 0, 0.7)"
                canvas.fillRect(0, 0, game.width, game.height);
            }
            break;
        case "r":
            firingLasers = true;
            break;
        default:
            break;
    }
});

let pathfindingArray = []; // Array of markers
document.addEventListener("keyup", (e) => {
    switch(e.key){
        case "d":
            movement[2] = 0;
            break;
        case "a":
            movement[3] = 0;
            break;
        case "s":
            movement[1] = 0;
            break;
        case "w":
            movement[0] = 0;
            break;
        case " ":
            start();
            break;
        case "p":
            pauseDebounce = false;
            break;
        case "r":
            firingLasers = false;
            break;
        case "j":

            pathfindingArray.forEach(entity => {
                entity._removed = true;
            });
            pathfindingArray.length = 0;

            let pathfindingTest = new Pathfind(player.position, mouseWorldPos);
            if(pathfindingTest.found){
                pathfindingTest.path.map(value => {
                    let marker = new Marker(value.X + 0.5, value.Y + 0.5, "pink");
                    pathfindingArray.push(marker);
                    entities.push(marker);
                });
            }
            break;
        default:
            break;
    }
});

game.addEventListener("mousemove", e => {
    mouseScreenPos = new Vector2(e.layerX, e.layerY);
    recalculateMousePos();
});

game.addEventListener("mousedown", e => {
    firingProjectiles = true;
});

game.addEventListener("mouseup", e => {
    firingProjectiles = false;
});

function resizeWindow(){
    game.height = window.innerHeight;
    game.width = window.innerWidth;
    screenHalf = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
    //console.log("Resized");
}

window.onresize = resizeWindow;

// ============================================================================================================================================= //
//   RUNNING
// ============================================================================================================================================= //

resizeWindow();
start();
draw();