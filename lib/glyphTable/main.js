define([
    './GlyphTables'
  , 'specimenTools/loadFonts'
  , 'specimenTools/PubSub'
  , 'specimenTools/fontControl/SimpleControlInterface'
  , 'specimenTools/fontControl/FamilyControlInterface'
  , 'specimenTools/fontData/FontsData'
], function(
    GlyphTables
  , loadFonts
  , PubSub
  , SimpleControllerInterface
  , FamilyControlInterface
  , FontsData
) {
    "use strict";

    function main(document, fontFiles) {
        var pubsub = new PubSub()
         , fontsData = new FontsData(pubsub, {useLaxDetection: true})
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
        fci = new FamilyControlInterface(fctrlContainer, pubsub, fontsData);
        gts = new GlyphTables(tableContainer, pubsub, fontFiles);
        loadFonts (fontFiles, pubsub);
    }

    return main;
});
