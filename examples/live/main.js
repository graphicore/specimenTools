/* jshint esversion:6*/
define([
    'socket.io'
  , 'specimenTools/services/LoadFiles'
  , 'specimenTools/services/LoadFontsOpentypejs'
  , 'specimenTools/initWidgets'
  , 'specimenTools/services/PubSub'
  , 'specimenTools/services/FontsLoadState'
  , 'specimenTools/services/FontsData'
  , 'specimenTools/services/WebfontProvider'
  , 'specimenTools/services/RemoteLoader'
  , 'specimenTools/widgets/GlyphTables'
  , 'specimenTools/widgets/FamilyChooser'
  , 'specimenTools/widgets/SimpleFileChooser'
  , 'specimenTools/widgets/FontLister'
  , 'specimenTools/widgets/GenericFontData'
  , 'specimenTools/widgets/CurrentWebFont'
  , 'specimenTools/widgets/TypeTester'
  , 'specimenTools/widgets/PerFont'
  , 'specimenTools/widgets/Diagram'
  , 'specimenTools/widgets/DragScroll'
  , 'specimenTools/widgets/SubSpecimenController'
  , 'specimenTools/widgets/FontTestingPage/DataColumns'
  , 'specimenTools/widgets/Mustache'
], function(
    socketio
  , LoadFiles
  , LoadFontsOpentypejs
  , initWidgets
  , PubSub
  , FontsLoadState
  , FontsData
  , WebFontProvider
  , RemoteLoader
  , GlyphTables
  , FamilyChooser
  , SimpleFileChooser
  , FontLister
  , GenericFontData
  , CurrentWebFont
  , TypeTester
  , PerFont
  , Diagram
  , DragScroll
  , SubSpecimenController
  , FontTestingDataColumns
  , Mustache
) {
    "use strict";

    /**
     * A very basic initialization function without passing configuration
     * with the factories array
     */

    function main(window) {
        // This PubSub instance is the centrally connecting element between
        // all modules. The order in which modules subscribe to PubSub
        // channels is relevant in some cases. I.e. when a subscriber is
        // dependant on the state of another module.
        var pubsub = new PubSub()
          , loadFiles = new LoadFiles(pubsub, {}, null)
          , remoteLoader = new RemoteLoader()
          , fontsLoadState = new FontsLoadState(pubsub)
          , widgetDependencies
          ;


        // NOTE: handling current font and finding a replacement if it
        // vanishes is still pretty fragile!
        // It's important to subscribe this before `loadedFonts`/`fontsData`
        // or whatever state is used to determine the `orderedIds` list.
        // Because that way 'currentFont' is still present in the orderedIds
        // and we can find its surrounding ids.
        pubsub.subscribe('unloadFont', function(id) {
            if(currentFont !== id)
              return;
                // orderedIds could be taken from fontData for better results,
                // but then fontsData must subscribe *AFTER* this!
            var // using fontsLoadState is not yielding particularly interesting results
                // orderedIds = Array.from(fontsLoadState.getState().keys())
                // this is a proper order, but it depends on opentype.js:
                orderedIds = fontsData.getFontIdsInFamilyOrder()
              , [before, after] = _getNextToCurrent(
                              currentFont, orderedIds)
              , newId = null
              ;

            // pick first "after" second "before"
            if(after !== null)
              newId = after;
            else if(before !== null)
              newId = before;

            if(newId !== null)
              pubsub.publish('activateFont', newId);
            // if we don't find any id we don't activate anything.
        });

        var fontsData = new FontsData(pubsub, {
              useLaxDetection: true,

              // passing in this object with a font's postscript name
              // allows this name to be overwritten
              overwrites: {
                'JosefinSans': 'Testname Josefin Sans'
              }
            })
          , webFontProvider = new WebFontProvider(window, pubsub, fontsData)
          , socket = socketio('/')
          ;

        // no use for the instance so far
        /* loadFonts = */new LoadFontsOpentypejs(pubsub, {
              // legacy support
              eventNamePrefix: ''
          });


        widgetDependencies = {
            pubsub
          , fontsLoadState
          , fontsData
          , webFontProvider
          , remoteLoader
          // , widgetsAPI
          // => why not -> but using this via a service could be
          //    more unified interfaceCtrlTemplatesNode
          , options: {
              familyChooser: {
                'events.allFontsLoaded': false
              }
            , perFont: {
                    itemClass: 'per-font__item'
                  , bluePrintNodeClass: 'per-font__item-blueprint'
                  , fontDataClass:  'per-font__data'
                  , currentFontClass:  'per-font__current-font'
                  , 'events.allFontsLoaded': false
              }
            , subSpecimenController: {
                injectionData: {
                    globals: {userAgent: navigator.userAgent}
                }
              }
            , fontTestingDataColumns: {}
            , mustache: {}
          }
          // this way we can also have a SubSpecimenController load
          // widgets recursively.
          , widgetFactories: [
                // [css-class of host element, Constructor(, further Constructor argument, ...)]
                ['family-chooser', FamilyChooser, 'container', 'pubsub', 'fontsData', 'options.familyChooser']
              , ['simple-file-chooser' , SimpleFileChooser, 'container', 'pubsub']
              , ['glyph-table', GlyphTables, 'container', 'pubsub']
              , ['font-data', GenericFontData, 'container', 'pubsub', 'fontsData']
              , ['current-font', CurrentWebFont, 'container', 'pubsub', 'webFontProvider']
              , ['type-tester', TypeTester, 'container', 'pubsub', 'fontsData']
              , ['per-font', PerFont, 'container', 'pubsub', 'fontsData', 'webFontProvider', 'options.perFont']
              , ['diagram', Diagram, 'container', 'pubsub', 'fontsData', 'webFontProvider']
              , ['font-lister', FontLister, 'container', 'pubsub', 'fontsData']
              , ['drag-scroll', DragScroll, 'container']
              , ['sub-specimen_ctrl', SubSpecimenController, 'container', 'pubsub', 'fontsLoadState'
                                    , 'remoteLoader', 'widgetDependencies', 'options.subSpecimenController']
              , ['font-testing-data', FontTestingDataColumns,'container', 'data.text'
                                                          , 'data.columns', 'options.fontTestingDataColumns']
              , ['mustache', Mustache, 'container', 'view', 'options.mustache']
          ]
        };
        // self referential
        widgetDependencies.widgetDependencies = widgetDependencies;

        /* let [instances, elements] = */ initWidgets(window.document
                                                    , widgetDependencies);

        function _getNextToCurrent(current, orderedIds) {
          // if we have a state map that still contains the last current font
          // this is an algorithm to find the id before and after ...
          var before, after
           , target = orderedIds.indexOf(current)
           ;
          before = after = null;

          if(target === -1)
            before = after = orderedIds.length === 0 ? null : 0;
          else {
            before = target > 0 ? orderedIds[target-1] : null;
            after = target+1 < orderedIds.length ? orderedIds[target+1] : null;
          }
          return [before, after];
        }

        var currentFont = null;
        pubsub.subscribe('activateFont', function(id) {
            currentFont = id;
        });

        pubsub.subscribe('loadFont', function(id) {
            if(currentFont === null || currentFont === id)
              // it's a reload, update all widgets
              pubsub.publish('activateFont', id);
        });

        var spoof = 0;
        socket.on('fs-watch', (eventName, id, fileInfo) => {
            switch(eventName) {
                case 'load':
                    // load initially or reload/update
                    fileInfo.url += `?spoof${spoof++}`;
                    loadFiles.oneFromUrl(id, fileInfo);
                    break;
                case 'unload':
                    loadFiles.unload(id);
                    break;
            }
        });

        socket.emit('subscribe', 'fs-watch', (fsStateEntries)=>{
            for(let [id, fileInfo] of fsStateEntries)
              loadFiles.oneFromUrl(id, fileInfo);
        });

        // pubsub.subscribe(PubSub.$ALL, (channel, ...args)=>console.log(`PubSub.$ALL[${channel}]`, ...args));
        // pubsub.subscribe('activateFont', (...args)=>console.log(`PubSub[activateFont]`, ...args));
    }

    return main;
});
