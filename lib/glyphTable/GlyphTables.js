define([
    'specimenTools/_BaseWidget'
  , './GlyphTable'
], function(
    Parent
  , GlyphTable
) {
    "use strict";

    function GlyphTables(container, pubsub, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubsub;

        this._activeTable  = null;

        this._options = this._makeOptions(options);

        this._tables = [];
        this._tablesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._tablesContainer);

        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._pubSub.subscribe('allFontsLoaded', this._onAllFontsLoaded.bind(this));
    }

    var _p = GlyphTables.prototype = Object.create(Parent.prototype);
    _p.constructor = GlyphTables;

    GlyphTables.defaultOptions = {};

    _p._onLoadFont = function (i, fontFileName, font) {
        var gt = new GlyphTable(this._tablesContainer.ownerDocument, font, this._options.glyphTable);
        this._tables[i] = gt;
    };

    _p._onAllFontsLoaded = function(countAll) {
        /*jshint unused:vars*/
        var i, l, dimensions, ascent = null, descent = null, width = null;
        for(i=0,l=this._tables.length;i<l;i++) {
            dimensions = this._tables[i].getDimensions(true);
            ascent = Math.max(ascent || 0, dimensions.ascent);
            descent = Math.max(descent || 0, dimensions.descent);
            width = Math.max(width || 0, dimensions.width);
        }
        for(i=0,l=this._tables.length;i<l;i++)
            this._tables[i].setDimensions(width, ascent, descent);
    };

    _p._onActivateFont = function(i) {
        if(this._activeTable === i)
            return;
        while(this._tablesContainer.children.length)
            this._tablesContainer.removeChild(this._tablesContainer.lastChild);
        this._tablesContainer.appendChild(this._tables[i].element);
        this._activeTable = i;
    };

    return GlyphTables;
});
