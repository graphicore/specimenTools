define([
    './GlyphTables'
  , 'specimenTools/loadFonts'
  , 'specimenTools/fontControl/PubSub'
  , 'specimenTools/fontControl/SimpleControlInterface'
], function(
    GlyphTables
  , loadFonts
  , PubSub
  , SimpleControllerInterface
) {
    "use strict";

    function main(document, fontFiles) {
        var pubsub = new PubSub()
         , ctrlContainer = document.createElement('div')
         , tableContainer = document.createElement('div')
         , gts
         , sci
         ;
        // TODO: find the container in the doc
        //       also, respect document loaded status.

        document.body.appendChild(ctrlContainer);
        document.body.appendChild(tableContainer);
        sci = new SimpleControllerInterface(ctrlContainer, pubsub);
        gts = new GlyphTables(tableContainer, pubsub, fontFiles);
        loadFonts (fontFiles, pubsub);
    }

    return main;
});
