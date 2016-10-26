define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    function GenericFontDataWidget(container, pubSub, fontData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontData = fontData;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = GenericFontDataWidget.prototype = Object.create(Parent.prototype);
    _p.constructor = GenericFontDataWidget;

    GenericFontDataWidget.defaultOptions = {
        // this is required
        getValue: null
    };

    _p._defaultGetValue  = function(fontIndex) {
        var _getter, getter;
        getter = _getter = this._container.getAttribute('data-getter');
        if(getter.indexOf('get') !== 0)
            getter = ['get', getter[0].toUpperCase(), getter.slice(1)].join('');

        if(!(getter in this._fontData) || typeof this._fontData[getter] !== 'function')
            throw new Error('Unknown getter "' + _getter + '"'
                        + (getter !== _getter
                                    ? '(as "' + getter + '")'
                                    : '')
                        +'.');
        return this._fontData[getter](fontIndex);
    };

    _p._getValue = function(fontIndex) {
        var value;
        if(this._options.getValue !== null)
            // This is a rude way to enhance this
            return this._options.getValue.call(this, fontIndex);
        value = this._defaultGetValue(fontIndex);
        if(typeof value.length === 'number' && typeof value !== 'string')
            value = Array.prototype.join.call(value, ', ');
        return value;
    };

    _p._onActivateFont = function(fontIndex) {
        this._container.textContent = this._getValue(fontIndex);
    };

    return GenericFontDataWidget;
});
