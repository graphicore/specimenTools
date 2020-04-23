/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*globals FileReader, XMLHttpRequest, console*/

    function _loadFromAjaxUrl(fileInfo, callback) {
        var request = new XMLHttpRequest()
          , url = fileInfo.url
          ;
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            if (request.status !== 200) {
                return callback('File could not be loaded: ' + request.statusText);
            }
            return callback(null, request.response);
        };
        request.send();
    }

    function _loadFromFileInput(file, callback) {
        var reader = new FileReader();
        reader.onload = (/*loadEvent*/)=>callback(null, reader.result);
        reader.onerror = (/*loadEvent*/)=>callback(reader.error);
        reader.readAsArrayBuffer(file);
    }


    function LoadFiles(pubsub, options, countAll=null) {
        Parent.call(this, options);

        this._pubSub = pubsub;
        this._countLoaded = 0;
        this._countFailed = 0;
        // if null:
        //  * there will be no allFilesLoaded event
        //  * loadFile can be a *reload*
        //  * unloadFile is possible/acceptable
        // FIXME: unloadFile and loadFile which is a reload could be
        // monitored in here and warned, if a countAll is given!
        // That way we can be clear about expectations baked into the
        // load protocols.
        this._countAll = countAll;
        this._loaded = new Set();
    }

    const _p = LoadFiles.prototype = Object.create(Parent.prototype);
    LoadFiles.constructor = LoadFiles;

    LoadFiles.defaultOptions = {};

    /**
     * Callback for when a file has been loaded
     *
     * @param id: id of the file loaded
     * @param fileName
     * @param err: null, error-object or string with error message
     * @param arraybuffer
     */
    _p._onLoadFile = function(id, fileName, err, arraybuffer) {

        if(err) {
            console.warn('Can\'t load file', id, fileName, ' with error:', err);
            this._pubSub.publish('loadFileFail', id, fileName, err);
            this._countFailed += 1;
        }
        else {
            // This will also trigger to reload a file.
            this._loaded.add(id);
            this._pubSub.publish('loadFile', id, fileName, arraybuffer);
            this._countLoaded += 1;
        }

        // FIXME: would be cool if we could avoid this event!
        // All subscribers should implement ways to avoid requiring this
        // event. Perhaps deprecate it.
        // Also, the socket.io based files source won't trigger this
        // at all, because `countAll` is expected to be null!
        if(this._countLoaded + this._countFailed === this._countAll)
            this._pubSub.publish('allFilesLoaded', this._countLoaded);
    };

    _p._loadFile = function (loadFromSourceFunc, id, fileInfo) {
        // jshint validthis:true
        this._pubSub.publish('prepareFile', id, fileInfo.name, this._countAll);
        var onload = this._onLoadFile.bind(this, id, fileInfo.name);
        // The timeout thing is handy to slow down the load progress,
        // if development is done on that part.
        // setTimeout(function(fileInfo, onload) {
        loadFromSourceFunc(fileInfo, onload);
        // }.bind(null, fileInfo, onload), Math.random() * 5000);
    };

    _p.oneFromUrl = function(id, fileInfo) {
        this._loadFile(_loadFromAjaxUrl, id, fileInfo);
    };

    _p.unload = function(id) {
        if(!this._loaded.has(id))
            return;
        this._loaded.delete(id);
        this._pubSub.publish('unloadFile', id);
    };

    // a (meta) factory for LoadFiles
    function _loadFilesFactory(pubsub, files, loadFromSourceFunc) {
        var loadFiles = new LoadFiles(pubsub, {}, files.length);
        for(let i=0,l=files.length;i<l;i++) {
            let fileInfo = files[i];
            loadFiles._loadFile(loadFromSourceFunc, i, fileInfo);
        }
        return loadFiles;
    }

    // a factory for LoadFiles
    function loadFilesFromUrl(pubsub, files) {
        var i, l
          , fileInfo = []
          ;
        for(i=0,l=files.length;i<l;i++) {
            if (!files[i])
                throw new Error('The url at index '+i+' appears to be invalid.');
            fileInfo.push({
                  name: files[i]
                , url: files[i]
            });
        }
        return _loadFilesFactory(pubsub, fileInfo, _loadFromAjaxUrl);
    }

    // a factory for LoadFiles
    function loadFilesFromFileInput(pubsub, fileInputFiles) {
        return _loadFilesFactory(pubsub, fileInputFiles, _loadFromFileInput);
    }
    loadFilesFromFileInput.needsPubSub = true;

    LoadFiles.fromUrl = loadFilesFromUrl;
    LoadFiles.fromFileInput = loadFilesFromFileInput;
    return LoadFiles;
});
