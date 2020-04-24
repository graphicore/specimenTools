/* jshint esversion:6 */
define([
], function(
) {
    "use strict";
    /*globals FileReader, XMLHttpRequest, console*/

    console.warn('DEPRECATION: loadFiles.js is an outdated module, use'
                 + ' services/LoadFiles instead.');

    /**
     * Callback for when a file has been loaded
     *
     * @param id: id of the file loaded
     * @param fileName
     * @param err: null, error-object or string with error message
     * @param arraybuffer
     */
    function onLoadFile(id, fileName, err, arraybuffer) {
        /* jshint validthis: true */

        if(err) {
            console.warn('Can\'t load file', id, fileName, ' with error:', err);
            this.pubsub.publish('loadFileFail', id, fileName, err);
            this.countFailed += 1;
        }
        else {
            // This will also trigger to reload a file.
            this.pubsub.publish('loadFile', id, fileName, arraybuffer);
            this.countLoaded += 1;
        }

        // FIXME: would be cool if we could avoid this event!
        // All subscribers should implement ways to avoid requiring this
        // event. Perhaps deprecate it.
        // Also, the socket.io based files source won't trigger this
        // at all, because `countAll` is expected to be null!
        if(this.countLoaded + this.countFailed === this.countAll)
            this.pubsub.publish('allFilesLoaded', this.countLoaded);

    }

    function loadFromUrl(fileInfo, callback) {
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

    function fileInputFileOnLoad(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(null, this.result);
    }
    function fileInputFileOnError(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(this.error);
    }
    function loadFromFileInput(file, callback) {
        var reader = new FileReader();
        reader.onload = fileInputFileOnLoad.bind(reader, callback);
        reader.onerror = fileInputFileOnError.bind(reader, callback);
        reader.readAsArrayBuffer(file);
    }

    function loadFilesFromFileInput(pubsub, fileInputFiles) {
        _loadFiles(pubsub, fileInputFiles, loadFromFileInput);
    }
    loadFilesFromFileInput.needsPubSub = true;


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
        _loadFiles(pubsub, fileInfo, loadFromUrl);
    }

    function loadFileFromUrl(loaderState, id, fileInfo) {
        //loaderState = {
        //        countLoaded: 0
        //      , countFailed: 0
        //      , countAll: null
        //      , pubsub: pubsub
        //}
        _loadFile.call(loaderState, loadFromUrl, id, fileInfo);
    }

    function _loadFile(loadFromSourceFunc, id, fileInfo) {
        // jshint validthis: true
        this.pubsub.publish('prepareFile', id, fileInfo.name, this.countAll);
        var onload = onLoadFile.bind(this, id, fileInfo.name);
        // The timeout thing is handy to slow down the load progress,
        // if development is done on that part.
        // setTimeout(function(fileInfo, onload) {
        loadFromSourceFunc(fileInfo, onload);
        // }.bind(null, fileInfo, onload), Math.random() * 5000);
    }

    // FIXME: this could be a factory that initializes a new
    // LoadFiles service.
    function _loadFiles(pubsub, files, loadFromSourceFunc) {
        var i, l, fileInfo
          , loaderState = {
                countLoaded: 0
              , countFailed: 0
              , countAll: files.length
              , pubsub: pubsub
            }
          ;

        for(i=0,l=files.length;i<l;i++) {
            fileInfo = files[i];
            _loadFile.call(loaderState, loadFromSourceFunc, i, fileInfo);
        }
    }

    return {
        fromUrl: loadFilesFromUrl
      , fromFileInput: loadFilesFromFileInput
      , oneFromUrl: loadFileFromUrl
    };
});
