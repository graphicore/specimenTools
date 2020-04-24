/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
  , 'opentype'
], function(
    Parent
  , opentype
) {
    "use strict";

    function LoadFontsOpentypejs(pubsub, options) {
        Parent.call(this, options);
        this._pubSub = pubsub;
        this._fontExtensions = new Set(this._options.fontExtensions);

        this[Parent.$DESTRUCTORS] = [
            this._pubSub.subscribe('prepareFile', this._onPrepareFile.bind(this))
          , this._pubSub.subscribe('loadFileFail', this._onLoadFileFail.bind(this))
          , this._pubSub.subscribe('loadFile', this._onLoadFile.bind(this))
          , this._pubSub.subscribe('unloadFile', this._onUnloadFile.bind(this))
          // no need for this!
          // , this._pubSub.subscribe('allFilesLoaded', this._onAllFilesLoaded.bind(this))

        ];

        this._countLoaded = 0;
        this._countFailed = 0;
        this._countAll = null;
        this._loaded = new Set();
    }

    const _p = LoadFontsOpentypejs.prototype = Object.create(Parent.prototype);
    _p.constructor = LoadFontsOpentypejs;

    LoadFontsOpentypejs.defaultOptions = {
        // AFAIK not supported by opentypejs:'.woff', '.woff2'
        fontExtensions: ['.ttf', '.otf']
        // it's likely that we'll use different libraries to parse fonts
        // depending on the use case etc. so a simple `loadFont` event
        // should not be dialed in to produce a opentype.js instance.
        // This is a first attempt to stay flexible in that regard.
        // It would be good, to maybe have a more high level event protocol
        // that informs e.g. about fonts available via a more universal API.
        // This means e.g. a FontsData API that is implemented for the
        // different font parsing/data providing functions.
      , eventNamePrefix: 'opentypejs.'
    };

    _p._isFontFilename = function (filename) {
        var extIndex = filename.lastIndexOf('.');
        if(extIndex === -1 || extIndex === 0)
            // no files without ext (-1) no dotfiles (0)
            return false;
        return this._fontExtensions.has(filename.slice(extIndex));
    };

    _p._onPrepareFile = function(id, fileName, countAll) {
        if(this._countAll === null && countAll !== null)
            this._countAll = countAll;
        if(!this._isFontFilename(fileName)) {
            this._countAll--;
            return;
        }
        // FIXME: used to send countAll, but we would have to subtract
        // non-fonts and keep the value around...
        this._pubSub.publish(`${this._options.eventNamePrefix}prepareFont`, id, fileName);
    };

    // FIXME: not sure if this is useful, maybe rather don't replay
    // loadFileFail, though, this is usefully augmented, as it only
    // publishes if the file is considered a font file.
    _p._onLoadFileFail = function(id, fileName, err) {
        if(!this._isFontFilename(fileName))
            return;
        this._countFailed += 1;
        this._pubSub.publish(`${this._options.eventNamePrefix}loadFontFail`, id, fileName, err);
    };

    _p._onLoadFile = function(id, fileName, arrayBuffer) {
        if(!this._isFontFilename(fileName))
            return;
        var font, err;
        try {
            // TODO: it is not necessarily cool to do this always,
            // perhaps we should to get rid of this, to enable more
            // lightweight specimen, e.g. loading all essential data
            // from somewhere else.
            font = opentype.parse(arrayBuffer);
        }
        catch (parseError) {
            err = parseError;
        }
        if(err){
            console.warn('Can\'t load font', fileName, ' with error:', err);
            this._pubSub.publish(`${this._options.eventNamePrefix}loadFontFail`, id, fileName, err);
            this._countFailed += 1;
        }
        else {
            // This will also trigger to reload a font.
            this._pubSub.publish(`${this._options.eventNamePrefix}loadFont`, id, fileName, font, arrayBuffer);
            // for a map may use this._loaded.set(id, {fileName, font, arrayBuffer})
            this._loaded.add(id);
            this._countLoaded += 1;
        }

        // FIXME: would be cool if we could avoid this event!
        // All subscribers should implement ways to avoid using this
        // event. Deprecate it.
        // Also, thee socket.io based fonts source won't trigger this
        // at all, because `countAll` is expected to be null!
        if(this._countLoaded + this._countFailed === this._countAll)
            this._pubSub.publish(`${this._options.eventNamePrefix}allFontsLoaded`, this._countLoaded);
    };

    _p._onUnloadFile = function(id) {
        if(!this._loaded.has(id))
            return;
        this._loaded.delete(id);
        this._pubSub.publish(`${this._options.eventNamePrefix}unloadFont`, id);
    };

    return LoadFontsOpentypejs;
});
