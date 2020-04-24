/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";


        // These are all used enable removing loaded fonts.
        // For css-connected rules (oldschool, via a @font-face rule
        // _url and _cssRule are stored, but it looks like that way
        // of loading fonts is not needed anymore.
    const _url = Symbol('url')
        , _cssRule = Symbol('cssRule')
        , _fontFace = Symbol('fontFace')
        // used for a cache
        , _props = Symbol('props')
        ;

    /**
     * WebFontProvider takes the original arraybuffer of the loaded fonts
     * and adds it as a Web-Font—i.e. as loaded with @font-face—to the
     * document.
     *
     * The values for CSS 'font-style', 'font-weight' and 'font-family'
     * are taken from the font directly, via the FontData service and
     * there via opentype.js.
     *
     * The public method `setStyleOfElement(fontID, element)`
     * sets the element.style so that the web font with fontID is
     * displayed.
     *
     * The public method `getStyleProperties(fontID)` returns a string
     * of CSS properties that would make the font with fontID being
     * displayed.
     */
    function WebFontProvider(window, pubsub, fontData, options) {
        Parent.call(this, options);
        this._window = window;
        this._pubSub = pubsub;
        this._fontData = fontData;

        this[Parent.$DESTROY]=[
            this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this))
          , this._pubSub.subscribe('unloadFont', this._onUnloadFont.bind(this))
        ];
        this._data = {};

        this.__stylesheet = null;
    }

    var _p = WebFontProvider.prototype = Object.create(Parent.prototype);
    _p.constructor = WebFontProvider;

    WebFontProvider.defaultOptions = {
    };

    Object.defineProperty(_p, '_styleSheet', {
        get: function() {
            if(!this.__stylesheet) {
                var elem = this._window.document.createElement('style');
                // seems like Webkit needs this,it won't do any harm anyways.
                elem.appendChild(this._window.document.createTextNode(''));
                this._window.document.head.appendChild(elem);
                this.__stylesheet = elem.sheet;
            }
            return this.__stylesheet;
        }
    });

    _p._makeWebfont = function(fontID) {
        var arrBuff = this._fontData.getOriginalArraybuffer(fontID)
          , familyName = this._fontData.getCSSFamilyName(fontID)
          , weight = this._fontData.getCSSWeight(fontID)
          , style = this._fontData.getCSSStyle(fontID)
          , fontface, url, blob, styleData
          ;

        this._data[fontID] = styleData = Object.create(null);
        styleData['font-style'] = style;
        styleData['font-weight'] = weight;
        styleData['font-family'] = familyName;
        Object.defineProperty(styleData, '_props', {
            value: null
          , enumerable: false
          , writable: true
        });

        if('FontFace' in this._window) {
            // more modern and direct
            fontface = new this._window.FontFace(familyName, arrBuff,{
                        weight: weight
                      , style: style
                    });
            this._window.document.fonts.add(fontface);
            styleData[_fontFace] = fontface;
        }
        else {
            // oldschool, a bit bloated, probably outdated
            // https://www.w3.org/TR/css-font-loading-3/#css-connected
            // to remove, the css @font-face rule must be removed
            blob = new this._window.Blob([arrBuff], { type: 'font/opentype' });
            url = this._window.URL.createObjectURL(blob);
            styleData[_url] = url;
            let ruleIndex = this._styleSheet.insertRule([
                    '@font-face {'
                , this.getStyleProperties(fontID)
                , 'src: url(' + url + ');'
                , '}'
                ].join(''), this._styleSheet.cssRules.length);
            styleData[_cssRule] = this._styleSheet.cssRules[ruleIndex];
        }
    };

    _p._removeWebfont = function(fontID) {

        var styleData = this._data[fontID];
        if(!styleData)
            return;
        if('FontFace' in this._window) {
            let fontface = styleData[_fontFace];
            this._window.document.fonts.delete(fontface);
        }
        else {
            // oldschool, a bit bloated, probably outdated
            let cssRule = styleData[_cssRule];
            for(let ruleIndex=0,l=this._styleSheet.cssRules.length;ruleIndex<l;ruleIndex++) {
                if(this._styleSheet.cssRules[ruleIndex] === cssRule) {
                    this._styleSheet.deleteRule(ruleIndex);
                    break;
                }
            }
            let url = styleData[_url];
            this._window.URL.revokeObjectURL(url);
        }
        delete this._data[fontID];
    };

    _p._onUnloadFont = function(fontID) {
         this._removeWebfont(fontID);
    };

    _p._onLoadFont = function(fontID) {
        // If the fontID is already loaded, we want to delete it first,
        // this is a reload.
        if(fontID in this._data)
            this._removeWebfont(fontID);
        this._makeWebfont(fontID);
    };

    /**
     * use this in the style attribute or in css rules
     */
    _p.getStyleProperties = function(fontID) {
        var data = this._data[fontID]
          , props, propName
          ;
        if(!data)
            throw new Error('fontID "' + fontID + '" is not loaded.');
        props = data[_props];
        if(!props) {
            props = [];
            for(propName in data)
                props.push(propName, ': ', data[propName], ';');
            data[_props] = props = props.join('');
        }
        return props;
    };

    _p.setStyleOfElement = function(fontID, element) {
        var data = this._data[fontID]
          , propName
          ;
        if(!data) {
            console.error('fontID "' + fontID + '" is not loaded.');
            return;
        }
        for(propName in data) {
            element.style[this._cssName2jsName(propName)] = data[propName];
        }
    };

    return WebFontProvider;
});
