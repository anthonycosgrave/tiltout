// Anthony Cosgrave
// @anthonycosgrave
// www.idoallmyowngames.com
/**
 * Create an StorageManager object.
 * @param appKey identifies this application from anything else using localstorage.
 * @constructor
 */
function StorageManager(appKey) {
    this.appKey = appKey;
};

/**
 * load any existing settings.
 */
StorageManager.prototype.load = function() {
    var settings = this.getSettings();
    if (settings != null) {
        settings = settings.split('*');
        myGlobal.isMusicMuted = (settings[0] != '0'); // 1 means muted.
        myGlobal.isFXMuted = (settings[1] != '0'); // 1 means muted.
    }
};

// audio on/off, fx on/off, difficulty.
// 'audio*fx*difficulty'
/**
 * Gets settings if they exist from local storage.
 * @return {String}
 */
StorageManager.prototype.getSettings = function() {
    var settings = '';

    if (window.localStorage) {
        settings = localStorage.getItem(this.appKey + "Settings");
    }

    return settings;

};

/**
 * Writes settings to local storage.
 * @param settings (music*fx)
 */
StorageManager.prototype.saveSettings = function(settings) {
    if (window.localStorage) {
        // does setItem return anything?
        console.log('SAVING SETTINGS ' + settings);
        localStorage.setItem(this.appKey + "Settings", settings);
    }
};

// handles local storage - reading, writing etc.
// get score from local storage
StorageManager.prototype.getScore = function() {
    var highScore = 0;

    if (window.localStorage) {
        highScore = localStorage.getItem(this.appKey + "Score");
    }

    return highScore;
};

// write score to local storage
StorageManager.prototype.saveScore = function(score) {
    if (window.localStorage) {
        // does setItem return anything?
        localStorage.setItem(this.appKey + "Score", score);
    }
};

// save game progress / state info to localStorage
// info will have to be a formatted string of some kind
// localStorage only accepts strings (or at least turns everything
// into a string anyhow!)
StorageManager.prototype.saveState = function(info) {
    if (window.localStorage) {
        localStorage.setItem(this.appKey + "State", info);
    }
};

// retrieve saved state from localstorage, calling application
// can parse the returned string as needed.
StorageManager.prototype.getSavedState = function() {
    var state = null;

    if (window.localStorage) {
        state = localStorage.getItem(this.appKey + "State");
    }

    return state;
};