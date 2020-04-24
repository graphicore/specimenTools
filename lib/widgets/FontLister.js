/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    /**
     * Very basic <select> interface to switch between all loaded fonts.
     * See FamilyChooser for a more advanced interface.
     */

    function FontLister(container, pubSub, fontData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontData;

        this._elements = [];
        this._selectContainer = this._container.ownerDocument.createElement('select');
        this._selectContainer.addEventListener('change', this._selectFont.bind(this));
        this._selectContainer.enabled = false;
        this._container.appendChild(this._selectContainer);

        this._pubSub.subscribe('allFontsLoaded', this._updateOptions.bind(this));
        this._pubSub.subscribe('loadFont', this._updateOptions.bind(this));
        this._pubSub.subscribe('unloadFont', this._updateOptions.bind(this));

        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }
    var _p = FontLister.prototype = Object.create(Parent.prototype);
    _p.constructor = FontLister;

    FontLister.defaultOptions = {
        order: 'load' // OR: 'family'
    };

    _p._onActivateFont = function (fontId) {
        var options = this._selectContainer.options;
        for(let i=0,l=options.length;i<l;i++) {
            let option = options[i];
            option.selected = option.value === fontId;
        }
    };

    _p._updateOptions = function() {
        var fonts
          , i, l, option, fontId
          , selected = this._selectContainer.value
          ;

        switch(this._options.order) {
            case 'family':
                fonts = this._fontsData.getFontIdsInFamilyOrder();
                break;
            case 'load':
                /* falls through */
            default:
                fonts = this._fontsData.getFontIds();
        }

        for(let element of this._elements)
            if(element.parentNode)
                element.parentNode.removeChild(element);
        this._elements.slice(0,Infinity);

        for(i=0,l=fonts.length;i<l;i++) {
            fontId = fonts[i];
            option = this._selectContainer.ownerDocument.createElement('option');
            option.textContent = [
                        this._fontsData.getFamilyName(fontId)
                      , this._fontsData.getStyleName(fontId)
                      ].join(' ');

            option.value = fontId;
            option.selected = selected === fontId;
            this._elements.push(option);
            this._selectContainer.appendChild(option);
        }
        this._selectContainer.enabled = true;
    };

    _p._selectFont = function(event) {
        this._pubSub.publish('activateFont', event.target.value);
    };

    return FontLister;
});
