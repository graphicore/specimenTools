define([
    'opentype'
], function(
    opentype
) {
    "use strict";
    /*globals FileReader, XMLHttpRequest, console*/

    /* Keep track of what is already in queue for being loaded or has already
     * been loaded; in those cases don't initiate another XHR, but:
     * - executed the callback store in queued
     * - reuse the fontbuffer in loaded
     */ 
    var queue = {},
        loaded = {};

    /**
     * Callback for when a fontfile has been loaded
     *
     * @param i: index of the font loaded
     * @param fontFileName
     * @param err: null, error-object or string with error message
     * @param fontArraybuffer
     */
    function onLoadFont(i, fontFileName, err, fontArraybuffer) {
        /* jshint validthis: true */
        var font
          , isLoaded = Object.keys(loaded).indexOf(fontFileName) !== -1
          ;

        if (isLoaded)
            fontArraybuffer = loaded[ fontFileName ];

        if(!err) {
            try {
                font = opentype.parse(fontArraybuffer);
            }
            catch (parseError) {
                err = parseError;
            }
        }

        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            this.countAll--;
        }
        else {
            this.pubsub.publish('loadFont', i, fontFileName, font, fontArraybuffer);
            this.countLoaded += 1;
        }

        loaded[ fontFileName ] = fontArraybuffer;

        if (!isLoaded) {
            for (var c=0; c<queue[fontFileName].length; c++) {
                queue[fontFileName][c]();
            }
        }

        if(this.countLoaded === this.countAll) {
            this.pubsub.publish('allFontsLoaded', this.countAll);
        }


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

    function _loadFonts(pubsub, fontFiles, loadFont) {
        // console.log("_loadFonts", fontFiles)

        var i, l, fontInfo, onload
          , loaderState = {
                countLoaded: 0
              , countAll: fontFiles.length
              , pubsub: pubsub
            }
          ;

        for(i=0,l=fontFiles.length;i<l;i++) {
            fontInfo = fontFiles[i];

            var isQueued = Object.keys(queue).indexOf(fontInfo.name) !== -1
              , isLoaded = Object.keys(loaded).indexOf(fontInfo.name) !== -1
              ;

            onload = onLoadFont.bind(loaderState, i, fontInfo.name);

            if (isLoaded) {
                // is a file is already loaded, simply execute the callback
                // the arraybuffer form the previous XHR for this file is stored
                // and used to construct the opentype font object
                onload();
                continue;
            }

            if (isQueued) {
                // if this file is already set to load add this callback to the
                // be executed when the load finishes
                queue[ fontInfo["name"] ].push( onload );
                continue;
            }

            // For the first time this file gets loaded simply add the key to 
            // the queue and execute the load (and subsequent callback)
            queue[ fontInfo["name"] ] = [];

            // The timeout thing is handy to slow down the load progress,
            // if development is done on that part.
            // setTimeout(function(fontInfo, onload) {

                pubsub.publish('prepareFont', i, fontInfo.name, l);
                loadFont(fontInfo, onload);

            // }.bind(null, fontInfo, onload), Math.random() * 5000);
        }
    }

    return {
        fromUrl: loadFontsFromUrl
      , fromFileInput: loadFontsFromFileInput
    };
});
