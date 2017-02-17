define([
    'specimenTools/loadFonts'
  , 'specimenTools/initDocumentWidgets'
  , 'specimenTools/services/PubSub'
  , 'specimenTools/services/FontsData'
  , '!require/text!specimenTools/services/languageCharSets.json'

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
  , languageCharSetsJson
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
        // This PubSub instance is the centrally connecting element between
        // all modules. The order in which modules subscribe to PubSub
        // channels is relevant in some cases. I.e. when a subscriber is
        // dependant on the state of another module.
        var pubsub = new PubSub()
          , factories
          , fontsData = new FontsData(pubsub, {
                useLaxDetection: true
              , languageCharSets: JSON.parse(languageCharSetsJson)
                // passing in this object with a font's postscript name
                // allows this name to be overwritten
              , overwrites: {
                  'JosefinSans': 'Testname: Josefin Sans'
                }
            })
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

        initDocumentWidgets(window.document, factories, pubsub);

        pubsub.subscribe('allFontsLoaded', function() {
            pubsub.publish('activateFont', 0);
        });

        loadFonts.fromUrl(pubsub, fontFiles);
    }

    return main;
});
