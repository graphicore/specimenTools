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
    function main(window, fontFiles) {
        var pubsub = new PubSub()
          , factories
          , fontsData = new FontsData(pubsub, {useLaxDetection: true})
          , webFontProvider = new WebFontProvider(window, pubsub, fontsData)
          ;

        factories = [
            ['family-chooser', FamilyChooser, fontsData]
          , ['glyph-table', GlyphTables]
          , ['font-data', GenericFontData, fontsData]
          , ['current-font', CurrentWebFont, webFontProvider]
          , ['type-tester', TypeTester, fontsData]
        ];

        initDocumentWidgets(window.document, factories, pubsub);

        pubsub.subscribe('allFontsLoaded', function() {
            pubsub.publish('activateFont', 0);
        });

        loadFonts(fontFiles, pubsub);
    }

    return main;
});
