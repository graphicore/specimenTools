define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    function TypeTesterWidget(container, pubSub, fontsData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;

        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

        this._contentContainers = this._container
                    .getElementsByClassName(this._options.contentContainerClass);

        this._controls = {
            fontsize: []
          , features: []
        };
        this._values = Object.create(null);
        this.__fontSizeInputHandler = this._fontSizeInputHandler.bind(this);
        this._initControls();
        this._applyValues();
    }

    var _p = TypeTesterWidget.prototype = Object.create(Parent.prototype);
    _p.constructor = TypeTesterWidget;

    TypeTesterWidget.defaultOptions = {
        fontSizeControlsClass: 'type-tester__font-size'
      , fontSizeRangeInputClasses: []
      , fontSizeRangeInputMin: 10
      , fontSizeRangeInputMax: 128
      , fontSizeRangeInputValue: 32
      , fontSizeRangeInputStep: 1
      , fontSizeRangeInputUnitType: 'px'
      , featuresControlsClass: 'type-tester__features'
      , contentContainerClass: 'type-tester__content'
      , setFontSizeToInput: function(input, value) {
            input.value = value;
        }
    };

    _p._fontSizeInputHandler = function(evt) {
        this._setFontSize(evt.target.value);
        this._applyValues();
    };

    _p._setFontSize = function(value) {
        var i, l;
        for(i=0,l=this._controls.fontsize.length;i<l;i++)
            this._options.setFontSizeToInput.call(
                            this, this._controls.fontsize[i].input, value);
        this._values['font-size'] = value + this._options.fontSizeRangeInputUnitType;
    };

    _p._initFontSizeControl = function(container) {
        var input = this._container.ownerDocument.createElement('input')
          , k
          , attributes = {
                min: 'fontSizeRangeInputMin'
              , max: 'fontSizeRangeInputMax'
              // initially set via _setFontSize
              // , value: 'fontSizeRangeInputValue'
              , step: 'fontSizeRangeInputStep'
            }
          ;
        input.setAttribute('type', 'range');
        this._applyClasses(input, this._options.fontSizeRangeInputClasses);
        for(k in attributes)
            input.setAttribute(k, this._options[attributes[k]]);
        container.appendChild(input);
        input.addEventListener('input', this.__fontSizeInputHandler);
        return {
            container: container
          , input: input
        };
    };

    _p._initFeaturesControl = function(container) {
        //peters fucking interface!!
    };

    _p._applyValues = function() {
        var i, l, container, k;
        for(i=0,l=this._contentContainers.length;i<l;i++) {
            container = this._contentContainers[i];
            for(k in this._values)
                container.style[this._cssName2jsName(k)] = this._values[k];
        }
    };

    _p._initControls = function() {
        var setup = {
                fontsize: [
                      'fontSizeControlsClass'
                    , '_initFontSizeControl'
                    , this._setFontSize.bind(this, this._options.fontSizeRangeInputValue)
                ]
              , features: ['featuresControlsClass', '_initFeaturesControl']
            }
          , containerClass, initFunc, containers, key, i, l, afterInit
          ;
        for(key in setup) {
            containerClass = setup[key][0];
            initFunc = setup[key][1];
            afterInit = setup[key][2];
            containers = this._container.getElementsByClassName(this._options[containerClass]);
            for(i=0,l=containers.length;i<l;i++)
                this._controls[key].push(this[initFunc](containers[i]));
            if(afterInit)
                afterInit();
        }
    };

    _p._onActivateFont = function(fontIndex) {

    };

    return TypeTesterWidget;
});
