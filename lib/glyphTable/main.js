define([
    './GlyphTables'
  , 'specimenTools/loadFonts'
], function(
    GlyphTables
  , loadFonts
) {
    "use strict";

    function main(document, fontFiles) {
        var container = document.createElement('div'), gts;
        // TODO: find the container in the doc
        //       also, respect document loaded status.
        document.body.appendChild(container);
        gts = new GlyphTables(container, fontFiles);
        loadFonts (fontFiles, [gts.prepareLoadHook], [gts.onLoadFont]);
    }

    return main;
});
