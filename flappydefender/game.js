// Tunable difficulty constants
const GRAVITY = 0.3;                // Lower gravity for slower fall
const LIFT = -8;                    // Smoother lift when clicking
const INITIAL_PIPE_GAP = 250;       // Starting gap between pipes (wide)
const PIPE_GAP_DECREASE_RATE = 0.5; // Slower gap decrease (0.5 pixels per 10 points)
const MIN_PIPE_GAP = 150;           // Wider minimum gap for easier gameplay
const INITIAL_ENEMY_FIRE_RATE = 180;// Less frequent shooting at start (every 180 frames)
const FIRE_RATE_INCREASE_RATE = 1;  // Slower fire rate increase (1 frame per 50 points)
const MIN_FIRE_RATE = 30;           // Fastest fire rate (every 30 frames)
const SURVIVOR_HEIGHT = 20;         // Height of survivors
const SCROLL_SPEED = 2;             // Horizontal scroll speed (pixels per frame)
const PIPE_SPACING = 150;           // Frames between pipe spawns

// Game variables
let player;
let obstacles = [];
let groundSegments = [];
let playerProjectiles = [];
let enemies = [];
let enemyProjectiles = [];
let survivors = [];
let abductors = [];
let score = 0;
let resetButton;

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('game-container');
    player = new Player();
    resetButton = createButton('Restart');
    resetButton.position(width / 2, height / 2 + 100);
    resetButton.mousePressed(resetGame);
    resetButton.hide();
    let initialSegment = new GroundSegment();
    initialSegment.x = 0;
    initialSegment.width = width + 300;
    groundSegments.push(initialSegment);
}

