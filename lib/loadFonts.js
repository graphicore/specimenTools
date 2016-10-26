define([
    'opentype'
], function(
    opentype
) {
    "use strict";

    function onLoadFont(i, fontFileName, err, fontArraybuffer) {
        /* jshint validthis: true */
        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            return;
        }
        var font = opentype.parse(fontArraybuffer);
        this.pubsub.publish('loadFont', i, fontFileName, font, fontArraybuffer);
        this.countLoaded += 1;
        // if there was an error loading a font (above) this will never run
        if(this.countLoaded === this.countAll)
            this.pubsub.publish('allFontsLoaded', this.countAll);
    }

    function loadFromUrl(url, callback) {
        var request = new XMLHttpRequest();
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

    function loadFonts (fontFiles, pubsub) {
        var i, l, fontFileName, onload
          , loaderState = {
                countLoaded: 0
              , countAll: fontFiles.length
              , pubsub: pubsub
            }
          ;

        for(i=0,l=fontFiles.length;i<l;i++) {
            fontFileName = fontFiles[i];
            pubsub.publish('prepareFont', i, fontFileName);
            onload = onLoadFont.bind(loaderState, i, fontFileName);
            loadFromUrl(fontFileName, onload);
        }
    }

    return loadFonts;
});
