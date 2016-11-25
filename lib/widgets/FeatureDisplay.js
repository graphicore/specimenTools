define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
) {
    "use strict";

    /**
     * FeatureDisplay creates small cards demoing OpenType-Features found
     * in the font.
     * It searches it's host element for elements that have the CSS-class
     * `{bluePrintNodeClass}`. These blueprint nodes will be cloned and
     * augmented for each feature that is feasible to demo.
     * The cloned and augmented feature-cards will be inserted at the place
     * where the bluprint-node is located.
     * Since the bluprint-node is never removed, it should be set to
     * `style="display:none"`.
     * If more than one blueprint nodes are found, all are treated as described above.
     * If no blueprint node is found, a basic blueprint-node is generated
     * and appended to the host container.
     *
     * A blueprint node can define child elements with the follwing CSS-Classes
     * and behavior:
     *
     * `{itemTagNameClass}`: the element.textContent will be set to the
     *              feature tag name, like "dlig"
     * `{itemFriendlyNameTag}`: the element.textContent will be set to the
     *              friendly feature name, like "Discretionary Ligatures"
     * `{itemBeforeClass}`: the element.textContent will be set to the
     *              example text for the feature. The element.style will
     *              be set to the currently active webfont.
     * `{itemAppliedClass}`: like `{itemBeforeClass}` except that the element.style
     *              will also be set to activate feature for the webfont.
     *
     * See _p_getApplicableFeatures below for a description how features
     * are selected for display and where the example texts are located.
     */
    function FeatureDisplay(container, pubSub, fontsData, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._webFontProvider = webFontProvider;
        this._pubSub.subscribe('activateFont'
                                     , this._onActivateFont.bind(this));
        this._contentElements = [];
        this._itemParentContainer = null;
        this._bluePrintNodes = this._getBluePrintNodes(
                                this._options.bluePrintNodeClass, true);




        this._feaureItemsSetup = this._options.feaureItemsSetup
                    ? this._prepareFeatureItems(this._options.feaureItemsSetup)
                    : []
                    ;
        this._defaultFeaureItemsCache = Object.create(null);
    }

    var _p = FeatureDisplay.prototype = Object.create(Parent.prototype);
    _p.constructor = FeatureDisplay;

    FeatureDisplay.defaultOptions = {
        bluePrintNodeClass: 'feature-display__item-blueprint'
      , itemTagClassPrefix: 'feature-display__item-tag_'
      , itemBeforeClass: 'feature-display__item__before'
        // used to be: itemAfterClass: 'feature-display__item__after'
      , itemAppliedClass: 'feature-display__item__applied'
      , itemTagNameClass: 'feature-display__item__tag-name'
      , itemContenTextClass: 'feature-display__item__content_text'
      , itemContenStackedClass: 'feature-display__item__content_stacked'
      , itemFriendlyNameClass: 'feature-display__item__friendly-name'
      , feaureItemsSetup: null
        // "complement" (default): use default feature items if
        //        no item for a feature is in feaureItemsSetup
        // true/truish: use all default feature items
        // false/falsy: don't use any default feature items
        // Todo: could also be a list of feature-tags for which default
        // items should be added, if available
      , useDefaultFeatureItems: 'complement'


    };

    _p._getBluePrintNodes = function(className) {
        var nodes = this._container.getElementsByClassName(className)
          , i, l, node
          , result = []
          ;

        if(nodes.length) {
            for(i=0,l=nodes.length;i<l;i++) {
                // I expect the blueprint class to be "display: none"
                node = nodes[i].cloneNode(true);
                result.push([nodes[i], node]);
                node.style.display = null;
                this._applyClasses(node, className, true);
            }
        }
        return result;
    };

    /**
     *  Available Features:
     *        -> optional features
     *        -> present in the font
     */
    _p._getAvailableFeatures = function(fontIndex) {
        var fontFeatures = this._fontsData.getFeatures(fontIndex)
          , availableFeatures = OTFeatureInfo.getSubset('optional', Object.keys(fontFeatures))
          , order =  Object.keys(availableFeatures).sort()
          , tag, i, l
          , result = []
          ;
        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            result.push([tag, availableFeatures[tag]]);
        }
        return result;
    };

    _p._getDefaultFeatureItems = function(availableFeatures, filterFunc) {
        var i, l, result = [], tag, data, item;
        for(i=0,l=availableFeatures.length;i<l;i++) {
            tag = availableFeatures[i][0];
            data = availableFeatures[i][1];
            if(!data.exampleText)
                continue;
            if(filterFunc && !filterFunc(tag))
                continue;
            item = this._defaultFeaureItemsCache[tag];
            if(!item) {
                // this should be enough to recreate the original display items
                item = this._prepareFeatureItem([{
                    type: 'text'
                  , behavior: 'show-before'
                  , features: tag
                  , content: data.exampleText
                }]);
                this._defaultFeaureItemsCache[tag] = item;
            }
            result.push(item);
        }
        return this._prepareFeatureItems(result);
    };


    /**
     * Decorator to inverse a filter function.
     *
     * ```
     * inputItems = ['a', 'b', 'c', 'd', 'e', 'f']
     * s = new Set(['a', 'b', 'c'])
     * inputItems.filter(s.has, s)
     * > [ 'a', 'b', 'c' ]
     * inputItems.filter(inverseFilter(s.has, s))
     * > [ 'd', 'e', 'f' ]
     * // also:
     * inputItems.filter(inverseFilter(s.has), s)
     * ```
     */
    function inverseFilter(filterFunc/*, thisArg*/) {
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        return function(element, index, array) {
            "use strict";
            return !filterFunc.call(thisArg !== void 0 ? thisArg : this
                                                , element, index, array);
        }
    }

    _p._onActivateFont = function(fontIndex) {
        var featureItems
          , usedFeatures
          , availableFeatures
          , availableFeaturesTags
          , i, l
          , filterFunc
          ;
        for(i=this._contentElements.length-1;i>=0;i--)
            this._contentElements[i].parentNode.removeChild(this._contentElements[i]);

        availableFeatures = this._getAvailableFeatures(fontIndex);
        availableFeaturesTags = new Set();
        availableFeatures.forEach(function(item) {
                                availableFeaturesTags.add(item[0]); });
        // all features used by the featureItems must be available in the font
        function filterAvailableFeatureItems(featureItem) {
            var i,l;
            for(i=0,l=featureItem.features.length;i<l;i++)
                if(!availableFeaturesTags.has(featureItem.features[i]))
                    return false;
            return true;
        }

        featureItems = this._feaureItemsSetup
                           // filter also copies this._feaureItemsSetup
                           // this is important! We will change the
                           // featureItems array later.
                           .filter(filterAvailableFeatureItems);

        if(this._options.useDefaultFeatureItems) {
            // add default
            filterFunc = null;
            if(this._options.useDefaultFeatureItems === 'complement') {
                // all available features that are not yet in featureItems
                usedFeatures = new Set();
                for(i=0,l=featureItems.features.length;i<l;i++)
                    featureItems.features.forEach(usedFeatures.add, usedFeatures);
                             // `inverseFilter` takes care of the "not yet
                             // in featureItems" part; as if there was
                             // a `usedFeatures.hasNot` method.
                filterFunc = inverseFilter(usedFeatures.has, usedFeatures);
            }
            Array.prototype.push.apply(featureItems
                , this._getDefaultFeatureItems(availableFeatures, filterFunc));
        }

        if(featureSortfunction)
            // the default should be by weight -> name, where the default weight is 0
            // and the name is alphabetically first of all features per item
            featureItems.sort(featureSortfunction);
        this._contentElements = this._buildFeatures(fontIndex, featureItems);
    };