function draw() {
    background(0);
    player.update();
    player.show();

    // Spawn obstacles and ground segments
    if (frameCount % PIPE_SPACING === 0) {
        let segment = new GroundSegment();
        groundSegments.push(segment);
        obstacles.push(new Obstacle(segment.elevation));
    }

    // Update and render ground segments
    for (let i = groundSegments.length - 1; i >= 0; i--) {
        groundSegments[i].update();
        groundSegments[i].show();
        if (groundSegments[i].offscreen()) {
            groundSegments.splice(i, 1);
        }
    }

    // Update and render obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].show();
        if (obstacles[i].offscreen()) {
            obstacles.splice(i, 1);
        }
        if (player.x + player.width - 10 > obstacles[i].x && player.x + 10 < obstacles[i].x + obstacles[i].width) {
            if (player.y + 10 < obstacles[i].top || player.y + player.height - 10 > height - obstacles[i].bottom) {
                gameOver();
            }
        }
    }

    // Player shoots every 20 frames
    if (frameCount % 20 === 0) {
        playerProjectiles.push(new Projectile(player.x + player.width, player.y + player.height / 2));
    }

    // Update and render player projectiles
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        playerProjectiles[i].update();
        playerProjectiles[i].show();
        if (playerProjectiles[i].offscreen()) {
            playerProjectiles.splice(i, 1);
        }
    }

    // Spawn enemies every 150 frames
    if (frameCount % 150 === 0) {
        enemies.push(new Enemy());
    }

    // Update and render enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i]) continue;
        enemies[i].update();
        enemies[i].show();
        enemies[i].shoot();
        if (enemies[i].offscreen()) {
            enemies.splice(i, 1);
            continue;
        }
        for (let j = playerProjectiles.length - 1; j >= 0; j--) {
            if (!playerProjectiles[j] || !enemies[i]) break;
            if (playerProjectiles[j].x > enemies[i].x && 
                playerProjectiles[j].x < enemies[i].x + enemies[i].width &&
                playerProjectiles[j].y > enemies[i].y && 
                playerProjectiles[j].y < enemies[i].y + enemies[i].height) {
                enemies.splice(i, 1);
                playerProjectiles.splice(j, 1);
                score += 10;
                break;
            }
        }
    }

    // Update and render enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        if (enemyProjectiles[i]) {
            enemyProjectiles[i].update();
            enemyProjectiles[i].show();
            if (enemyProjectiles[i].offscreen()) {
                enemyProjectiles.splice(i, 1);
            } else {
                if (player.x < enemyProjectiles[i].x + enemyProjectiles[i].width &&
                    player.x + player.width > enemyProjectiles[i].x &&
                    player.y < enemyProjectiles[i].y + enemyProjectiles[i].height &&
                    player.y + player.height > enemyProjectiles[i].y) {
                    gameOver();
                }
            }
        }
    }

    // Spawn survivors with 75% chance
    if (frameCount % PIPE_SPACING === 0 && random() < 0.75) {
        let segment = groundSegments[groundSegments.length - 1];
        let offset = random(50, 250);
        let survivor = new Survivor(segment.x + offset, height - segment.elevation - SURVIVOR_HEIGHT, segment);
        survivors.push(survivor);
    }

    // Update and show survivors
    survivors.forEach(survivor => {
        survivor.update();
        if (!survivor.abducted) {
            survivor.show();
        }
    });

    // Filter survivors
    survivors = survivors.filter(survivor => {
        if (survivor.offscreen()) {
            return false;
        }
        if (!survivor.abducted && player.x + player.width > survivor.x && player.x < survivor.x + survivor.width &&
            player.y + player.height >= height - survivor.segment.elevation) {
            score += 50;
            return false;
        }
        return true;
    });

    // Spawn abductors every 300 frames with 30% chance
    if (frameCount % 300 === 0) {
        let availableSurvivors = survivors.filter(s => !s.abducted);
        if (availableSurvivors.length > 0 && random() < 0.3) {
            let target = random(availableSurvivors);
            abductors.push(new Abductor(target));
        }
    }

    // Update and render abductors
    for (let i = abductors.length - 1; i >= 0; i--) {
        abductors[i].update();
        abductors[i].show();
        if (abductors[i].offscreen()) {
            abductors.splice(i, 1);
            continue;
        }
        for (let j = playerProjectiles.length - 1; j >= 0; j--) {
            if (playerProjectiles[j].x > abductors[i].x && 
                playerProjectiles[j].x < abductors[i].x + abductors[i].width &&
                playerProjectiles[j].y > abductors[i].y && 
                playerProjectiles[j].y < abductors[i].y + abductors[i].height) {
                if (abductors[i].state === 'abducting') {
                    score += 50;
                    let survivorIndex = survivors.indexOf(abductors[i].target);
                    if (survivorIndex > -1) {
                        survivors.splice(survivorIndex, 1);
                    }
                }
                abductors.splice(i, 1);
                playerProjectiles.splice(j, 1);
                break;
            }
        }
    }

    // Display score
    textSize(24);
    fill(255);
    text("Score: " + score, 10, 30);
}

function mousePressed() {
    player.up();
}

function keyPressed() {
    if (key === ' ') {
        player.up();
    }
}

function gameOver() {
    noLoop();
    textSize(32);
    fill(255, 0, 0);
    text("Game Over", width / 2 - 80, height / 2 - 40);
    resetButton.show();
}

function resetGame() {
    score = 0;
    obstacles = [];
    groundSegments = [];
    playerProjectiles = [];
    enemies = [];
    enemyProjectiles = [];
    survivors = [];
    abductors = [];
    player = new Player();
    resetButton.hide();
    let initialSegment = new GroundSegment();
    initialSegment.x = 0;
    initialSegment.width = width + 300;
    groundSegments.push(initialSegment);
    loop();
}

function getGroundElevation(x) {
    for (let segment of groundSegments) {
        if (x >= segment.x && x <= segment.x + segment.width) {
            return segment.elevation;
        }
    }
    return 50;
}

class Player {
    constructor() {
        this.x = 100;
        this.y = height / 2;
        this.width = 30;
        this.height = 20;
        this.velocity = 0;
    }

