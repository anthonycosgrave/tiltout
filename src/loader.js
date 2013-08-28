/**
 * Created with JetBrains WebStorm.
 * User: anthonycosgrave
 * Date: 19/06/2013
 * Time: 12:43
 * To change this template use File | Settings | File Templates.
 */
var ASSET_TYPE =
{
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
function Asset(id, type, url)
{
	this.id = id;
	this.type = type;
	this.url = url;
};

/**
 * AssetManager object.
 * @constructor
 */
function AssetManager()
{
	this.downloadQueue = [];
	this.assets = [];
	this.isDownloading = false;
	this.successCount = 0;
	this.errorCount = 0;
	this.errors = [];
};

/**
 *
 * @param id
 * @param type
 * @param url
 */
AssetManager.prototype.addToDownloadQueue = function (id, type, url)
{
	var a = new Asset(id, type, url);
	this.downloadQueue.push(a);
};

/**
 *
 * @param id
 * @return {*}
 */
AssetManager.prototype.getAssetByID = function (id)
{
	for (var i = 0; i < this.assets.length; i++)
	{
		if (this.assets[i].id === id)
		{
			return this.assets[i];
		}
	}

	return null;
};

/**
 *
 * @return {Boolean}
 */
AssetManager.prototype.hasErrors = function ()
{
	return (this.errorCount > 0);
};

/**
 *
 * @return {Number}
 */
AssetManager.prototype.getDownloadProgress = function ()
{
	return this.assets.length;
};

/**
 *
 * @return {Boolean}
 */
AssetManager.prototype.isComplete = function ()
{
	return (this.assets.length == this.downloadQueue.length);
};

/**
 * Loop through assets and download accordingly.
 */
AssetManager.prototype.download = function ()
{
	if (!this.isDownloading)
	{
		this.isDownloading = true;

		for (var asset = 0; asset < this.downloadQueue.length; asset++)
		{
			var current = this.downloadQueue[asset];

			switch (current.type)
			{
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

// using XMLHttpRequest object and returns an ArrayBuffer
// add it to the assets to be accessed by ID
// this.assets.push({snd.id, this.response});
/**
 * Download sound asset and create a Buffer Source object for each one.
 * @param snd
 */
AssetManager.prototype.downloadSound = function (snd)
{
	try
	{
		var that = this;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', snd.url, true);
		// can't set the responseType if the XHR is NOT asynch
		xhr.responseType = 'arraybuffer';
		xhr.onerror = function (e)
		{
			// e is an XMLHttpProgressEvent
			that.errorCount++;
			var error = 'ASSETMANAGER.DOWNLOADSOUND(' + snd.url + ') XHR ERROR:: ' + e;
			that.errors.push(error);
		};
		//            xhr.onprogress = function (e) {
		//                // e is an XMLHttpProgressEvent
		//                if (e.lengthComputable) {
		//                    var progress = e.loaded / e.total;
		//                    console.log('progress ' + progress);
		//                }

		//                console.log(e);
		//            };

		xhr.onload = function (e)
		{
			that.successCount++;
			var source = null;
			if (myGlobal.hasAudioAPI)
			{
				source = myGlobal.audioCtx.createBufferSource();
				source.buffer = myGlobal.audioCtx.createBuffer(this.response, false);
			}
			that.assets.push({ id: snd.id, content: source});   // replace this.response with e.target?
			console.log('DOWNLOADED ' + snd.id);
		};
		xhr.send();
	}
	catch (e)
	{
		_gaq.push(['_trackEvent', 'AssetManager',  e.message + ' ' + snd]);
		console.log(e);
		this.errors.push(e.message);
	}
};

/**
 *
 * @param img
 */
AssetManager.prototype.downloadImage = function (img)
{
	try
	{
		var that = this;
		var image = new Image();
		image.onload = function (e)
		{
			console.log('DOWNLOADED ' + img.id);
			that.successCount++;
			that.assets.push({ id: img.id, content: this });
		};

		image.onerror = function (e)
		{
			that.errorCount++;
			var error = 'ASSETMANAGER.DOWNLOADIMAGE(' + img.url + ') XHR ERROR:: ' + e;
			that.errors.push(error);
		};

		image.src = img.url;

	} catch (e)
	{
		this.errorCount++;
		var error = 'ASSETMANAGER.DOWNLOADIMAGE(' + img.url + ') XHR ERROR:: ' + e;
		this.errors.push(error);
	}
};