// Anthony Cosgrave
// @anthonycosgrave
// www.idoallmyowngames.com
// don't read this you'll only judge me :P
/**
 * Create a new instance of a Game.
 * @constructor
 */
function Game() {
    // values for controlling paddle movement.
    this.previousBeta = 0;
    this.player = {};
    this.ball = {};
    this.balls = [];
    this.bricks = [];
    this.particles = [];
    this.bonus = {};
    this.bonusColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    this.bonusColourIndex = 0;
    this.isUpdatingBonusColour = false;
    this.level = 1;
    this.bonusCount = 650;
    this.bonusTicker = 0;
    this.multiBallCount = 2;
    this.LEFT = 0;
    this.RIGHT = 1;
};

/**
 * Kick it hoss!
 */
Game.prototype.init = function() {
    this.score = 0;
    this.isNewHighScore = false;
    this.highestScore = storageManager.getScore();
    this.player.lives = 3;
    this.betaThreshold = 0.625;
    this.initPlayer();
    this.initBricks();
    this.initBall();
};

/**
 * Initialise all the player related variables.
 */
Game.prototype.initPlayer = function() {
    this.player.width = 100 * myGlobal.scaleFactorX;
    this.player.height = 10 * myGlobal.scaleFactorY;
    this.player.x = myGlobal.canvasWidth / 2 - (this.player.width) / 2;
    this.player.y = myGlobal.canvasHeight - (this.player.height * 5);
    this.player.colour = '#FFF';
    this.player.speed = 20 * myGlobal.scaleFactorX;
};

/**
 * Initialise all the ball things.
 */
Game.prototype.initBall = function() {
    var ball = {};
    ball.speedX = 2 * (myGlobal.scaleFactorX);
    ball.speedY = 3 * (myGlobal.scaleFactorY);
    ball.radius = 5 * myGlobal.scaleFactorY;
    ball.x = (myGlobal.canvasWidth / 2) + (ball.radius / 4);
    ball.y = (this.brickRows * this.brickHeight) + (this.brickHeight * 2) + (ball.radius * 2);
    ball.width = 5;
    ball.height = 5;
    ball.colour = '#FFF';
    this.balls.push(ball);
};

/**
 * Bricks. Bricks. Bricky-bricks!
 */
Game.prototype.initBricks = function() {
    this.brokenBrickCount = 0;
    this.brickRows = 5;
    this.brickCols = 10;
    this.totalBricks = this.brickRows * this.brickCols;
    this.brickWidth = (myGlobal.canvasWidth / this.brickCols);
    this.brickHeight = 15 * myGlobal.scaleFactorY;
    this.brickColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];

    this.bricks = [this.brickRows];

    for (var i = 0; i < this.brickRows; i++) {
        this.bricks[i] = [this.brickCols];

        for (var j = 0; j < this.brickCols; j++) {
            this.bricks[i][j] = 1;
        }
    }
};

/**
 * Generates a random number within a specified range.
 * @param min minimum value of the range.
 * @param max maximum value of the range.
 * @return {Number}
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Create bonus item.
 */
Game.prototype.initBonus = function() {
    var r = random(1, 10);
    this.bonus.active = true;
    this.bonus.direction = (r % 2 == 0 ? this.LEFT : this.RIGHT);
    this.bonus.x = (this.bonus.direction == 1 ? 0 : myGlobal.canvasWidth);
    this.bonus.y = myGlobal.canvasHeight / 2 - 50;
    this.bonus.speedX = 2 * myGlobal.scaleFactorX;
    this.bonus.width = 75 * myGlobal.scaleFactorX;
    this.bonus.height = 50 * myGlobal.scaleFactorY;
    r = random(1, 10);
    this.bonus.type = (r % 2 == 0 ? 1 : 0); // 0: long paddle, 1: multiball
};

/**
 * Where we do that thing with the stuff.
 */