    show() {
        fill(255);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        let currentGroundElevation = getGroundElevation(this.x + this.width / 2);
        if (this.y > height - this.height - currentGroundElevation) {
            this.y = height - this.height - currentGroundElevation;
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    up() {
        this.velocity += LIFT;
    }
}

class GroundSegment {
    constructor() {
        this.x = width;
        this.width = 300;
        this.elevation = random(30, 100);
        this.speed = SCROLL_SPEED;
    }

    show() {
        fill(139, 69, 19);
        rect(this.x, height - this.elevation, this.width, this.elevation);
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x < -this.width;
    }
}

class Obstacle {
    constructor(groundElevation) {
        const gap = max(INITIAL_PIPE_GAP - floor(score / 10) * PIPE_GAP_DECREASE_RATE, MIN_PIPE_GAP);
        this.top = random(50, height - gap - groundElevation - 50);
        this.bottom = height - groundElevation - (this.top + gap);
        this.x = width;
        this.width = 20;
        this.speed = SCROLL_SPEED;
    }

    show() {
        fill(0, 255, 0);
        rect(this.x, 0, this.width, this.top);
        rect(this.x, height - this.bottom, this.width, this.bottom);
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x < -this.width;
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 5;
        this.speed = 5;
    }

    show() {
        fill(255, 0, 0);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.speed;
    }

    offscreen() {
        return this.x > width;
    }
}

class Enemy {
    constructor() {
        this.x = width;
        this.y = random(50, height / 2);
        this.width = 20;
        this.height = 20;
        this.speed = SCROLL_SPEED;
        this.fireRate = max(INITIAL_ENEMY_FIRE_RATE - floor(score / 50) * FIRE_RATE_INCREASE_RATE, MIN_FIRE_RATE);
    }

    show() {
        fill(255, 0, 255);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x < -this.width;
    }

    shoot() {
        if (frameCount % this.fireRate === 0) {
            enemyProjectiles.push(new EnemyProjectile(this.x, this.y + this.height / 2));
        }
    }
}

class EnemyProjectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 5;
        this.speed = -3;
    }

    show() {
        fill(255, 255, 0);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.speed;
    }

    offscreen() {
        return this.x < -this.width;
    }
}

class Survivor {
    constructor(x, y, segment) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = SURVIVOR_HEIGHT;
        this.speed = SCROLL_SPEED;
        this.abducted = false;
        this.segment = segment;
    }

    show() {
        fill(0, 255, 255);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        if (!this.abducted) {
            this.x -= this.speed;
        }
    }

    offscreen() {
        return this.x < -this.width;
    }
}

class Abductor {
    constructor(target) {
        this.x = width;
        this.y = random(50, height / 2);
        this.width = 20;
        this.height = 20;
        this.speed = SCROLL_SPEED + 2;
        this.target = target;
        this.state = 'seeking';
    }

    show() {
        fill(255, 165, 0);
        rect(this.x, this.y, this.width, this.height);
    }

    update() {
        if (this.state === 'seeking') {
            let dx = this.target.x - this.x;
            let dy = this.target.y - this.y;
            let dist = sqrt(dx * dx + dy * dy);
            if (dist < 20) {
                this.state = 'abducting';
                this.target.abducted = true;
            } else {
                this.x += (dx / dist) * this.speed - SCROLL_SPEED;
                this.y += (dy / dist) * this.speed;
            }
        } else if (this.state === 'abducting') {
            this.x -= SCROLL_SPEED;
            this.y -= this.speed;
            this.target.x = this.x;
            this.target.y = this.y + this.height;
            if (this.y < 0) {
                let survivorIndex = survivors.indexOf(this.target);
                if (survivorIndex > -1) {
                    survivors.splice(survivorIndex, 1);
                }
                this.state = 'escaped';
            }
        }
    }

    offscreen() {
        return this.state === 'escaped';
    }
}