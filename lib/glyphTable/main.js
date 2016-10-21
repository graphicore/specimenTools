define([
    './GlyphTables'
  , 'specimenTools/loadFonts'
  , 'specimenTools/fontControl/PubSub'
  , 'specimenTools/fontControl/SimpleControlInterface'
  , 'specimenTools/fontControl/FamilyControlInterface'
], function(
    GlyphTables
  , loadFonts
  , PubSub
  , SimpleControllerInterface
  , FamilyControlInterface
) {
    "use strict";

    function main(document, fontFiles) {
        var pubsub = new PubSub()
         , ctrlContainer = document.createElement('div')
         , fctrlContainer = document.createElement('div')
         , tableContainer = document.createElement('div')
         , gts
         , sci
         , fci
         ;
        // TODO: find the container in the doc
        //       also, respect document loaded status.

        document.body.appendChild(ctrlContainer);
        document.body.appendChild(fctrlContainer);
        document.body.appendChild(tableContainer);
        sci = new SimpleControllerInterface(ctrlContainer, pubsub);
        fci = new FamilyControlInterface(fctrlContainer, pubsub);
        gts = new GlyphTables(tableContainer, pubsub, fontFiles);
        loadFonts (fontFiles, pubsub);
    }

    return main;
});