Game.prototype.update = function() {
    this.updateParticles();
    this.updatePlayer();
    this.updateBonus();
    this.updateBalls();
    this.checkForCollisions();

    if (this.bonusTicker < this.bonusCount) {
        if (!this.bonus.active) {
            this.bonusTicker++;
        }
    } else {
        this.bonusTicker = 0;
        this.initBonus();
    }
};

/**
 * Apply the paddle width bonus.
 */
Game.prototype.increasePaddleWidth = function() {
    this.player.width += 25 * myGlobal.scaleFactorX;
};

/**
 * Can you tie them in a knot? Can you tie them in a bow?
 *
 * @param x horizontal position of the bonus item.
 * @param y vertical position of the bonus item.
 * @param dir Left | Right direction bonus is moving.
 */
Game.prototype.createMultiBalls = function(x, y, dir) {
    for (var i = 0; i < this.multiBallCount; i++) {
        var ball = {};
        ball.radius = 5 * (myGlobal.scaleFactorY);
        ball.x = x + random(10, 30);
        ball.y = y + (i * (ball.radius * 5));
        ball.speedX = (dir === this.LEFT ? -2 : 2) * (myGlobal.scaleFactorX);
        ball.speedY = 3 * (myGlobal.scaleFactorY);
        ball.colour = '#FFF';
        this.balls.push(ball);
    }
};

/**
 * Keep them moving across the screen.
 */
Game.prototype.updateBonus = function() {
    if (this.bonus.active) {
        if ((this.bonus.x <= myGlobal.touchX && myGlobal.touchX <= (this.bonus.x + this.bonus.width)) && (this.bonus.y <= myGlobal.touchY && myGlobal.touchY <= (this.bonus.y + this.bonus.height))) {
            if (this.bonus.type === 0) {
                var g = assetManager.getAssetByID('grow').content;
                myGlobal.playFx(g);
                this.increasePaddleWidth();
            } else if (this.bonus.type === 1) {
                var mb = assetManager.getAssetByID('multiball').content;
                myGlobal.playFx(mb);
                this.createMultiBalls(this.bonus.x + (this.bonus.width / 2), this.bonus.y + (this.bonus.height / 2), this.bonus.direction);
            }
            this.createExplosion(this.bonus.x + (this.bonus.width / 2), this.bonus.y + (this.bonus.height / 2), this.bonusColours[this.bonusColourIndex], 'bonus');
            this.bonus.active = false;
        } else {

            if (this.bonus.direction === this.LEFT) {
                this.bonus.x -= this.bonus.speedX;

                if (this.bonus.x + this.bonus.width < 0) {
                    this.bonus.active = false;
                }
            } else if (this.bonus.direction === this.RIGHT) {
                this.bonus.x += this.bonus.speedX;

                if (this.bonus.x > myGlobal.canvasWidth) {
                    this.bonus.active = false;
                }
            }
        }

        // change colours
        if (!this.isUpdatingBonusColour) {
            var that = this;
            this.isUpdatingBonusColour = true;
            setTimeout(function() {
                strobeBonusColour(that)
            }, 100);
        }
    }
    myGlobal.touchX = myGlobal.touchY = 0;
};

/**
 * Make the bonus look like it's flashing.
 */
function strobeBonusColour(that) {
    if (that.bonusColourIndex < that.bonusColours.length) {
        that.bonusColourIndex++;
    } else {
        that.bonusColourIndex = 0;
    }

    that.isUpdatingBonusColour = false;
};

/**
 * Update player position based on beta values.
 */
Game.prototype.updatePlayer = function() {
    if (Math.abs(myGlobal.beta - this.previousBeta) > this.betaThreshold) {
        if (myGlobal.beta > 0) {
            if (window.orientation === 90) {
                this.player.x += this.player.speed;

                if (this.player.x > myGlobal.canvasWidth - this.player.width) {
                    this.player.x = myGlobal.canvasWidth - this.player.width;
                }
            } else {
                this.player.x -= this.player.speed;

                if (this.player.x < 0) {
                    this.player.x = 0;
                }
            }

        } else if (myGlobal.beta < 0) {
            if (window.orientation === 90) {
                this.player.x -= this.player.speed;

                if (this.player.x < 0) {
                    this.player.x = 0;
                }
            } else {
                this.player.x += this.player.speed;

                if (this.player.x > myGlobal.canvasWidth - this.player.width) {
                    this.player.x = myGlobal.canvasWidth - this.player.width;
                }
            }
        }

        this.previousBeta = myGlobal.beta;
    }
};

