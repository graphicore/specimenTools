define([
    './GlyphTable'
], function(
    GlyphTable
) {
    "use strict";
    var defaults = {};

    function GlyphTables(container, fontFiles, options) {
        this._container = container;
        this._activeTable  = null;
        this._switches = [];
        this._switchesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._switchesContainer);
        this._options = this._makeOptions(options);

        this._tables = [];
        this._tablesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._tablesContainer);

        this._manuallySwitched = false;

        this.prepareLoadHook = this._prepareLoadHook.bind(this);
        this.onLoadFont = this._addFont.bind(this);
    }

    var _p = GlyphTables.prototype;

    _p._makeOptions = function(options) {
            // With Object.keys we won't get keys from the prototype
            // of options but maybe we want this!?
        var keys = options ? Object.keys(options) : []
          , i, l
          , result = Object.create(defaults)
          ;
        for(i=0,l=keys.length;i<l;i++)
            result[keys[i]] = options[keys[i]];
        return result;
    };

    _p._prepareLoadHook = function(i, fontFileName) {
        var button = this._switchesContainer.ownerDocument.createElement('button');
        button.textContent = fontFileName;
        button.disabled = true;
        button.addEventListener('click', this._activateTable.bind(this, i));
        this._switches.push(button);
        this._switchesContainer.appendChild(button);
    };

    _p._addFont = function (i, fontFileName, font) {
        var gt = new GlyphTable(this._tablesContainer.ownerDocument, font, this._options.glyphTable);
        this._tables[i] = gt;
        this._switches[i].disabled = false;
        // TODO: keep original fontFiles order, not loading order.
        // Do this and activate it only if this is the currently lowest
        // index and if there has no manual selection happened
        if(this._activeTable  === null || (this._activeTable > i && ! this._manuallySwitched))
            this._activateTable(i);
    };

    _p._activateTable = function(i, manuallySwitched) {
        while(this._tablesContainer.children.length)
            this._tablesContainer.removeChild(this._tablesContainer.lastChild);

        this._tablesContainer.appendChild(this._tables[i].element);
        this._activeTable = i;
        if(manuallySwitched)
            this._manuallySwitched = true;
    };

    return GlyphTables;
});
