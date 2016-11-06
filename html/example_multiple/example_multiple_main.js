define([
    'specimenTools/loadFonts'
  , 'specimenTools/initDocumentWidgets'
  , 'specimenTools/services/PubSub'
  , 'specimenTools/services/FontsData'
  , 'specimenTools/services/WebfontProvider'
  , 'specimenTools/widgets/GlyphTables'
  , 'specimenTools/widgets/FamilyChooser'
  , 'specimenTools/widgets/GenericFontData'
  , 'specimenTools/widgets/CurrentWebFont'
  , 'specimenTools/widgets/TypeTester'
], function(
    loadFonts
  , initDocumentWidgets
  , PubSub
  , FontsData
  , WebFontProvider
  , GlyphTables
  , FamilyChooser
  , GenericFontData
  , CurrentWebFont
  , TypeTester
) {
    "use strict";

    /**
     * A very basic initialization function without passing configuration
     * with the factories array
     */

    function main(window, fontFiles) {
      // Fetch all DOM wrappers; fontFiles is array with matching fontFiles for each wrapper
      // then iterate and initiate each specimen sampler and associated widgets
      var wrappers = window.document.getElementsByClassName('wrapper');

        for (var i = 0; i < wrappers.length; i++) {

          // This PubSub instance is the centrally connecting element between
          // all modules. The order in which modules subscribe to PubSub
          // channels is relevant in some cases. I.e. when a subscriber is
          // dependant on the state of another module.
          var pubsub = new PubSub()
            , factories
            , fontsData = new FontsData(pubsub, {useLaxDetection: true})
            , webFontProvider = new WebFontProvider(window, pubsub, fontsData)
            ;

          factories = [
              // [css-class of host element, Constructor(, further Constructor arguments, ...)]
              // All Constructors are given [dom-container, pubsub] as the first two arguments.
              ['family-chooser', FamilyChooser, fontsData]
            , ['glyph-table', GlyphTables]
            , ['font-data', GenericFontData, fontsData]
            , ['current-font', CurrentWebFont, webFontProvider]
            , ['type-tester', TypeTester, fontsData]
          ];

          var fontFilesForInstance = fontFiles[i];

          initDocumentWidgets(wrappers[i], factories, pubsub);

          pubsub.subscribe('allFontsLoaded', function () {
              pubsub.publish('activateFont', 0);
          });

          loadFonts.fromUrl(pubsub, fontFilesForInstance); 
        }
    }

    return main;
});
