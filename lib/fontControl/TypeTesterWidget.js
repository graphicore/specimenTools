define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/fontData/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
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
          , features: {
                containers: []
              , active: {}
              , buttons: null
              , tags: null
            }
        };

        this._activeFeatures = Object.create(null);
        this.__switchFeatureTagHandler =  this._switchFeatureTagHandler.bind(this);

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
      , optionalFeatureButtonClasses: ''
      , defaultFeatureButtonClasses: ''
      , activateFeatureControls: null
      , setFeatureButtonActiveState: function(element, isActive) {
            var label = element.textContent;
            if('+-'.indexOf(label.slice(-1)) !== -1)
                label = label.slice(0, -1);
            else
                label = label + ' ';
            element.textContent = label + (isActive ? '+' : '-');
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

        this._controls.fontsize.push({
                                      container: container
                                    , input: input
                                    });
    };

    _p._initFeaturesControl = function(element) {
        this._controls.features.containers.push(element);
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
                this[initFunc](containers[i]);
            if(afterInit)
                afterInit();
        }
    };

    _p._switchFeatureTagHandler = function(evt) {
        var tag = evt.target.getAttribute('data-feature-tag')
          , type, cssFeatureValue
          , active = this._controls.features.active
          ;
        if(tag in active)
            delete active[tag];
        else {
            type = this._getFeatureTypeByTag(tag);
            if(type === 'default')
                cssFeatureValue = '0';
            else if(type === 'optional')
                cssFeatureValue = '1';
            else
                return;
            active[tag] = cssFeatureValue;
        }
        this._setFeatureButtonsState();
        this._setFeatures();
        this._applyValues();
    };

    _p._setFeatures = function() {
        var active = this._controls.features.active
          , buttons = this._controls.features.buttons
          , values = []
          , tag
          ;
        for (tag in active) {
            // if there is a button for the tag, we currently control it
            if(tag in buttons)
                values.push('"' + tag + '" ' + active[tag]);
        }
        this._values['font-feature-settings'] = values.join(', ');
    };

    _p._updateFeatureControlContainer = function(container, type /* "optional" | "default" */, features, order) {
        var doc = container.ownerDocument
          , tag, i, l, feature, label, button
          , uiElementsToActivate = []
          ;

        if(!order) order = Object.keys(features).sort();

        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            feature = features[tag];
            label = [tag, feature.friendlyName].join(': ');
            button = doc.createElement('button');
            button.textContent = label;
            button.setAttribute('data-feature-tag', tag);
            this._applyClasses(button, this._options[type + 'FeatureButtonClasses']);
            button.addEventListener('click', this.__switchFeatureTagHandler);
            container.appendChild(button);
            uiElementsToActivate.push(button);
            if(!(tag in this._controls.features.buttons))
                this._controls.features.buttons[tag] = [];
            this._controls.features.buttons[tag].push(button);
            // TODO: set this button to it's active state
            // maybe a general function after all buttons have been created
        }
        return uiElementsToActivate;
    };

    _p._getFeatureTypeByTag = function(tag) {
        var tags = this._controls.features.tags;
        if('default' in tags && tag in tags.default.features)
            return 'default';
        else if('optional' in tags && tag in tags.optional.features)
            return 'optional';
        else
            return null;
    };

    _p._updateFeatureControls = function(fontIndex) {
        // updata feature control ...
        var fontFeatures = this._fontsData.getFeatures(fontIndex)
          , availableFeatureTags = Object.keys(fontFeatures)
          , type
          , tags = {
                'optional': null
              , 'default': null
            }
          , i, l
          , featureData = this._controls.features
          , uiElements, uiElementsToActivate = []
          , featureContainers
          ;

        // delete old tag => buttons registry
        featureData.buttons = Object.create(null);
        // these are all the features we care about
        featureData.tags = tags;


        // collect the features available for each category (type)
        for(type in tags) {
            tags[type] = {
                features: OTFeatureInfo.getSubset(type, availableFeatureTags)
              , order: null
            };
            tags[type].order =  Object.keys(tags[type].features).sort();
        }


        featureContainers = featureData.containers;
        for(i=0,l=featureContainers.length;i<l;i++) {
            while(featureContainers[i].children.length)
                featureContainers[i].removeChild(featureContainers[i].lastChild);
            for(type in tags) {
                uiElements = this._updateFeatureControlContainer(
                                                  featureContainers[i]
                                                , type, tags[type].features
                                                , tags[type].order);
                // Could also just push all buttons?
                // This is used, at the moment, to let mdlFontSpecimen activate
                // these items via this._options.activateFeatureControls
                // OK would be if _updateFeatureControlContainer would return
                // the a list of relevant elements. BUT: it is hard to determine
                // which level is relevant. For MDL just the
                // plain buttons would be fine, so maybe I should stick with this.
                Array.prototype.push.apply(uiElementsToActivate, uiElements);
            }
        }
        if(this._options.activateFeatureControls)
            this._options.activateFeatureControls.call(uiElementsToActivate);
        // We could reset active features that are no longer available:
        // But for now we don't, remembering old settings between font
        // switching.
        //for(k in this._activeFeatures)
        //    if(!(k in features))
        //        delete this._activeFeatures[k]
        this._setFeatureButtonsState();
    };

    _p._setFeatureButtonsState = function() {
        var tag, active, buttons, buttonIsActive
          , featureData = this._controls.features
          , type, i, l
          ;

        for(tag in featureData.buttons) {
            buttons = featureData.buttons[tag];
            active = tag in featureData.active;
            type = this._getFeatureTypeByTag(tag);
            if(type === "default")
                // The button state should be "inactive" if this is a
                // default feature. Because, the default state is activated
                buttonIsActive = !active;
            else if(type === "optional")
                // button state and tag active state correlate
                buttonIsActive = active;
            else
                // don't know what to do (shouldn't happen unless we implment more tags)
                continue;
            for(i=0,l=buttons.length;i<l;i++)
                this._options.setFeatureButtonActiveState.call(this, buttons[i], buttonIsActive);
        }
    };

    _p._onActivateFont = function(fontIndex) {
        this._updateFeatureControls(fontIndex);
        this._setFeatures();
        this._applyValues();
    };

    return TypeTesterWidget;
});