/**
 * Moves the ball(s).
 */
Game.prototype.updateBalls = function() {
    for (var i = 0; i < this.balls.length; i++) {
        var b = this.balls[i];
        b.x += b.speedX;
        b.y += b.speedY;
    }
};

/**
 * Check the current score against the high score stored in
 * local storage - which would be loaded when init() is called.
 */
Game.prototype.checkForNewHighScore = function() {
    if (this.score > this.highestScore) {
        this.highestScore = this.score;
        storageManager.saveScore(this.score);
        return true;
    }

    return false;
};

/**
 * Check for collisions between ball(s), wall(s), bricks and paddle
 */
Game.prototype.checkForCollisions = function() {
    try {
        for (var i = this.balls.length - 1; i >= 0; i--) {
            var currentBall = this.balls[i];

            var row = Math.floor(currentBall.y / this.brickHeight);
            var col = Math.floor(currentBall.x / this.brickWidth);
            var height = (this.brickRows * this.brickHeight) + this.brickHeight * 2;

            if (row - 2 >= 0) {
                if (currentBall.y < height && row >= 0 && col >= 0 && this.bricks[row - 2][col] == 1) {
                    currentBall.speedY = -currentBall.speedY;
                    this.bricks[row - 2][col] = 0;
                    this.brokenBrickCount++;
                    this.score += 10;
                    var hitFX = assetManager.getAssetByID('break').content;
                    myGlobal.playFx(hitFX);
                    this.createExplosion(currentBall.x, currentBall.y, this.brickColours[row - 2], 'brick');

                    if (this.score % 100 === 0) {
                        // increase speed
                        currentBall.speedX++;
                        currentBall.speedY++;
                    }

                    if (this.brokenBrickCount === this.totalBricks) {
                        this.levelCompleted();
                        this.brokenBrickCount = 0;
                    }
                }
            }

            var ballFX = assetManager.getAssetByID('ball').content;

            if ((currentBall.x + currentBall.speedX) + currentBall.radius > myGlobal.canvasWidth || (currentBall.x + currentBall.speedX) - currentBall.radius < 0) {
                currentBall.speedX = -currentBall.speedX;
                this.createExplosion(currentBall.x + currentBall.radius, currentBall.y, '#FFF', 'ball');
                myGlobal.playFx(ballFX);
            } else if ((currentBall.x + currentBall.speedX) - currentBall.radius < 0) {
                currentBall.speedX = -currentBall.speedX;
                this.createExplosion(currentBall.x - currentBall.radius, currentBall.y, '#FFF', 'ball');
                myGlobal.playFx(ballFX);
            }

            if ((currentBall.y + currentBall.speedY) - currentBall.radius < 0) {
                this.createExplosion(currentBall.x, currentBall.y - currentBall.radius, '#FFF', 'ball');
                currentBall.speedY = -currentBall.speedY;
                myGlobal.playFx(ballFX);
            } else if (currentBall.y + currentBall.radius > this.player.y && currentBall.x >= this.player.x && currentBall.x <= (this.player.x + this.player.width)) {
                currentBall.speedX = 8 * ((currentBall.x - (this.player.x + this.player.width / 2)) / this.player.width);
                currentBall.speedY = -currentBall.speedY;
                this.createExplosion(currentBall.x, currentBall.y + currentBall.radius, '#FFF', 'ball');
                myGlobal.playFx(ballFX);
            } else if (currentBall.y + currentBall.radius > this.player.y + (this.player.height * 3)) {
                this.balls.splice(i, 1);

                if (this.balls.length === 0) // no balls left...
                {
                    this.player.lives--;

                    if (this.player.lives === 0) {
                        this.gameOver();
                    } else {
                        this.playerDied();
                    }
                }
            }
        }
    } catch (e) {}
};

