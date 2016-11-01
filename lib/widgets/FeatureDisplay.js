define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
) {
    "use strict";

    function FeatureDisplay(container, pubSub, fontsData, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._webFontProvider = webFontProvider;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._contentElements = [];
        this._bluePrintNode = null;
        this._originalBluePrintNode = null;
        this._itemParentContainer = null;
        this._setBluePrintNode();
    }


    var _p = FeatureDisplay.prototype = Object.create(Parent.prototype);
    _p.constructor = FeatureDisplay;

    FeatureDisplay.defaultOptions = {
        bluePrintNodeClass: 'feature-display__item-blueprint'
      , itemTagClassPrefix: 'feature-display__item-tag_'
      , itemBeforeClass: 'feature-display__item__before'
      , itemAfterClass: 'feature-display__item__after'
      , itemTagNameClass: 'feature-display__item__tag-name'
      , itemFriendlyNameClass: 'feature-display__item__friendly-name'
      , itemTagNameTag: 'h3'
      , itemFriendlyNameTag: 'p'
    };

    _p._setBluePrintNode = function() {
        var node = this._container.getElementsByClassName(
                                    this._options.bluePrintNodeClass)[0]
          , itemParentContainer
          , basicBlueprintChildren = [
                [this._options.itemTagNameTag
                            , this._options.itemTagNameClass]
              , [this._options.itemFriendlyNameTag
                            , this._options.itemFriendlyNameClass]
              , ['div', this._options.itemBeforeClass]
              , ['div', this._options.itemAfterClass]

            ]
          , i, l
          ;
        if(node) {
            // I expect the blueprint class to be "display: none"
            itemParentContainer = node.parentNode;
            this._originalBluePrintNode = node;
            node = node.cloneNode(true);
            node.style.display = null;
            this._applyClasses(node, this._options.bluePrintNodeClass, true);
        }
        else {
            // not found, create a basic blueprint node
            itemParentContainer = this._container;
            node = this._container.ownerDocument.createElement('div');
            for(i=0,l=basicBlueprintChildren.length;i<l;i++) {
                node.appendChild(this._container.ownerDocument.createElement(
                                                basicBlueprintChildren[i][0]));
                this._applyClasses(node.lastChild,  basicBlueprintChildren[i][1]);
            }
        }
        this._bluePrintNode = node;
        this._itemParentContainer = itemParentContainer;
    };

    /**
     *  Applicable features:
     *        -> optional features
     *        -> have an example text entry
     *        -> present in the font
     */
    _p._getApplicableFeatures = function(fontIndex) {
        var fontFeatures = this._fontsData.getFeatures(fontIndex)
          , availableFeatureTags = Object.keys(fontFeatures)
          , allFeatures = OTFeatureInfo.getSubset('optional', availableFeatureTags)
          , tag, order = []
          , i, l
          , result = []
          ;
        for(tag in allFeatures) {
            if(!allFeatures[tag].exampleText)
                continue;
            order.push(tag);
        }



        order.sort();
        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            result.push([tag, allFeatures[tag]]);
        }
        return result;
    };

    function _mapToClass(parent, class_, func, thisArg) {
        var items = parent.getElementsByClassName(class_)
          , i, l
          ;
        for(i=0,l=items.length;i<l;i++)
            func.call(thisArg || null, items[i], i);
    }

    _p._createFeatureItem = function(fontIndex, tag, feature) {
        var item = this._bluePrintNode.cloneNode(true);

        _mapToClass(item, this._options.itemBeforeClass, function(item, i) {
            /*jshint unused:vars, validthis:true*/
           item.textContent = feature.exampleText;
           this._webFontProvider.setStyleOfElement(fontIndex, item);
        }, this);

        _mapToClass(item, this._options.itemAfterClass, function(item, i) {
            /*jshint unused:vars, validthis:true*/
           item.textContent = feature.exampleText;
           this._webFontProvider.setStyleOfElement(fontIndex, item);
           item.style.fontFeatureSettings = '"' + tag + '" '
                            + (feature.onByDefault ? '0' : '1');
        }, this);

        _mapToClass(item, this._options.itemTagNameClass, function(item, i) {
            /*jshint unused:vars*/
            item.textContent = tag;
        }, this);

        _mapToClass(item, this._options.itemFriendlyNameClass, function(item, i) {
            /*jshint unused:vars*/
            item.textContent = feature.friendlyName;
        }, this);

        return item;
    };

    _p._createFeatureItems =function (fontIndex, features) {
        // create new _contentElements
        var i, l, tag, feature, item
          , items = []
          ;
        for(i=0,l=features.length;i<l;i++) {
            tag = features[i][0];
            feature = features[i][1];

            item = this._createFeatureItem(fontIndex, tag, feature);
            this._applyClasses(item, this._options.itemTagClassPrefix + tag);
            this._itemParentContainer.appendChild(item);

            if(this._originalBluePrintNode)
                 this._itemParentContainer.insertBefore(item, this._originalBluePrintNode);
            else
                this._itemParentContainer.appendChild(item);

            items.push(item);
        }
        return items;
    };

    _p._onActivateFont = function(fontIndex) {
        var i, features;
        for(i=this._contentElements.length-1;i>=0;i--)
            this._contentElements[i].parentNode.removeChild(this._contentElements[i]);
        features = this._getApplicableFeatures(fontIndex);
        this._contentElements = this._createFeatureItems(fontIndex, features);
    };


    return FeatureDisplay;
});
