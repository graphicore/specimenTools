// jshint esversion:6
define([
    'specimenTools/_BaseWidget'
  , './GlyphTable'
], function(
    Parent
  , GlyphTable
) {
    "use strict";

    /**
     * GlyphTables manages the rendering of the GlyphTable for the current
     * font.
     *
     * The main task is switching to the GlyphTable for the active font.
     *
     * Another task is to determine a common glyph element size for all
     * fonts/GlyphTable-children:
     * When rendering a font, the size of the glyphs svg element is
     * determined by GlyphTable. But, when multiple fonts are displayed
     * this is resulting in different glyph element sizes. Thus, when all
     * fonts are available (see `_p._onAllFontsLoaded`) GlyphTable will
     * use the `setDimensions` method of its children to set a common glyph
     * element size.
     *
     * Options:
     *
     * `glyphTable`: Object, configuration passed to the children
     * `GlyphTable` constructor.
     */
    function GlyphTables(container, pubsub, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubsub;

        this._activeTable  = null;

        this._options = this._makeOptions(options);

        this._tables = new Map();
        this._tablesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._tablesContainer);

        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._pubSub.subscribe('unloadFont', this._onUnloadFont.bind(this));
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._pubSub.subscribe('allFontsLoaded', this._onAllFontsLoaded.bind(this));
    }

    var _p = GlyphTables.prototype = Object.create(Parent.prototype);
    _p.constructor = GlyphTables;

    GlyphTables.defaultOptions = {
        glyphTable: {}
    };

    _p._onLoadFont = function (id, fontFileName, font) {
        if(this._tables.has(id))
            this._onUnloadFont(id);
        let gt = new GlyphTable(this._tablesContainer.ownerDocument, font, this._options.glyphTable);
        this._tables.set(id, gt);
        if(this._activeTable === id)
            this._onActivateFont(id);

    };

    _p._onUnloadFont = function (id) {
        var table = this._tables.get(id);
        if(!table)
            return;
        this._tables.delete(id);
        table.deactivate();
        if(table.element && table.element.parentNode)
            table.element.parentNode.removeChild(table.element);
    };

    _p._onAllFontsLoaded = function(countAll) {
        /*jshint unused:vars*/
        var dimensions, ascent = null, descent = null, width = null;
        for(let table of this._tables.values()) {
            dimensions = table.getDimensions(true);
            ascent = Math.max(ascent || 0, dimensions.ascent);
            descent = Math.max(descent || 0, dimensions.descent);
            width = Math.max(width || 0, dimensions.width);
        }
        for(let table of this._tables.values())
            table.setDimensions(width, ascent, descent);
    };

    _p._onActivateFont = function(id) {
        while(this._tablesContainer.children.length)
            this._tablesContainer.removeChild(this._tablesContainer.lastChild);
        if(this._activeTable !== null && this._tables.has(this._activeTable))
            this._tables.get(this._activeTable).deactivate();
        // Happened (fact!): Uncaught TypeError: Cannot read property 'activate' of undefined
        if(!this._tables.has(id))
            return;
        this._tables.get(id).activate();
        this._tablesContainer.appendChild(this._tables.get(id).element);
        this._activeTable = id;
    };

    return GlyphTables;
});