/**
 * Main rendering function.
 */
Game.prototype.render = function() {
    myGlobal.ctx.font = 30 * myGlobal.scaleFactorX + 'px VT323';
    myGlobal.ctx.fillStyle = '#FFF';
    myGlobal.ctx.fillText('SCORE: ' + this.score, 20, 20 * myGlobal.scaleFactorY);
    var metrics = myGlobal.ctx.measureText('LIVES: ' + this.player.lives);
    var width = Math.round(metrics.width);
    myGlobal.ctx.fillText('LIVES: ' + this.player.lives, myGlobal.canvasWidth - (width) - 20, 20 * myGlobal.scaleFactorY);
    this.drawParticles();
    this.drawBonuses();
    this.drawBalls();
    this.drawPlayer();
    this.drawBricks();
};

/**
 * Draw the ball(s) on screen.
 */
Game.prototype.drawBalls = function() {
    for (var i = 0; i < this.balls.length; i++) {
        myGlobal.ctx.fillStyle = this.balls[i].colour;
        myGlobal.ctx.beginPath();
        // context.arc(x, y, r, sAngle, eAngle, counterclockwise);
        myGlobal.ctx.arc(this.balls[i].x, this.balls[i].y, this.balls[i].radius, 0, Math.PI * 2, true);
        myGlobal.ctx.closePath();
        myGlobal.ctx.fill();
    }
};

/**
 * Draw the player (i.e. the paddle)
 */
Game.prototype.drawPlayer = function() {
    myGlobal.ctx.fillStyle = this.player.colour;
    myGlobal.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
};

/**
 * Draw them thar bricks!
 */
Game.prototype.drawBricks = function() {
    // Bricks
    for (var i = 0; i < this.brickRows; i++) {
        myGlobal.ctx.fillStyle = this.brickColours[i];

        for (var j = 0; j < this.brickCols; j++) {
            if (this.bricks[i][j] == 1) {
                myGlobal.ctx.strokeStyle = '#FFF';
                myGlobal.ctx.fillRect(this.brickWidth * j, (this.brickHeight * i) + (this.brickHeight * 2), this.brickWidth, this.brickHeight);
                myGlobal.ctx.strokeRect(this.brickWidth * j, (this.brickHeight * i) + (this.brickHeight * 2), this.brickWidth, this.brickHeight);
            }
        }
    }
};

/**
 * Draw any bonuses currently on screen.
 */
Game.prototype.drawBonuses = function() {
    if (this.bonus.active) {
        myGlobal.ctx.fillStyle = this.bonusColours[this.bonusColourIndex];
        myGlobal.ctx.fillRect(this.bonus.x, this.bonus.y, this.bonus.width, this.bonus.height);

        myGlobal.ctx.fillStyle = "#FFF";

        if (this.bonus.type === 0) {
            myGlobal.ctx.fillRect(this.bonus.x + (15 * myGlobal.scaleFactorX),
                this.bonus.y + (20 * myGlobal.scaleFactorY),
                45 * myGlobal.scaleFactorX,
                10 * myGlobal.scaleFactorY);
        } else {
            myGlobal.ctx.beginPath();
            myGlobal.ctx.arc(this.bonus.x + (35 * myGlobal.scaleFactorX),
                this.bonus.y + (15 * myGlobal.scaleFactorY),
                5 * myGlobal.scaleFactorY,
                0,
                Math.PI * 2,
                true);
            myGlobal.ctx.closePath();
            myGlobal.ctx.fill();

            myGlobal.ctx.beginPath();
            myGlobal.ctx.arc(this.bonus.x + (35 * myGlobal.scaleFactorX),
                this.bonus.y + (15 * myGlobal.scaleFactorY) + (20 * myGlobal.scaleFactorY),
                5 * myGlobal.scaleFactorY,
                0,
                Math.PI * 2,
                true);
            myGlobal.ctx.closePath();
            myGlobal.ctx.fill();
        }
    }
};

