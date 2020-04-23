/* jshint esversion:6 */
define([
    'opentype'
], function(
    opentype
) {
    "use strict";
    /*globals FileReader, XMLHttpRequest, console*/

    /**
     * CAUTUION: this is deprecated/legacy:
     *  use loadFiles and services/LoadFontsOpentypejs instead!
     */
    console.warn('DEPRECATION: loadFonts.js is an outdated module, use'
                 + ' loadFiles and services/LoadFontsOpentypejs instead.');

    /**
     * Callback for when a fontfile has been loaded
     *
     * BREAKING: id was i: index of the font loaded
     * @param i: index of the font loaded
     * @param fontFileName
     * @param err: null, error-object or string with error message
     * @param fontArraybuffer
     */
    function onLoadFont(id, fontFileName, err, fontArraybuffer) {
        /* jshint validthis: true */
        var font;
        if(!err) {
            try {
                // TODO: it is not necessarily cool to do this always,
                // perhaps we should to get rid of this, to enable more
                // lightweight specimen, e.g. loading all essential data
                // from somewhere else.
                font = opentype.parse(fontArraybuffer);
            }
            catch (parseError) {
                err = parseError;
            }
        }

        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            this.countFailed += 1;
        }
        else {
            // Looks like this will also trigger to reload a font.
            // Breaking changes, the first argument was like: 'loadFont', i
            // But i will be a string that is interpreted as id!
            this.pubsub.publish('loadFont', id, fontFileName, font, fontArraybuffer);
            this.countLoaded += 1;
        }

        // FIXME: would be cool if we could avoid this event!
        // All subscribers should implement ways to avoid using this
        // event. Deprecate it.
        // Also, the socket.io based fonts source won't trigger this
        // at all, because `countAll` is expected to be null!
        if(this.countLoaded + this.countFailed === this.countAll)
            this.pubsub.publish('allFontsLoaded', this.countLoaded);

    }

    function loadFromUrl(fontInfo, callback) {
        var request = new XMLHttpRequest()
          , url = fontInfo.url
          ;
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            if (request.status !== 200) {
                return callback('Font could not be loaded: ' + request.statusText);
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

    function loadFontsFromFileInput(pubsub, fileInputFiles) {
        _loadFonts(pubsub, fileInputFiles, loadFromFileInput);
    }
    loadFontsFromFileInput.needsPubSub = true;


    function loadFontsFromUrl(pubsub, fontFiles) {
        var i, l
          , fontInfo = []
          ;
        for(i=0,l=fontFiles.length;i<l;i++) {
            if (!fontFiles[i])
                throw new Error('The url at index '+i+' appears to be invalid.');
            fontInfo.push({
                  name: fontFiles[i]
                , url: fontFiles[i]
            });
        }
        _loadFonts(pubsub, fontInfo, loadFromUrl);
    }

    function loadFontFromUrl(loaderState, id, fontinfo) {
        //loaderState = {
        //        countLoaded: 0
        //      , countFailed: 0
        //      , countAll: null
        //      , pubsub: pubsub
        //}
        _loadFont.call(loaderState, loadFromUrl, id, fontinfo);
    }

    function _loadFont(loadFromSourceFunc, id, fontInfo) {
        // jshint validthis: true
        this.pubsub.publish('prepareFont', id, fontInfo.name, this.countAll);
        var onload = onLoadFont.bind(this, id, fontInfo.name);
        // The timeout thing is handy to slow down the load progress,
        // if development is done on that part.
        // setTimeout(function(fontInfo, onload) {
        loadFromSourceFunc(fontInfo, onload);
        // }.bind(null, fontInfo, onload), Math.random() * 5000);
    }

    function _loadFonts(pubsub, fontFiles, loadFromSourceFunc) {
        var i, l, fontInfo
          , loaderState = {
                countLoaded: 0
              , countFailed: 0
              , countAll: fontFiles.length
              , pubsub: pubsub
            }
          ;

        for(i=0,l=fontFiles.length;i<l;i++) {
            fontInfo = fontFiles[i];
            _loadFont.call(loaderState, loadFromSourceFunc, i, fontInfo);
        }
    }

    return {
        fromUrl: loadFontsFromUrl
      , fromFileInput: loadFontsFromFileInput
      , oneFromUrl: loadFontFromUrl
    };
});