/*
We'll need a list of feature items
feature items can represent on and more features
all features represented by an item must be present in the font
The default is probably what we have now, maybe becoming more sophisticated when we have more styles.

A feature item has one or more content items.
Content items can have different behaviors (what they do with the content)
and different styles.

The type of the Content Items describes how it handles the content (=behavior)
The style is a property of a Content Item, and can be a totally different
code than styles of the same item.
The idea/hope is that inputing a setup gets easier for the user eventually

feature_1, feature_2
    itemType
        style, content
    itemType
        style, content
    itemType
        style, content


ItemType and style seems to be arbitrary
but as a kind of "main style" item type could be available
it would indicate what style options/arguments are available.

So, probably a `command options ...` style would suffice, per "item in a feature"
Then, we just need to figure out how to mark up content.

Looks like a markdown like This is *highlighted* text. Would suffice

subs, sups
    text -f subs -c "H*2*O"
    text -f sups -c "see Footnote*7*"

TODO: make the explicit usage of features in the item disappear OR make the
explicit usage in the feature item disappear, and derrive that from the items.

{
    text -f subs -c "H*2*O"
    text -f sups -f smcp -c "Footnote*7*"
    // OR: text sups, smcp -c "Footnote*7*" <= the comma would indicate that the
                                            next item belongs to the list
    text -f frac -show-before -c "1/2"
    text -f frac -show-before -c "1/4"
}


now we got a lot of duplication to display many items with the same setup, but different content
Thus:

text -f frac -show-before -c "1/2", "1/4"


stacked -f ss01 -c "g" <- would be nice, but if we write it possible, but it's
                        harder to align and if we draw it, we need to know the replacement:


stacked -f ss01 -align right -c "g"
(the svg text element has the "text-anchor" attribute with the values "start|middle|end"
which may be very helpful, we'd still need to move the text elements into view, I suppose.
(But we do so anyways for the <text> element.
start == left aligned end == right aligned in LTR mode.


{
    text -f subs -c "H*2*O"
  , text -f sups -f smcp -c "Footnote*7*"
  // OR: text -f sups, smcp -c "Footnote*7*"}


{
    text -f frac --show-before -c "1/2", "1/4"
}
// -s == --source
// -f == --features
// -c == --content
{
    stacked -f ss01 -s "G" -c "G.ss01"
  , stacked -f ss02 -s "g" -c "g.ss02"
  , stacked -f ss03 -s "R" -c "R.ss03"
  , stacked -f ss04 -s "l" -c "l.ss04"
}




[
    {
        type: "text"
      , features: "subs"
      , content: "H*2*O"
    }
  , {
        type: "text"
      , features: "sups"
      , content: "Footnote*7*"
    }
]



[
    {
        type: "stacked"
      , features: "ss01"
      , content: "G"
    }
  , {
        type: "stacked"
      , features: "ss02"
      , content: "g"
    }
  , {
        type: "stacked"
      , features: "ss03"
      , content: "R"
    }
  , {
        type: "stacked"
      , features: "ss04"
      , content: "l"
    }
]




// tabular -f tnum -c "3.145678"
[{
    type: "tabular"
  , features: "tnum"
  , content: "3.145678"
}]


FIXME: can remove "source" field probably...
[{
    type: "stacked"
  , features: "ss01"
  , content: "G"
}]



content item types:
    show-before <- could be a flag
    highlighted <- could be available for all content (if supported?)
    stacked <- stacks contents over each other, as we can see in the ss0x diagram
    tabular <- make a outline after each char to illustrate monospacedness

feature-display__item-text
    > can be 'show-before' (feature-display__item-text_show-before?)
                then needs: itemBeforeClass: 'feature-display__item__before'
    > if not 'show-before', {itemBeforeClass} should be removed, also, everything that
      is related ...
    > the feature-applied content goes to: itemAppliedClass: 'feature-display__item__applied'
    > can be 'tabular' (feature-display__item-text_tabular)
      each char in the input text gets its own box, so we can style it
      will not apply highlight markup, because that's complex

feature-display__item-stacked
    > uses an svg, rather no too detailed blueprint needed
      but we need to know where to put the svg.

*/
    _p._simpleMarkupAddItem = function (doc, element, type, text) {
        var textNode, node;
        textNode = doc.createTextNode(text.join(''));
        switch(type){
            case('highlight'):
                node = doc.createElement('span');
                this.applyClasses(node, this._options.highlightClasses);
                node.appendChild(textNode);
                break;
            default:
                node = textNode;
        }
        element.appendChild(node);
    };

    _p._simpleMarkup = function (doc, text) {
        var i, l, type
          , parent = doc.createDocumentFragment()
          , currentText = []
          ;
        for(i=0,l=text.length;i<l;i++) {
                                  // a backslash escapes the asterix
            if(text[i] !== '*' || text[i] === '\\' && text[i + 1] === '*') {
                if(text[i] === '\\')
                    i += 1;
                currentText.push(text[i]);
                continue;
            }
            if(currentText.length) {
                this._simpleMarkupAddItem(doc, parent, type, currentText);
                currentText = [];
            }
            type = type === null ? 'highlight' : null;
        }

        if(currentText.length)
            this._simpleMarkupAddItem(parent, type, currentText);
        return parent;
    };

    function __collectFeatures(item) {
       //jshint validthis: true
       // this is a Set
       var features = typeof item.features === 'string'
                    ? [item.features]
                    : item.features
        , i, l
        ;
        for(i=0,l=features.length;i<l;i++)
            this.add(features[i]);
    }

    _p._prepareFeatureItem = function(setup) {
            var features = new Set()
             , item = {
                contents: setup
              , features: null

            };
            item.contents.forEach(__collectFeatures, features);
            item.features = Array.from(features);
            return item;
    };

    _p._prepareFeatureItems = function(setup) {
        var i, l, featureItems = [];
        for(i=0,l=setup.length;i<l;i++)
            featureItems.push(this._prepareFeatureItem(setup[i]));
        return featureItems;
    };


    // if this._options.useDefaults ?
    // or: if !this._options.feaureItems!
    // There could also be an option to use the defaults if no feaureItems
    // are defined for an existing feature. But: where to insert them?
    // maybe we can just append them and then have an optional sort function
    // by weight (if specified otherwise weight = 0) then feature name


   catch all, if no more specialzed blueprint element is available:
   mdlfs-feature-display__item-blueprint

   only for stacked items


   only for text items

    for featureItemSetup
        for blueprintNode
            createFeatureItem featureItemSetup blueprintNode.clone(true)
                for contentSteup
                    create contentItem(contentSteup)
                    insertInto
            insertBefore(featureItem, blueprintNode)
            activateConents



    function _mapToClass(parent, class_, func, thisArg) {
        var items = parent.getElementsByClassName(class_)
          , i, l
          ;
        for(i=0,l=items.length;i<l;i++)
            func.call(thisArg || null, items[i], i);
    }

    _p._createTextContentItem = function(bluePrintNode, fontIndex, tag, feature) {
        var item = bluePrintNode.cloneNode(true);

        _mapToClass(item, this._options.itemBeforeClass, function(item, i) {
            /*jshint unused:vars, validthis:true*/
           item.textContent = feature.exampleText;
           this._webFontProvider.setStyleOfElement(fontIndex, item);
        }, this);

        _mapToClass(item, this._options.itemAppliedClass, function(item, i) {
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
    /**
     * setup = {
     *      type: "text"
     *    , features: "tag" || ["tag", "tag", ...]
     *    , content: "sample text"
     *    , behavior: "show-before" || "tabular" ||  falsy
     * }
     *
     * behavior: 'tabular' and `falsy` are both removing the "before" elements from the blueprint
     *
     */
    _p._textTypeFactory = function(contenSetup, contentTemplate, fontIndex) {
        var element
          , item = {
                element: null
              , onHasDocument: false
            };


    /**
    <div class="mdlfs-feature-display__item__content_text">
        <!-- removed if not in `show-before` mode-->
        <div class="mdlfs-feature-display__item__before"></div>
        <div class="material-icons mdlfs-feature-display__item__change-indicator">arrow_downward</div>
        <!-- end removed -->
        <div class="mdlfs-feature-display__item__applied"></div>
    </div>
    */

        // create and fill the contentTemplates for this contenSetup
        element = contentTemplate.clone(true);

        // probably _createTextContentItem will be merged into this function
        this._createTextContentItem(element);

        ...
        item.element = element;



        return item;
    }

    _p._stackedTypeFactory = function(contenSetup, contentTemplate, fontIndex) {
        var element
          , item = {
                element: null
              , onHasDocument: function(){...}
            }
          ;
    /**
    <div class="mdlfs-feature-display__item__content_stacked">
        >>><SVG><<<
    </div>
    */
        return item;
    };

    _p._factories = {
        stacked: '_stackedTypeFactory'
      , text: '_textTypeFactory'
    }

    _p._getContentFactory = function(contentSetup) {
        var factory = this._factories(contentSetup.type);
        if(typeof factory === 'string')
            factory = this[factory];
        if(!factory)
            throw new Error('FeatureDisplay: Factory for "'
                                + contentSetup.type + '" is not implemented.');
        return factory;
    };

      <div class="mdlfs-feature-display__item-blueprint mdlfs-feature-display__item"
       style="display:none">
    <h2>Feature: <span class="mdlfs-feature-display__item__tag-name"></span></h2>

    <div class="mdlfs-feature-display__item__content_text">
        <!-- removed if not in `show-before` mode-->
        <div class="mdlfs-feature-display__item__before"></div>
        <div class="material-icons mdlfs-feature-display__item__change-indicator">arrow_downward</div>
        <!-- end removed -->
        <div class="mdlfs-feature-display__item__applied"></div>
    </div>

    <div class="mdlfs-feature-display__item__content_stacked">
        >>><SVG><<<
    </div>

    <div class="mdlfs-feature-display__item__friendly-name"></div>
  </div>

    _p.getElementFromBluePrint = function(bluePrintNode) {
        // Could be done once for the blueprint node,
        // But to much caching can cause maintenance trouble as well.
        var element = bluePrintNode.clone(true)
          , contentTemplates = Object.create(null)
          , templateElements
          , contentTypes = {
                text: this._options.itemContenTextClass)
              , stacked: this._options.itemContenStackedClass
            }
          , key
          ;

        // get content templates
        for(key in contentTypes) {
            templateElements = element.getElementsByClassName(
                                                        contentTypes[key]);
            // use the last found element
            if(templateElements.length)
                contentTemplates[key] = templateElements[templateElements.length-1];
        }

        // delete all children
        while(element.childNodes.length)
            element.removeChild(element.lastChild);

        return {
            element: element
          , contentTemplates: contentTemplates
        }
    }

    _p._buildFeatureItem = function(setup, bluePrintNode, fontIndex) {
        var elementData = this._getElementFromBluePrint(bluePrintNode)
          , element = elementData.element
          , contents = []
          , item = {
                element:element
              , contents: contents
            }
          , i,l, contenItem, builtItems, contentTemplate
          , factory
          ;

        for(i=0,l=setup.contents.length;i<l;i++) {
            contenSetup = setup.contents[i];
            if(!contenSetup.type in elementData.contentTemplates)
                continue;

            contentTemplate = elementData.contentTemplates[contenSetup.type];
            factory = this._getContentFactory(contenSetup);
            contentItem = factory.call(this, contenSetup, contentTemplate
                                                            , fontIndex);

            element.appendChild(contentItem.element)
            contents.push(contentItem);
        }

        return item;
    };

    _p._buildFeatureItems = function (featureItem, fontIndex) {
        var i, l, itemParentContainer
          , originalBluePrintNode, bluePrintNode, node
          , elements = []
          ;

        for(i=0,l=this._bluePrintNodes.length;i<l;i++) {
            originalBluePrintNode = this._bluePrintNodes[i][0];
            bluePrintNode = this._bluePrintNodes[i][1];
            item = this._buildFeatureItem(featureItem, bluePrintNode
                                                            , fontIndex);
            if(!item.contents.length)
                continue;
            // insert at blueprint node position
            originalBluePrintNode.parentNode.insertBefore(item.element
                                                , originalBluePrintNode);
            for(i=0,l=item.contents.length;i<l;i++) {
                if(item.contents[i].onHasDocument)
                    // so the item can gather actual size information, i.e.
                    // some svg based contents need this
                    item.contents[i].onHasDocument();
            }
            elements.push(item.element);
        }
        return elements;
    };

    _p._buildFeatures = function(fontIndex, featureItems) {
        var i, l, setup, items, elements = [];
        for (i=0,l=featureItems.length;i<l;i++) {
            setup = featureItems[i];
            Array.prototype.push.apply(elements,
                           this._buildFeatureItems(setup, fontIndex);
        }
        return elements;
    };

    return FeatureDisplay;
});
