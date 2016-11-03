define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
) {
    "use strict";

    /**
     * TypeTester provides interfaces that help to test the current webfont.
     * See the CurrentWebFont widget.
     *
     * The interfaces provided are:
     *
     * - A font-size changing range input.
     *      Use the CSS-class configured at `fontSizeControlsClass` on a host
     *      element for the range input element.
     *      There are options to configure the range input element:
     *              `fontSizeRangeInputMin`
     *              `fontSizeRangeInputMax`
     *              `fontSizeRangeInputValue`
     *              `fontSizeRangeInputStep`
     *              `fontSizeRangeInputUnitType`
     * - An element displaying the current font size:
     *      Use the CSS-class configured at `fontSizeIndicatorClass`
     *      the `element.textContent` of elements matching this class will
     *      be set to the current font size of the TypeTester widget.
     * - Switches to deactivate OpenType-Features that are activeated by default.
     *      Use the CSS-class configured at `defaultFeaturesControlsClass`
     *      to have a de-/activating button appended to the host element
     *      for each OpenType Feature that is active by default.
     *      Initial button state is active.
     * - Switches to activate OpenType-Features that are optional.
     *      Use the CSS-class configured at `optionalFeaturesControlsClass`
     *      to have a de-/activating button appended to the host element
     *      for each OpenType Feature that is optional.
     *      Initial button state is inactive.
     * - An element that receives the settings made by the elements described above.
     *      Use the CSS-class configured at `contentContainerClass` to have
     *      the element.style set to the fontSize and fontFeatureSettings
     *      made by the control elements of this widget.
     *
     *      To use the current font on this element, see the CurrentWebFont
     *      widget.
     *      To enable the users typing text themselves use either the DOM
     *      attribute `contenteditable=True` or use a `<textarea>` element.
     *
     */
    function TypeTester(container, pubSub, fontsData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;

        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

        this._contentContainers = this._container
                    .getElementsByClassName(this._options.contentContainerClass);

        this._controls = {
            fontsize: []
          , fontSizeIndicator: []
          , features: {
                containers: Object.create(null)
              , active: Object.create(null)
              , buttons: null
              , tags: null
            }
        };

        this._activeFeatures = Object.create(null);

        this._values = Object.create(null);
        this.__fontSizeInputHandler = this._fontSizeInputHandler.bind(this);
        this._initControls();
        this._applyValues();
    }

    var _p = TypeTester.prototype = Object.create(Parent.prototype);
    _p.constructor = TypeTester;

    TypeTester.defaultOptions = {
        fontSizeControlsClass: 'type-tester__font-size'
      , fontSizeIndicatorClass: 'type-tester__font-size-indicator'
      , fontSizeRangeInputClasses: []
      , fontSizeRangeInputMin: 10
      , fontSizeRangeInputMax: 128
      , fontSizeRangeInputValue: 32
      , fontSizeRangeInputStep: 1
      , fontSizeRangeInputUnitType: 'px'
      , optionalFeaturesControlsClass: 'type-tester__features--optional'
      , defaultFeaturesControlsClass: 'type-tester__features--default'
      , contentContainerClass: 'type-tester__content'
      , setFontSizeToInput: function(input, value) {
            input.value = value;
        }
      , optionalFeatureButtonClasses: ''
      , defaultFeatureButtonClasses: ''
      , activateFeatureControls: null
      , featureButtonActiveClass: 'active'
    };

    _p._fontSizeInputHandler = function(evt) {
        this._setFontSize(evt.target.value);
        this._applyValues();
    };

    _p._setFontSize = function(value) {
        var i, l
          , valueUnit = [value, this._options.fontSizeRangeInputUnitType]
          ;
        for(i=0,l=this._controls.fontsize.length;i<l;i++)
            this._options.setFontSizeToInput.call(
                            this, this._controls.fontsize[i].input, value);

        for(i=0,l=this._controls.fontSizeIndicator.length;i<l;i++)
            this._controls.fontSizeIndicator[i].textContent = valueUnit.join(' ');

        this._values['font-size'] = valueUnit.join('');
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

    _p._initFeaturesControl = function(element, type) {
        if(!(type in this._controls.features.containers))
            this._controls.features.containers[type] = [];
        this._controls.features.containers[type].push(element);
        element.addEventListener('click',  this._switchFeatureTagHandler.bind(this, element));
    };

    _p._initFontSizeIndicator = function(element) {
        this._controls.fontSizeIndicator.push(element);
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
                    , ['_initFontSizeControl']
                    , this._setFontSize.bind(this, this._options.fontSizeRangeInputValue)
                ]
              , fontSizeIndicator: ['fontSizeIndicatorClass', ['_initFontSizeIndicator']]
              , optionalFeatures: ['optionalFeaturesControlsClass', ['_initFeaturesControl', 'optional']]
              , defaultFeatures: ['defaultFeaturesControlsClass', ['_initFeaturesControl', 'default']]
            }
          , afterInit = []
          , containerClass, initFunc, initFuncArgs, containers, key, i, l
          ;
        for(key in setup) {
            containerClass = setup[key][0];
            initFunc = setup[key][1][0];
            initFuncArgs = setup[key][1].slice(1);
            if(setup[key][2])
                afterInit.push(setup[key][2]);
            containers = this._container.getElementsByClassName(this._options[containerClass]);
            for(i=0,l=containers.length;i<l;i++)
                this[initFunc].apply(this, [containers[i]].concat(initFuncArgs));
        }
        // running these after all initializations, so `fontSizeIndicator`
        // gets initialized by the call to `_setFontSize` of `fontsize`
        for(i=0,l=afterInit.length;i<l;i++)
            afterInit[i]();
    };

    _p._switchFeatureTagHandler = function(container, evt) {
        var tag = null
          , active = this._controls.features.active
          , type, cssFeatureValue, button
          ;
        // first find the feature tag
        button = evt.target;
        while(button && button !== container) {
            if(button.hasAttribute('data-feature-tag')) {
                tag = button.getAttribute('data-feature-tag');
                break;
            }
            button = button.parentElement;
        }
        if(tag === null)
            return;

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

        // delete old ...
        for(i=container.children.length-1;i>=0;i--) {
            if(type === container.children[i].getAttribute('data-feature-type'))
                container.removeChild(container.children[i]);
        }
        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            feature = features[tag];
            label = [tag, feature.friendlyName].join(': ');
            button = doc.createElement('button');
            button.textContent = label;
            button.setAttribute('data-feature-tag', tag);
            button.setAttribute('data-feature-type', type);
            this._applyClasses(button, this._options[type + 'FeatureButtonClasses']);
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
          , typesOrder = ['default', 'optional']
          , i, l, j, ll
          , featureData = this._controls.features
          , uiElements, uiElementsToActivate = []
          , featureContainers
          , features, order
          ;

        // delete old tag => buttons registry
        featureData.buttons = Object.create(null);
        // these are all the features we care about
        featureData.tags = Object.create(null);


        // collect the features available for each category (type)
        for(i=0,l=typesOrder.length;i<l;i++) {
            type = typesOrder[i];
            features = OTFeatureInfo.getSubset(type, availableFeatureTags);
            order = Object.keys(features).sort();
            featureData.tags[type] = {
                features: features
              , order: order
            };

            featureContainers = featureData.containers[type] || [];
            for(j=0,ll=featureContainers.length;j<ll;j++) {
                uiElements = this._updateFeatureControlContainer(
                                                  featureContainers[j]
                                                , type, features
                                                , order);
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
            this._options.activateFeatureControls.call(this, uiElementsToActivate);
        // We could reset active features that are no longer available:
        // But for now we don't, remembering old settings between font
        // switching.
        //for(k in this._activeFeatures)
        //    if(!(k in features))
        //        delete this._activeFeatures[k]
        this._setFeatureButtonsState();
    };

    _p._setFeatureButtonActiveState = function(element, isActive) {
        this._applyClasses(element, this._options.featureButtonActiveClass, !isActive);
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
                this._setFeatureButtonActiveState.call(this, buttons[i], buttonIsActive);
        }
    };

    _p._onActivateFont = function(fontIndex) {
        this._updateFeatureControls(fontIndex);
        this._setFeatures();
        this._applyValues();
    };

    return TypeTester;
});
