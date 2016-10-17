define([
    'opentype'
], function(
    opentype
) {
    "use strict";

    function runCallbacks(callbacks /*, arguments , ...*/) {
        var i, l, args = [];
        for(i=1,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        for(i=0,l=callbacks.length;i<l;i++)
            callbacks[i].apply(null, args);
    }

    function onLoadFont(callbacks, i, fontFileName, err, font) {
        if(err)
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
        else
            runCallbacks(callbacks, i, fontFileName, font);
    }

    function loadFonts (fontFiles, beforeLoadHooks, onLoadCallbacks) {
        var i, l, fontFileName, onload;
        for(i=0,l=fontFiles.length;i<l;i++) {
            fontFileName = fontFiles[i];
            runCallbacks(beforeLoadHooks, i, fontFileName);
            onload = onLoadFont.bind(null, onLoadCallbacks, i, fontFileName);
            opentype.load(fontFileName, onload);
        }
    }

    return loadFonts;
});