/**
 * Draw any particles on screen.
 */
Game.prototype.drawParticles = function() {
    // Shadows for the particles?
    for (var i = 0; i < this.particles.length - 1; i++) {
        myGlobal.ctx.globalAlpha = (this.particles[i].life) / (this.particles[i].maxLife);
        myGlobal.ctx.fillStyle = this.particles[i].color;
        myGlobal.ctx.fillRect(this.particles[i].x, this.particles[i].y, this.particles[i].width, this.particles[i].height);
        myGlobal.ctx.globalAlpha = 1;
    }
};

/**
 * Move, kill and remove.
 */
Game.prototype.updateParticles = function() {
    for (var i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].moves++;
        this.particles[i].x += this.particles[i].xunits;
        this.particles[i].y += this.particles[i].yunits + (this.particles[i].gravity * this.particles[i].moves);
        this.particles[i].life--;

        if (this.particles[i].life <= 0) {
            this.particles.splice(i, 1);
        }
    }
};

/**
 * Create particles for an explosion.
 * @param x horizontal coordinate for explosion origin.
 * @param y vertical coordinate for explosion origin.
 */
Game.prototype.createExplosion = function(x, y, colour, type) {
    var s = 5; // 5; explosion speed factor...higher value = faster dispersion of particles
    var l = 50; // lifetime factor...higher value = longer lifetime on screen
    var t = 10;
    for (var i = 0; i < t; i++) {
        var angle = Math.floor(Math.random() * 360);
        var speed = Math.floor(Math.random() * s / 2) + s;
        var life = Math.floor(Math.random() * l) + l / 2;
        var radians = angle * Math.PI / 180;
        var xunits = Math.cos(radians) * speed;
        var yunits = Math.sin(radians) * speed;
        var width = 0;
        var height = 0;

        if (type === 'ball') {
            width = height = 4;
        } else if (type === 'brick') {
            width = 15;
            height = 10;
        } else if (type === 'bonusTicker') {
            width = 25;
            height = 15;
        }

        width *= myGlobal.scaleFactorX;
        height *= myGlobal.scaleFactorY;

        // set the x and y values based on the selected A centre and the
        // selected y centres.
        this.particles.push({
            x: x,
            y: y,
            xunits: xunits,
            yunits: yunits,
            life: life,
            color: colour,
            width: width,
            height: height,
            gravity: 0.5,
            moves: 0,
            alpha: 1,
            maxLife: life
        });
    }
};

/**
 * Handle the level over event - when the player has cleared all the bricks.
 */
Game.prototype.levelCompleted = function() {
    myGlobal.changeState(myGlobal.STATE.LEVELOVER);
    // back to basics.
    this.reset();
    this.initBricks();
    this.initBall();
    this.level++;
    storageManager.saveScore(this.score);
};

/**
 * Handle situation where player has died.
 */
Game.prototype.playerDied = function() {
    var death = assetManager.getAssetByID('death').content;
    myGlobal.playFx(death);
    this.reset();
    this.initBall();
};

/**
 * Handle game over.
 */
Game.prototype.gameOver = function() {
    myGlobal.changeState(myGlobal.STATE.GAMEOVER);
    // play a sound
    var go = assetManager.getAssetByID('gameover').content;
    myGlobal.playFx(go);
    storageManager.saveScore(this.score);
    this.isNewHighScore = this.checkForNewHighScore();
};

/**
 * After a death, reset paddle and ball positions.
 */
Game.prototype.reset = function() {
    this.balls = [];
    this.particles = [];
    this.bonus.active = false;
    this.bonusTicker = 0;
    this.initPlayer();
    myGlobal.touchedToStart = false; // reset this flag for the next go 'round.
};