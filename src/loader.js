// Anthony Cosgrave
// @anthonycosgrave
// www.idoallmyowngames.com
var ASSET_TYPE = {
    IMAGE: 0,
    SOUND: 1
};

/**
 * Asset object
 * @param id : Asset id
 * @param type : ASSET_TYPE
 * @param url : location of the asset
 * @constructor
 */
function Asset(id, type, url) {
    this.id = id;
    this.type = type;
    this.url = url;
};

/**
 * AssetManager object.
 * @constructor
 */
function AssetManager() {
    this.downloadQueue = [];
    this.assets = [];
    this.isDownloading = false;
    this.successCount = 0;
    this.errorCount = 0;
    this.errors = [];
};

/**
 * Adds an Asset to the download queue.
 * @param id
 * @param type
 * @param url
 */
AssetManager.prototype.addToDownloadQueue = function(id, type, url) {
    var a = new Asset(id, type, url);
    this.downloadQueue.push(a);
};

/**
 * Returns an asset by id.
 * @param id
 * @return {*}
 */
AssetManager.prototype.getAssetByID = function(id) {
    for (var i = 0; i < this.assets.length; i++) {
        if (this.assets[i].id === id) {
            return this.assets[i];
        }
    }

    return null;
};

/**
 * Returns TRUE if there were download errors, otherwise FALSE.
 * @return {Boolean}
 */
AssetManager.prototype.hasErrors = function() {
    return (this.errorCount > 0);
};

/**
 * Returns the number of downloaded assets.
 * @return {Number}
 */
AssetManager.prototype.getDownloadProgress = function() {
    return this.assets.length;
};

/**
 * Returns TRUE if all items have downloaded, otherwise FALSE.
 * @return {Boolean}
 */
AssetManager.prototype.isComplete = function() {
    return (this.assets.length == this.downloadQueue.length);
};

/**
 * Loop through assets and download accordingly.
 */
AssetManager.prototype.download = function() {
    if (!this.isDownloading) {
        this.isDownloading = true;

        for (var asset = 0; asset < this.downloadQueue.length; asset++) {
            var current = this.downloadQueue[asset];

            switch (current.type) {
                case ASSET_TYPE.SOUND:
                    this.downloadSound(current);
                    break;
                case ASSET_TYPE.IMAGE:
                    this.downloadImage(current);
                    break;
                default:
                    console.log('ASSETMANAGER.DOWNLOAD() ERROR:: UNKNOWN ASSET_TYPE ' + current.type);
                    break;
            }
        }
    }
};

/**
 * Download sound asset and create a Buffer Source object for each one.
 * @param snd
 */
AssetManager.prototype.downloadSound = function(snd) {
    try {
        var that = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', snd.url, true);
        // can't set the responseType if the XHR is NOT asynch
        xhr.responseType = 'arraybuffer';
        xhr.onerror = function(e) {
            // e is an XMLHttpProgressEvent
            that.errorCount++;
            var error = 'ASSETMANAGER.DOWNLOADSOUND(' + snd.url + ') XHR ERROR:: ' + e;
            that.errors.push(error);
        };

        xhr.onload = function(e) {
            that.successCount++;
            var source = null;
            if (myGlobal.hasAudioAPI) {
                // synchronous version of createBuffer is gone...
                source = myGlobal.audioCtx.createBufferSource();
                // source.buffer = myGlobal.audioCtx.createBuffer(this.response, false);
                myGlobal.audioCtx.decodeAudioData(this.response, function onSuccess(decodedBuffer) {
                    // Decoding was successful, do something useful with the audio buffer
                    source.buffer = decodedBuffer;
                }, function onFailure() {
                    alert("Decoding the audio buffer failed");
                });
            }
            that.assets.push({
                id: snd.id,
                content: source
            });
            console.log('DOWNLOADED ' + snd.id);
        };
        xhr.send();
    } catch (e) {
        _gaq.push(['_trackEvent', 'AssetManager', e.message + ' ' + snd]);
        console.log(e);
        this.errors.push(e.message);
    }
};

/**
 * Downloads img assets.
 * @param img the name/url of the image to download.
 */
AssetManager.prototype.downloadImage = function(img) {
    try {
        var that = this;
        var image = new Image();
        image.onload = function(e) {
            console.log('DOWNLOADED ' + img.id);
            that.successCount++;
            that.assets.push({
                id: img.id,
                content: this
            });
        };

        image.onerror = function(e) {
            that.errorCount++;
            var error = 'ASSETMANAGER.DOWNLOADIMAGE(' + img.url + ') XHR ERROR:: ' + e;
            that.errors.push(error);
        };

        image.src = img.url;

    } catch (e) {
        this.errorCount++;
        var error = 'ASSETMANAGER.DOWNLOADIMAGE(' + img.url + ') XHR ERROR:: ' + e;
        this.errors.push(error);
    }
};