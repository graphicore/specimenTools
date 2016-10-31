define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    function CurrentWebFont(container, pubSub, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._webFontProvider = webFontProvider;
        this._pubSub = pubSub;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = CurrentWebFont.prototype = Object.create(Parent.prototype);
    _p.constructor = CurrentWebFont;

    CurrentWebFont.defaultOptions = {
    };

    _p._onActivateFont = function(fontIndex) {
        this._webFontProvider.setStyleOfElement(fontIndex, this._container);
    };

    return CurrentWebFont;
});
