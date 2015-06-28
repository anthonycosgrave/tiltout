// Anthony Cosgrave
// @anthonycosgrave
// www.idoallmyowngames.com
// tiltout - breakout clone using deviceorientation events.
window.requestAnimFrame = function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( /* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
}();

var myGlobal = {};
myGlobal.version = '1.1';	// Web Audio updates.
var assetManager = null;
var storageManager = null;

// "application" part
var tiltOut = (function() {
    myGlobal.scaleFactorX = 0; // horizontal scaling
    myGlobal.scaleFactorY = 0; // vertical scaling
    myGlobal.hasAudioAPI = false;
    var hasDeviceOrientation = false;
    var errorMessage = '';
    myGlobal.wasPageHidden = false;

    var STATE = {
        LOAD: 0,
        MENU: 1,
        PLAY: 3,
        PAUSED: 4,
        INSTRUCTIONS: 5,
        LEVELOVER: 6,
        GAMEOVER: 7,
        ERROR: 8
    };
    var APP_KEY = 'tiltout';
    var currentState = '';
    var previousState = '';
    // dimensions designed for.
    var intendedWidth = 480;
    var intendedHeight = 320;
    var title = 'TiltOut';
    var currentButtons = [];
    var playButton, helpButton, musicButton, fxButton, pauseButton, quitButton, backButton, okButton;
    var titleX = 0;
    var titleY = 0;
    var deltaTitleX = 0;
    var playY = 100;
    var buttonX = 0;
    var instructionsY = 160;
    var musicY = 220;
    var fxY = 280;
    var quitY = 160;
    var loadUnit; // this is the loading bar update step value
    var backY = 0;
    var playedHighScoreSound = false;
    var theGame = null;

    // fancy schmancy text
    // level over
    var levelOverColours = ['#FFFFFF', "#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    var isUpdatingLevelOverColour = false;
    var currentLevelOverColourIndex = 0;
    // game over
    var gameOverColours = ['#FFFFFF', "#FF0000"];
    var isUpdatingGameOverColour = false;
    var currentGameOverColourIndex = 0;
    // new high score
    var highScoreColours = ["#0040FF", "#40FF00", "#FFFF00", "#FF4000", "#FF8000"];
    var isUpdatingHighScoreColour = false;
    var currentHighScoreColourIndex = 0;
    // "TAP TO START"
    var tapToStartColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    var currentTapToStartIndex = 0;
    var isUpdatingTapToStartColour = false;
    // help
    var bonusColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    var currentHelpColourIndex = 0;
    var isUpdatingHelpColour = false;

    var menuBackgroundColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    var currentMenuBackgroundColourIndex = 0;
    var isUpdatingMenuBackgroundColour = false;

    /**
     * Writes to console, but only when in "debug" mode
     * @param output what to write to the console.
     */
    function debug(output) {
        if (myGlobal.isDebug) {
            console.log('DEBUG: ' + output);
        }
    };

    /**
     * Initialises the core items - canvas, context, audio.
     * Wire up touch control event listeners.
     */
    function init() {
        currentState = STATE.LOAD;
        myGlobal.cvs = document.getElementById('c');

        // touch events.
        myGlobal.cvs.addEventListener('touchstart', touchStart, false);
        myGlobal.cvs.addEventListener('touchmove', touchMove, false);
        myGlobal.cvs.addEventListener('touchend', touchEnd, false);

        // web audio.
        if ('webkitAudioContext' in window || 'AudioContext' in window) {
            myGlobal.audioCtx = new AudioContext() || webkitAudioContext();
            myGlobal.hasAudioAPI = true;
        } else {
            //alert('Your browser does not support the Web Audio API. Audio is disabled.');
            errorMessage = 'Web Audio API Not Supported';
            _gaq.push(['_trackEvent', 'Game', 'INIT', errorMessage]);
        }

        // device orientation.
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', devOrientHandler, false);
            hasDeviceOrientation = true;
        } else {
            errorMessage = 'Device Orientation Events Not Supported';
            _gaq.push(['_trackEvent', 'Game', 'INIT', errorMessage]);
        }

        scaleToViewPort();

        if (hasDeviceOrientation) {
            storageManager = new StorageManager(APP_KEY);
            // apply these as default settings that may be overwritten from storage.
            myGlobal.isMusicMuted = true; // everything off by default!
            myGlobal.isFXMuted = true; // everything off by default!
            myGlobal.isMusicPlaying = false; // everything off by default!
            myGlobal.isPaused = false;
            myGlobal.touchedToStart = false;

            if (myGlobal.hasAudioAPI) {
                // only load if web audio is available, otherwise music and FX muted be default.
                storageManager.load();
            }

            assetManager = new AssetManager();

            for (var i = 0; i < assets.length; i++) {
                assetManager.addToDownloadQueue(assets[i].name, assets[i].type, assets[i].url);
            }

            _gaq.push(['_trackEvent', 'Game', 'INIT ' + this.version]);
            theGame = new Game();
        } else {
            errorMessage = "Browser doesn't support the DeviceOrientation API.";
            changeState(STATE.ERROR);
        }
    };

    /**
     * Hold up, heeeeeyyyyyyyyyy.
     */
    function pause() {
        myGlobal.isPaused = true;
        pauseButton.text = '> ';

        if (myGlobal.hasAudioAPI) {
            currentButtons = [pauseButton, quitButton, musicButton, fxButton];
        } else {
            currentButtons = [pauseButton, quitButton];
        }

        changeState(STATE.PAUSED);
    };

    /**
     * Get this show on the road.
     */
    function resume() {
        debug('PAUSE TOUCHED. RESUME THE GAME. ONLY ** PAUSE ** BUTTON.');
        myGlobal.isPaused = false;
        pauseButton.text = '|| ';
        currentButtons = [pauseButton];
        // clear out any "residual tilting"
        myGlobal.beta = 0;
        changeState(STATE.PLAY);
    };

    /**
     * Turns music on / off.
     * Updates local storage with the setting change.
     */
    function toggleMusic() {
        if (myGlobal.hasAudioAPI) {
            var ost = assetManager.getAssetByID('ost').content;
            playMusic(ost);

            if (!myGlobal.isMusicMuted) {
                muteMusic(ost);
                _gaq.push(['_trackEvent', 'Game', 'MUSIC OFF']);
            } else {
                unmuteMusic(ost);
            }

            saveSettings();
        }
    };

    /**
     * Mutes music that's playing and sets flag indicating muted.
     * @param music the track to mute
     */
    function muteMusic(music) {
        myGlobal.isMusicMuted = true;
        music.gainNode.gain.value = 0;
    };

    /**
     * Unmutes music that's playing and sets flag indicating unmuted.
     * @param music the track to unmute.
     */
    function unmuteMusic(music) {
        myGlobal.isMusicMuted = false;
        music.gainNode.gain.value = 0.5;
    }

    /**
     * Turns sound effects on / off.
     * Updates local storage with the setting change.
     */
    function toggleFX() {
        if (myGlobal.hasAudioAPI) {
            if (!myGlobal.isFXMuted) {
                myGlobal.isFXMuted = true;
                _gaq.push(['_trackEvent', 'Game', 'FX OFF']);
            } else {
                myGlobal.isFXMuted = false;
                var btn = assetManager.getAssetByID('button').content;
                playFX(btn);
            }

            saveSettings();
        }
    };

    /**
     *
     * Play background music.
     */
    function playMusic(ost) {
        if (myGlobal.hasAudioAPI) {
            if (!myGlobal.isMusicPlaying) {
                try {
                    ost.source = myGlobal.audioCtx.createBufferSource();
                    // ERROR PLAYING SOUNDTRACK myGlobal.audioCtx.createGainNode is not a function
                    // ost.gainNode = myGlobal.audioCtx.createGainNode();
                    ost.gainNode = myGlobal.audioCtx.createGain();
                    /*
                        Failed to set the 'buffer' property on 'AudioBufferSourceNode': The provided value is not of type 'AudioBuffer'.

                        Because it's now asynch, it won't wait to decode the audio before starting so if the music is saved as ON in
                        settings it won't be available here right away. And so this no longer works combined with the audio assets just
                        being downloaded and decoded synchronously.

                        ost.source.buffer = ost.buffer;

                    */
                    ost.source.buffer = ost.buffer;
                    ost.source.loop = true;
                    ost.source.connect(ost.gainNode);
                    ost.gainNode.connect(myGlobal.audioCtx.destination);
                    // ERROR PLAYING SOUNDTRACK ost.source.noteOn is not a function
                    // ost.source.noteOn(0);
                    ost.source.start();
                    myGlobal.isMusicPlaying = true;
                } catch (e) {
                    myGlobal.isMusicPlaying = false;
                    console.log('ERROR PLAYING SOUNDTRACK ' + e.message);
                }
            }
        }
    };

    /**
     * Play Sound effect.
     * @param fx sound effect to play
     */
    function playFX(fx) {
        if (myGlobal.hasAudioAPI) {
            // this will play a sound effect and if the player selects FX OFF - just turn off the volume!
            if (!myGlobal.isFXMuted) {
                try {
                    var source = myGlobal.audioCtx.createBufferSource();
                    // ERROR PLAYING SOUND FX [object AudioBufferSourceNode] :: myGlobal.audioCtx.createGainNode is not a function
                    // var gainNode = myGlobal.audioCtx.createGainNode();
                    var gainNode = myGlobal.audioCtx.createGain();
                    source.buffer = fx.buffer;
                    source.loop = false;
                    source.connect(gainNode);
                    gainNode.connect(myGlobal.audioCtx.destination);
                    gainNode.gain.value = 0.6;
                    // ERROR PLAYING SOUND FX [object AudioBufferSourceNode] :: source.noteOn is not a function
                    // source.noteOn(0);
                    source.start();
                } catch (e) {
                    console.log('ERROR PLAYING SOUND FX ' + fx + ' :: ' + e.message);
                }
            }
        }
    };

    /**
     * Reset any flags, variable to initial values, etc.
     */
    function reset() {
        myGlobal.touchedToStart = false;
        myGlobal.isPaused = false;
        pauseButton.text = '|| ';
        console.log('resetting game');
        theGame.reset();
    };

    /**
     * Get the dimensions of the viewport and set variables, scaling etc accordingly.
     */
    function scaleToViewPort() {
        // to get rid of the address bar at the top. Has to be positive value to
        // work in android.
        window.scrollTo(0, 1);

        // use orientation event to handle this rather than dimensions
        if (window.orientation === 0 || window.orientation === 180) {
            // window width in landscape should be 480
            // window height in landscape should be 320
            document.getElementById('gameDiv').style.display = 'none';
            document.getElementById('rotateDiv').style.display = 'block';
            myGlobal.hasOrientationChanged = true;
            if (currentState === STATE.PLAY) {
                pause();
            } else if (currentState !== STATE.LOAD) {
                if (!myGlobal.isMusicMuted) {
                    var ost = assetManager.getAssetByID('ost').content;
                    playMusic(ost);
                    ost.gainNode.gain.value = 0;
                }
            }
        } else {
            ////90 and -90
            ////need to set size via CSS?
            document.getElementById('gameDiv').style.display = 'block';
            document.getElementById('rotateDiv').style.display = 'none';
            document.getElementById('c').style.width = window.innerWidth + 'px';
            document.getElementById('c').style.height = window.innerHeight + 'px';
            myGlobal.hasOrientationChanged = false;

            myGlobal.cvs.width = myGlobal.canvasWidth = window.innerWidth;
            myGlobal.cvs.height = myGlobal.canvasHeight = window.innerHeight;
            if (window.innerWidth != intendedWidth && window.innerHeight != intendedHeight) {
                myGlobal.scaleFactorX = Math.round(window.innerWidth / intendedWidth);
                myGlobal.scaleFactorY = Math.round(window.innerHeight / intendedHeight);
            } else {
                myGlobal.scaleFactorX = myGlobal.scaleFactorY = 1;
            }

            //
            // buttons need to be scaled and repositioned correctly.
            //
            scaleUIComponents();

            if (currentState === STATE.PAUSED) {
                if (myGlobal.hasAudioAPI) {
                    currentButtons = [quitButton, musicButton, fxButton, pauseButton];
                } else {
                    currentButtons = [quitButton, pauseButton];
                }

                // pause text was not set properly, was showing as '||' and not '>'
                pauseButton.text = '> ';
            } else if (currentState === STATE.INSTRUCTIONS) {
                currentButtons = [backButton];
            } else {
                if (myGlobal.hasAudioAPI) {
                    currentButtons = [playButton, helpButton, musicButton, fxButton];
                } else {
                    currentButtons = [playButton, helpButton];
                }
            }

            if (currentState !== STATE.LOAD) {
                if (!myGlobal.isMusicMuted) {
                    var ost = assetManager.getAssetByID('ost').content;
                    playMusic(ost);
                    ost.gainNode.gain.value = 0.6;
                }
            }
        }

        myGlobal.ctx = myGlobal.cvs.getContext('2d');
        myGlobal.ctx.textBaseline = 'top'; // everything else is top left corner, so set font too.
    };

    /**
     * Loop through colour array for level over text.
     */
    function strobeLevelOverTextColour() {
        if (currentLevelOverColourIndex < levelOverColours.length - 1) {
            currentLevelOverColourIndex++;
        } else {
            // reset
            currentLevelOverColourIndex = 0;
        }
        isUpdatingLevelOverColour = false;
    };

    /**
     * Loop through colour array for game over text.
     */
    function strobeGameOverTextColour() {
        if (currentGameOverColourIndex < gameOverColours.length - 1) {
            currentGameOverColourIndex++;
        } else {
            // reset
            currentGameOverColourIndex = 0;
        }
        isUpdatingGameOverColour = false;
    };

    /**
     * Loop through colour array for high score text.
     */
    function strobeHighScoreTextColour() {
        if (currentHighScoreColourIndex < highScoreColours.length - 1) {
            currentHighScoreColourIndex++;
        } else {
            // reset
            currentHighScoreColourIndex = 0;
        }
        isUpdatingHighScoreColour = false;
    };

    /**
     * Loop through letters changing current colour.
     */
    function strobeTapToStartColour() {
        if (currentTapToStartIndex < tapToStartColours.length - 1) {
            currentTapToStartIndex++;
        } else {
            // reset
            currentTapToStartIndex = 0;
        }
        isUpdatingTapToStartColour = false;
    };

    /**
     * Make background of bonus items strobe like they do in game.
     */
    function strobeHelpColours() {
        if (currentHelpColourIndex < bonusColours.length) {
            currentHelpColourIndex++;
        } else {
            currentHelpColourIndex = 0;
        }
        isUpdatingHelpColour = false;
    };

    var menuBackgroundColours = ["#FF4000", "#FF8000", "#FFFF00", "#40FF00", "#0040FF"];
    var currentMenuBackgroundColourIndex = 0;
    var isUpdatingMenuBackgroundColour = false;

    function strobeMenuBackgroundColours() {
        if (currentMenuBackgroundColourIndex < menuBackgroundColours.length) {
            currentMenuBackgroundColourIndex++;
        } else {
            currentMenuBackgroundColourIndex = 0;
        }
        isUpdatingMenuBackgroundColour = false;
    };

    /**
     * Setup coordinates, widths, heights, and scaleToViewPort accordingly.
     */
    function scaleUIComponents() {
        buttonX = myGlobal.canvasWidth / 4;
        titleX = myGlobal.canvasWidth / 3;
        deltaTitleX = titleX;
        loadUnit = myGlobal.canvasWidth / assets.length;
        titleY = 50 * myGlobal.scaleFactorY;
        backY = myGlobal.canvasHeight - 25;
        // button width a 3rd of the canvas?
        var buttonWidth = myGlobal.canvasWidth / 3;
        var buttonHeight = 50 * myGlobal.scaleFactorY;
        playButton = new Button('PLAY', 'PLAY', buttonX, playY * myGlobal.scaleFactorY, buttonWidth, buttonHeight, false);
        helpButton = new Button('HELP', 'HELP', buttonX, instructionsY * myGlobal.scaleFactorY, buttonWidth, buttonHeight, false);
        musicButton = new Button('MUSIC', 'MUSIC ', buttonX, musicY * myGlobal.scaleFactorY, buttonWidth, buttonHeight, false);
        fxButton = new Button('FX', 'FX ', buttonX, fxY * myGlobal.scaleFactorY, buttonWidth, buttonHeight, false);
        quitButton = new Button('QUIT', 'QUIT GAME', buttonX, quitY * myGlobal.scaleFactorY, buttonWidth, buttonHeight, false);
        backButton = new Button('BACK', 'BACK', 10, backY, buttonWidth, buttonHeight, false);
        pauseButton = new Button('PAUSE', '|| ', 10, myGlobal.canvasHeight - (10 * myGlobal.scaleFactorY), 50 * myGlobal.scaleFactorX, 50 * myGlobal.scaleFactorY, false);
        okButton = new Button('OK', 'OK', myGlobal.canvasWidth / 2, myGlobal.canvasHeight / 2, buttonWidth, buttonHeight, false);
    };

    /**
     * Common functionality for writing text to the canvas.
     * @param text What to write.
     * @param size How big to write it.
     * @param colour What colour it should be.
     * @param x The horizontal position.
     * @param y The vertical position.
     */
    function writeText(text, size, colour, x, y) {
        //size = 18;  // overriding here!
        myGlobal.ctx.save();
        myGlobal.ctx.shadowOffsetX = 4;
        myGlobal.ctx.shadowOffsetY = 6;
        myGlobal.ctx.shadowBlur    = 4;
        myGlobal.ctx.shadowColor   = "#333";  //or use rgb(red, green, blue)
        myGlobal.ctx.font = size + 'px VT323';
        myGlobal.ctx.fillStyle = colour;
        // want to scale the font...
        myGlobal.ctx.scale(myGlobal.scaleFactorX, myGlobal.scaleFactorY);
        // ...but NOT scale the position!
        myGlobal.ctx.fillText(text, x / myGlobal.scaleFactorX, y / myGlobal.scaleFactorY);
        myGlobal.ctx.restore();
    };

    /**
     * Write text to the canvas and if too big to fit within the maxWidth
     * wrap the remaining text onto the line(s) below.
     * @param text What to write.
     * @param size The font size
     * @param colour The colour of the font.
     * @param x The horizontal position.
     * @param y The vertical position
     * @param maxWidth
     * @param lineHeight
     */
    function wrapText(text, size, colour, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';
        myGlobal.ctx.font = size + 'px VT323';
        myGlobal.ctx.fillStyle = colour;
        for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = myGlobal.ctx.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                myGlobal.ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        myGlobal.ctx.fillText(line, x, y);
    }

    /**
     * enforces orientation on user / resizes everything based on orientation change.
     */
    function handleOrientation() {
        // for when the window's orientation changes
        // 0    : portrait
        // -90  : landscape, rotated right
        // 90   : landscape, rotated left
        scaleToViewPort();
    };

    var previousUIBeta = 0;
    var betaUIThreshold = 0.625;

    /**
     * Handle the DeviceOrientationEvent.
     * @param e the event.
     */
    function devOrientHandler(e) {
        myGlobal.beta = e.beta;

        // move menu items based on input.
        // if (currentState === STATE.MENU) {
        //     if (Math.abs(myGlobal.beta - previousUIBeta) > betaUIThreshold) {
        //         if (myGlobal.beta > 0) {
        //             if (window.orientation === 90) {
        //                 // x++;
        //                 deltaTitleX += (2 * myGlobal.scaleFactorX);
        //             } else {
        //                 // the 'other' landscape
        //                 // x--;
        //                 deltaTitleX -= (2 * myGlobal.scaleFactorX);
        //             }
        //         } else if (myGlobal.beta < 0) {
        //             if (window.orientation === 90) {
        //                 // x--;
        //                 deltaTitleX -= (2 * myGlobal.scaleFactorX);
        //             } else {
        //                 // the 'other' landscape
        //                 // x++;
        //                 deltaTitleX += (2 * myGlobal.scaleFactorX);
        //             }
        //         }

        //         previousUIBeta = myGlobal.beta;
        //     }
        // }
    };

    /**
     * Handle when the page has become visible again.
     */
    function handlePageShow() {
        if (!myGlobal.wasPageHidden) {
            return;
        } else {
            // visible
            // unmute audio - check local storage and unmute that way.
            storageManager.load();
            // leave paused.
            if (!myGlobal.isMusicMuted) {
                var ost = assetManager.getAssetByID('ost').content;
                playMusic(ost);
                unmuteMusic(ost);
            }

            myGlobal.wasPageHidden = false;
        }
    };

    /**
     * Handle when the page has become hidden.
     */
    function handlePageHide() {
        myGlobal.wasPageHidden = true;

        if (currentState === STATE.PLAY) {
            // save game state
            // pause game
            pause();
        }

        // mute music if playing.
        if (!myGlobal.isMusicMuted) {
            var ost = assetManager.getAssetByID('ost').content;
            playMusic(ost);
            muteMusic(ost);
        }
    };

    /**
     * Loop through all the current buttons and see if any were
     * touched by a bounds check of the buttons against touchX and touchY.
     */
    function checkButtons() {
        for (var i = 0; i < currentButtons.length; i++) {
            var b = currentButtons[i];

            b.touched = (b.hitX <= myGlobal.touchX && myGlobal.touchX <= (b.hitX + b.hitWidth)) && (b.hitY <= myGlobal.touchY && myGlobal.touchY <= (b.hitY + b.hitHeight));
        }
    };

    /**
     * Write settings to local storage.
     */
    function saveSettings() {
        try {
            var music = myGlobal.isMusicMuted ? '1' : '0';
            var fx = myGlobal.isFXMuted ? '1' : '0';
            storageManager.saveSettings(music + '*' + fx);
        } catch (e) {
            console.log('ERROR:: Saving Settings' + e.message);
        }
    };

    /**
     * Handles the touch start event.
     * @param e : event object.
     */
    function touchStart(e) {
        if (currentState !== STATE.ERROR) {
            e.preventDefault();
            getTouchCoordinates(e.touches[0]);
            checkButtons();

            var btn = assetManager.getAssetByID('button').content;

            // perform an action based on the touch start
            switch (currentState) {
                case STATE.PLAY:
                    if (myGlobal.touchedToStart) {
                        if (pauseButton.touched) {
                            playFX(btn);
                            pause();
                        }
                    } else {
                        // Let the game begin!
                        // clear out any "residual tilting"
                        myGlobal.beta = 0;
                        myGlobal.touchedToStart = true;
                        playedHighScoreSound = false;
                        _gaq.push(['_trackEvent', 'Game', 'Start']);
                    }

                    break;
                case STATE.PAUSED:
                    if (quitButton.touched) {
                        _gaq.push(['_trackEvent', 'Game', 'Quit', '' + theGame.score]);
                        reset();
                        playFX(btn);
                        changeState(STATE.MENU);
                        if (myGlobal.hasAudioAPI) {
                            currentButtons = [playButton, helpButton, musicButton, fxButton];
                        } else {
                            currentButtons = [playButton, helpButton];
                        }
                        deltaTitleX = titleX;
                    } else if (musicButton.touched) {
                        playFX(btn);
                        toggleMusic();
                    } else if (fxButton.touched) {
                        toggleFX();
                    } else if (pauseButton.touched) {
                        playFX(btn);
                        resume();
                    }
                    break;
                case STATE.MENU:
                    if (playButton.touched) {
                        currentButtons = [pauseButton];
                        theGame.init();
                        playFX(btn);
                        changeState(STATE.PLAY);
                    } else if (helpButton.touched) {
                        currentButtons = [backButton];
                        playFX(btn);
                        changeState(STATE.INSTRUCTIONS);
                    } else if (musicButton.touched) {
                        toggleMusic();
                    } else if (fxButton.touched) {
                        toggleFX();
                    }
                    break;
                case STATE.INSTRUCTIONS:
                    if (backButton.touched) {
                        playFX(btn);
                        if (myGlobal.hasAudioAPI) {
                            currentButtons = [playButton, helpButton, musicButton, fxButton];
                        } else {
                            currentButtons = [playButton, helpButton];
                        }
                        changeState(STATE.MENU);
                    }
                    break;
                case STATE.LEVELOVER:
                    changeState(STATE.PLAY);
                    currentButtons = [pauseButton];
                    break;
                case STATE.GAMEOVER:
                    // any touch on the screen
                    _gaq.push(['_trackEvent', 'Game', 'Over', '' + theGame.score]);
                    changeState(STATE.MENU);
                    reset();
                    if (myGlobal.hasAudioAPI) {
                        currentButtons = [playButton, helpButton, musicButton, fxButton];
                    } else {
                        currentButtons = [playButton, helpButton];
                    }
                    deltaTitleX = titleX;
                    break;
                default:
                    break;
            };
        }

    };

    /**
     * Handles the touch move event.
     * @param e : event object.
     */
    function touchMove(e) {
        e.preventDefault();
        getTouchCoordinates(e.touches[0]);
    };

    /**
     * Handles the touch end event.
     * @param e : event object.
     */
    function touchEnd(e) {
        e.preventDefault();
    };

    /**
     * Returns touch event coordinates on the canvas object.
     * @param e : event object.
     */
    function getTouchCoordinates(e) {
        myGlobal.touchX = (e.pageX);
        myGlobal.touchY = (e.pageY);
    };

    /**
     * The 'engine' driving things. Handles updates based on the currentState
     * the application is in.
     */
    function update() {
        if (!myGlobal.hasOrientationChanged) {
            switch (currentState) {
                case STATE.PLAY:
                    if (myGlobal.touchedToStart) {
                        // update the game...
                        theGame.update();
                    } else {
                        if (!isUpdatingTapToStartColour) {
                            isUpdatingTapToStartColour = true;
                            setTimeout(function() {
                                strobeTapToStartColour();
                            }, 200);
                        }
                    }
                    break;
                case STATE.PAUSED:
                    break;
                case STATE.LOAD:
                    assetManager.download();
                    if (assetManager.isComplete()) {
                        changeState(STATE.MENU);
                    } else {
                        if (assetManager.hasErrors()) {
                            changeState(STATE.ERROR);
                        }
                    }
                    break;
                case STATE.MENU:
                    if (!myGlobal.isMusicPlaying && !myGlobal.isMusicMuted) {
                        var ost = assetManager.getAssetByID('ost').content;
                        playMusic(ost);
                    }
                    if (!isUpdatingMenuBackgroundColour) {
                        isUpdatingMenuBackgroundColour = true;
                        setTimeout(function() {
                            strobeMenuBackgroundColours();
                        }, 100);
                    }
                    break;
                case STATE.INSTRUCTIONS:
                    if (!isUpdatingHelpColour) {
                        isUpdatingHelpColour = true;
                        setTimeout(function() {
                            strobeHelpColours();
                        }, 100);
                    }
                    break;
                case STATE.GAMEOVER:
                    if (!isUpdatingGameOverColour) {
                        isUpdatingGameOverColour = true;
                        setTimeout(function() {
                            strobeGameOverTextColour();
                        }, 150);
                    }

                    if (!isUpdatingHighScoreColour) {
                        isUpdatingHighScoreColour = true;
                        setTimeout(function() {
                            strobeHighScoreTextColour();
                        }, 100);
                    }

                    break;
                case STATE.LEVELOVER:
                    if (!isUpdatingLevelOverColour) {
                        isUpdatingLevelOverColour = true;
                        setTimeout(function() {
                            strobeLevelOverTextColour();
                        }, 50);
                    }
                    currentButtons = [];
                    break;
                case STATE.ERROR:
                    break;
                default:
                    debug('UNKNOWN APPLICATION STATE ' + currentState);
                    break;

            };
            render();
        }
        requestAnimFrame(update);
    };

    /**
     * Where the magic happens!
     */
    function render() {
        //noinspection SillyAssignmentJS
        // myGlobal.cvs.width = myGlobal.cvs.width;
        myGlobal.ctx.clearRect(0, 0, myGlobal.cvs.width, myGlobal.cvs.height);
        switch (currentState) {
            case STATE.PLAY:
                myGlobal.ctx.fillStyle = '#DDD';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);

                for (var i = 0; i < currentButtons.length; i++) {
                    currentButtons[i].render();
                }

                if (myGlobal.touchedToStart) {
                    theGame.render();
                } else {
                    writeText('TAP TO START', 40, tapToStartColours[currentTapToStartIndex], (myGlobal.canvasWidth / 2) - (100 * myGlobal.scaleFactorX), myGlobal.canvasHeight / 2);
                    theGame.render();
                }

                break;
            case STATE.PAUSED:
                myGlobal.ctx.fillStyle = '#F02';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);
                writeText('PAUSED', 50, '#FFF', titleX + 20, titleY);

                for (var i = 0; i < currentButtons.length; i++) {
                    if (currentButtons[i].id === 'MUSIC') {
                        currentButtons[i].text = 'MUSIC ' + (myGlobal.isMusicMuted == true ? 'OFF' : 'ON');
                    } else if (currentButtons[i].id === 'FX') {
                        currentButtons[i].text = 'FX ' + (myGlobal.isFXMuted == true ? 'OFF' : 'ON');
                    }

                    currentButtons[i].render();
                }
                break;
            case STATE.LEVELOVER:
                myGlobal.ctx.fillStyle = '#000';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);
                myGlobal.ctx.fillStyle = '#FFF';
                writeText('LEVEL OVER :)', 50, levelOverColours[currentLevelOverColourIndex], (myGlobal.canvasWidth / 4), titleY);
                writeText('SCORE: ' + theGame.score, 40, '#FFF', myGlobal.canvasWidth / 4, (myGlobal.canvasHeight / 3 + 50));
                writeText('TAP TO CONTINUE', 40, '#F00', myGlobal.canvasWidth / 4, myGlobal.canvasHeight - 25);

                break;
            case STATE.MENU:
                myGlobal.ctx.fillStyle = menuBackgroundColours[currentMenuBackgroundColourIndex];//'#000';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);

                writeText(title, 50, '#FFF', deltaTitleX, titleY);

                for (var i = 0; i < currentButtons.length; i++) {
                    if (currentButtons[i].id === 'MUSIC') {
                        currentButtons[i].text = 'MUSIC ' + (myGlobal.isMusicMuted == true ? 'OFF' : 'ON');
                    } else if (currentButtons[i].id === 'FX') {
                        currentButtons[i].text = 'FX ' + (myGlobal.isFXMuted == true ? 'OFF' : 'ON');
                    }

                    currentButtons[i].render();
                }
                writeText(myGlobal.version, 16, '#FFF', 20, myGlobal.canvasHeight - 60);

                break;
            case STATE.LOAD:
                // display a progress bar
                myGlobal.ctx.fillStyle = '#000';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);
                writeText('LOADING...', 50, '#FFF', 0, myGlobal.canvasWidth / 3);
                myGlobal.ctx.fillStyle = '#FFF';
                myGlobal.ctx.fillRect(10, (myGlobal.canvasWidth / 2) + 1, (assetManager.getDownloadProgress() * loadUnit), 38);
                break;
            case STATE.INSTRUCTIONS:
                writeText('HELP', 50, '#FFF', titleX + 40, titleY);
                writeText('Tilt device left / right to move the paddle.', 20, '#FFF', myGlobal.canvasWidth / 5, myGlobal.canvasHeight / 4);
                writeText('Tap these bonuses when you see them!', 20, '#FFF', myGlobal.canvasWidth / 5, myGlobal.canvasHeight / 3);
                var px = myGlobal.canvasWidth / 5;
                var py = myGlobal.canvasHeight / 5; // * myGlobal.scaleFactorY;
                writeText('Widen Paddle: ', 20, '#FFF', px, (py * 2) + 25);
                writeText('Mutliball: ', 20, '#FFF', px, (py * 3) + 25);
                // paddle bonus
                myGlobal.ctx.fillStyle = bonusColours[currentHelpColourIndex];
                myGlobal.ctx.fillRect((px * 3), (py * 2), 75 * myGlobal.scaleFactorX, 50 * myGlobal.scaleFactorY);
                myGlobal.ctx.fillStyle = "#FFF";
                myGlobal.ctx.fillRect((px * 3) + (15 * myGlobal.scaleFactorX), (py * 2) + (20 * myGlobal.scaleFactorY),
                    45 * myGlobal.scaleFactorX,
                    10 * myGlobal.scaleFactorY);
                // multiball bonus
                myGlobal.ctx.fillStyle = bonusColours[currentHelpColourIndex];
                myGlobal.ctx.fillRect((px * 3), (py * 3), 75 * myGlobal.scaleFactorX, 50 * myGlobal.scaleFactorY);
                myGlobal.ctx.fillStyle = "#FFF";
                myGlobal.ctx.beginPath();
                myGlobal.ctx.arc((px * 3) + (35 * myGlobal.scaleFactorX), (py * 3) + (15 * myGlobal.scaleFactorY),
                    5 * myGlobal.scaleFactorY,
                    0,
                    Math.PI * 2,
                    true);
                myGlobal.ctx.closePath();
                myGlobal.ctx.fill();

                myGlobal.ctx.beginPath();
                myGlobal.ctx.arc((px * 3) + (35 * myGlobal.scaleFactorX), (py * 3) + (15 * myGlobal.scaleFactorY) + (20 * myGlobal.scaleFactorY),
                    5 * myGlobal.scaleFactorY,
                    0,
                    Math.PI * 2,
                    true);
                myGlobal.ctx.closePath();
                myGlobal.ctx.fill();

                for (var i = 0; i < currentButtons.length; i++) {
                    currentButtons[i].render();
                }
                break;
            case STATE.GAMEOVER:
                myGlobal.ctx.fillStyle = '#000';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);
                writeText('GAME OVER :(', 50, gameOverColours[currentGameOverColourIndex], (myGlobal.canvasWidth / 4), titleY);

                if (theGame.isNewHighScore) {
                    // show some fancy text.
                    writeText('NEW HI-SCORE: ' + theGame.score, 40, highScoreColours[currentHighScoreColourIndex], myGlobal.canvasWidth / 4, (myGlobal.canvasHeight / 3 + 50));
                } else {
                    writeText('SCORE: ' + theGame.score, 40, '#FFF', myGlobal.canvasWidth / 4, (myGlobal.canvasHeight / 3 + 50));
                }

                writeText('TAP FOR MENU', 40, '#F00', (myGlobal.canvasWidth / 4) + (25 * myGlobal.scaleFactorX), myGlobal.canvasHeight - 25);
                break;
            case STATE.ERROR:
                // :( bummer - unable to download an asset or a key API is not available.
                myGlobal.ctx.fillStyle = '#000';
                myGlobal.ctx.fillRect(0, 0, myGlobal.canvasWidth, myGlobal.canvasHeight);
                writeText('SORRY :(', 50, '#F00', titleX, titleY);
                // (text, size, colour, x, y, maxWidth, lineHeight)
                wrapText(errorMessage, 30, '#FFF', 50, myGlobal.canvasHeight / 3, myGlobal.canvasWidth, 30);
                wrapText('Game cannot be played.', 30, '#FFF', 50, (myGlobal.canvasHeight / 4), myGlobal.canvasWidth, 30);
                break;
            default:
                debug('UNKNOWN APPLICATION STATE ' + currentState);
                break;
        }
    };

    /**
     * Handles state changing.
     * @param newState the state to change to.
     */
    function changeState(newState) {
        previousState = currentState;
        currentState = newState;
    };

    myGlobal.debug = debug;
    myGlobal.playFx = playFX;
    myGlobal.STATE = STATE;
    myGlobal.changeState = changeState;
    myGlobal.writeText = writeText;

    // kick it off
    init();
    update();

    // for when the window is resized...this doesn't fire when the orientation changes.
    window.addEventListener('resize', function(e) {
        handleOrientation();
    }, false);
    window.addEventListener('orientationchange', function(e) {
        handleOrientation();
    }, false);
    window.addEventListener("pageshow", function(e) {
        handlePageShow();
    }, false);
    window.addEventListener("pagehide", function(e) {
        handlePageHide();
    }, false);
}());