define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    var weight2weightNames = {
            250: 'Thin'
          , 275: 'ExtraLight'
          , 300: 'Light'
          , 400: 'Regular'
          , 500: 'Medium'
          , 600: 'SemiBold'
          , 700: 'Bold'
          , 800: 'ExtraBold'
          , 900: 'Black'
        }
      , weight2cssWeight = {
            250: '100'
          , 275: '200'
          , 300: '300'
          , 400: '400'
          , 500: '500'
          , 600: '600'
          , 700: '700'
          , 800: '800'
          , 900: '900'
        }
      ;

    function FamilyControlInterface(container, pubSub, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;

        this._switches = [];
        this._switchesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._switchesContainer);

        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._pubSub.subscribe('allFontsLoaded', this._onAllFontsLoaded.bind(this));
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

        this._fonts = [];
        this._activeFont = null;
        this._familiesData = null;
        this._fontData = null;
        this._familyElements = null;
    }

    var _p = FamilyControlInterface.prototype = Object.create(Parent.prototype);
    _p.constructor = FamilyControlInterface;

    FamilyControlInterface.defaultOptions = {

    };

    _p._otherStyle = function otherStyle(style) {
        return style === 'normal' ? 'italic' : 'normal';
    };

    _p._onLoadFont = function (i, fontFileName, font) {
        this._fonts[i] = font;
    };

    _p._getFamiliesData = function(countAll) {
        /*jshint unused:vars*/
        // organize fonts
        var families = Object.create(null)
          , font, weightDict, styleDict
          , fontFamily, fontWeight, isItalic, fontStyle
          , i, l
          ;
        for(i=0,l=this._fonts.length;i<l;i++) {
            font = this._fonts[i];


            fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;
            fontFamily=fontFamily.split('-')[0];

            // between 200 and 900
            fontWeight = font.tables.os2.usWeightClass;
            isItalic = !!(font.tables.os2.fsSelection & font.fsSelectionValues.ITALIC);

            fontStyle = isItalic ? 'italic' : 'normal';
            weightDict = families[fontFamily];
            if(!weightDict)
                families[fontFamily] = weightDict = Object.create(null);

            styleDict = weightDict[fontWeight];
            if(!styleDict)
                weightDict[fontWeight] = styleDict = Object.create(null);

            // assert(fontStyle not in weightDict)
            styleDict[fontStyle] = i;
        }

        return Object.keys(families).sort()
              .map(function(key){ return [key, this[key]];}, families);
    };

    _p._switchItalic = function(evt) {
        var fontData = this._fontData[this._activeFont]
         , fontId
         ;

        // did not change anything
        if(evt.target.checked && fontData.style === 'italic')
            return;

        if(!fontData || fontData.otherStyle === null)
            // the second case shouldn't really happen, because the
            // italic switch should be inactive or not available.
            return;
        fontId = fontData.otherStyle;
        this._pubSub.publish('activateFont', fontId);
    };

    _p._switchFont = function(familyIndex, weight) {
        // get Font Id ...
        var currentStyle = this._activeFont !== null
                ? this._fontData[this._activeFont].style
                : 'normal'
          , styleDict = this._familiesData[familyIndex][1][weight]
          , fontId = currentStyle in styleDict
                // if the family is well organized, this is the expected case
                ? styleDict[currentStyle]
                // fringe again, family has not all styles for all fonts
                : styleDict[this._otherStyle(currentStyle)]
          ;
        this._pubSub.publish('activateFont', fontId);
    };

    function applyClasses(element, classes) {
        element.classList.add.apply(element.classList, classes);
    }

    _p._makeItalicSwitch = function() {
        var doc = this._container.ownerDocument
          , italicSwitch = {}
          ;
        italicSwitch.container = doc.createElement('label');
        applyClasses(italicSwitch.container, this._options.italicSwitchContainerClasses);

        italicSwitch.checkbox = doc.createElement('input');
        italicSwitch.checkbox.setAttribute('type', 'checkbox');
        applyClasses(italicSwitch.checkbox, this._options.italicSwitchCheckboxClasses);
        italicSwitch.checkbox.addEventListener('change', this._switchItalic.bind(this));

        italicSwitch.label = doc.createElement('span');
        italicSwitch.label.textContent = 'italic';
        italicSwitch.label.classList.add('mdl-switch__label');
        applyClasses(italicSwitch.label, this._options.italicSwitchLabelClasses);

        italicSwitch.container.appendChild(italicSwitch.checkbox);
        italicSwitch.container.appendChild(italicSwitch.label);

        return italicSwitch;
    };

    // TODO!!
    _p._makeFamilyElement = function(familyIndex, familyName, weightDict) {
        var weights = Object.keys(weightDict).sort() // default text-sort should suffice here
          , familyHasTwoStyles = false
          , weight, label
          , result = Object.create(null)
          , doc = this._container.ownerDocument
          , titleElement, weightsElement, weightButton
          , i, l
          ;

        result.weights = Object.create(null);
        result.element = doc.createElement('div');
        titleElement = doc.createElement('h3');
        titleElement.textContent = familyName;
        result.element.appendChild(titleElement);


        for(i=0,l=weights.length;i<l;i++) {
            weight = weightDict[weights[i]];
            if('normal' in weight && 'italic' in weight) {
                familyHasTwoStyles = true;
                break;
            }
        }

        if(familyHasTwoStyles) {
            // make italic checkbox/control
            result.italicSwitch = this._makeItalicSwitch();
            result.element.appendChild(result.italicSwitch.container);
        }

        weightsElement = doc.createElement('div');
        for(i=0,l=weights.length;i<l;i++) {
            weight = weights[i];
            // add weight selection button
            weightButton = doc.createElement('button');
            label = weight2cssWeight[weight] + ' ' + weight2weightNames[weight];
            weightButton.textContent = label;
            weightButton.addEventListener('click', this._switchFont.bind(this, familyIndex, weight));
            weightsElement.appendChild(weightButton);
            result.weights[weight] = weightButton;
        }
        result.element.appendChild(weightsElement);

        return result;
    };

    _p._getFontData = function(familiesData) {
        var fontData = []
          , familyIndex, fontIndex, l, familyName, weightDict, weight
          , styleDict, style, otherStyle
          ;

        for(familyIndex=0,l=familiesData.length;familyIndex<l;familyIndex++) {
            familyName = familiesData[familyIndex][0];
            weightDict = familiesData[familyIndex][1];
            for(weight in weightDict) {
                styleDict = weightDict[weight];
                for(style in styleDict) {
                    fontIndex = styleDict[style];
                    otherStyle = styleDict[this._otherStyle(style)];
                    otherStyle = otherStyle !== undefined ? otherStyle : null;

                    fontData[fontIndex] = {
                        familyIndex: familyIndex
                      , weight: weight
                      , style: style
                        // basically the style link:
                      , otherStyle: otherStyle
                    };
                }
            }
        }
        return fontData;
    };

    _p._onAllFontsLoaded = function(countAll) {
        /*jshint unused:vars*/
        var familiesData = this._getFamiliesData()
          , familyElements = []
          , i, l
          ;
        for(i=0,l=familiesData.length;i<l;i++) {
            familyElements[i] = this._makeFamilyElement(i, familiesData[i][0]
                                                         , familiesData[i][1]);

            // put all family elements into the FamilyController block
            this._container.appendChild(familyElements[i].element);
        }
        this._familiesData = familiesData;
        this._fontData = this._getFontData(familiesData);
        this._familyElements = familyElements;
    };

    _p._activateFont = function(i) {
        // this will call this._onActivateFont
        this._pubSub.publish('activateFont', i);
    };

    _p._setWeightButton = function(weightButton, isActive){
        weightButton.classList[isActive ? 'add' : 'remove']('active');
    };

    _p._setItalicSwitch = function(italicSwitch, enabled, checked) {
        italicSwitch.checkbox.disabled = !enabled;
        italicSwitch.checkbox.checked = checked;
    };

    _p._setFamilyElement = function(familyElement, isActive) {
        familyElement.classList[isActive ? 'add' : 'remove']('active');
    };

    _p._onActivateFont = function(fontIndex) {
        // this should only change the view, not emit signals
        // make the button(s) enabled/disabled and active/inactive etc.
        var fontData = this._fontData[fontIndex]
          , familyIndex = fontData.familyIndex, familyIdx, l
            // all families: check/uncheck italic switches
          , italicChecked = fontData.style === 'italic'
          , italicSwitch, italicEnabled
          , weights, weight, weightActive, familyActive
          ;
        for(familyIdx=0,l=this._familyElements.length;familyIdx<l;familyIdx++) {
            familyActive = familyIdx === familyIndex;
            this._setFamilyElement(this._familyElements[familyIdx].element, familyActive);

            // set the state to all italic switches
            italicSwitch = this._familyElements[familyIdx].italicSwitch;
            if(italicSwitch) {
                // can only be enabled when its family is active.
                // AND there must be another style to switch to
                italicEnabled = familyIdx === familyIndex && fontData.otherStyle;
                this._setItalicSwitch(italicSwitch, italicEnabled, italicChecked);
            }

            // set the active weight button active and all others inactive
            weights = this._familyElements[familyIdx].weights;
            for(weight in weights) {
                weightActive = familyIdx === familyIndex && weight === fontData.weight;
                this._setWeightButton(weights[weight], weightActive);
            }
        }
        this._activeFont = fontIndex;
    };

    return FamilyControlInterface;
});
