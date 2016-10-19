define([
    'opentype'
], function(
    opentype
) {
    "use strict";

    function onLoadFont(i, fontFileName, err, font) {
        /* jshint validthis: true */
        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            return;
        }
        this.pubsub.publish('loadFont', i, fontFileName, font);

        this.countLoaded += 1;
        // if there was an error loading a font (above) this will never run
        if(this.countLoaded === this.countAll)
            this.pubsub.publish('allFontsLoaded', this.countAll);
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
            opentype.load(fontFileName, onload);
        }
    }

    return loadFonts;
});
