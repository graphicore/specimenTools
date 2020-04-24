define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/PubSub'
  , 'specimenTools/initWidgets'
  , 'specimenTools/services/dom-tool'
], function(
    Parent
  , PubSub
  , initWidgets
  , domTool
) {
    "use strict";
    /*jshint esnext:true*/

    /**
     * Load sub-specimen from a selection menu.
     */
    function SubSpecimenController(container, pubSub, fontsLoadState
                            , remoteLoader, widgetDependencies, options) {
        Parent.call(this, options);

        this._container = container;
        this._pubSub = pubSub;
        // used to initate a sub-specimen
        this._fontsLoadState = fontsLoadState;
        this._remoteLoader = remoteLoader;

        // should this._subPubSub publish to this._pubSub?
        // e.g. to activate a different font?
        this._subPubSub = new PubSub();

        // expecting an html <template> element:
        this._templates = this._container.getElementsByTagName('template')[0];
        if(this._templates)
            this._templates = this._templates.content;

        this._subWidgetDependencies = Object.create(widgetDependencies);
        this._subWidgetDependencies.pubsub = this._subPubSub;

        this._activeSpecimen = null;
        this._subSpecimen = new Map(Array.from(this._container
                    .getElementsByClassName('sub-specimen_ctrl__specimen'))
        .map((element,i)=>{
            let id = `${i}_${element.getAttribute('data-specimen-name')}`;
            element.addEventListener('click',()=>this._activateSpecimen(id));
            return [id, element];
        }));

        // It's crucial that this controller knows what information to
        // pass on to its active sub-specimen and what not, also, what
        // to do itself and what to pass forward from parent...
        // fontsData seems to be a candidate to pass on from parent.
        // also webfontProvider. To be honest, the child specimen will
        // define their dependencies, we don't know anything about these
        // here ...
        // in a main.js these dependencies are explicit and injected via
        // the factories ... this must go on in subSpecimen as well!
        // ALso: fix: add filesLoaded, files ans fonts are not the same
        // etc. events. onFileLoaded it can be attempted to load a font
        // e.g. with opentype.js
        // This all needs to be institutionalized! Especially, we need
        // a source that reliably replays all events in a way that we
        // end up with the correct state.


        this[Parent.$DESTRUCTORS] = [
            this._pubSub.subscribeAll(this._onAllEvents.bind(this))
          , ()=>this._deactivateSpecimen()
        ];

        this._injectionDataSources = new Map(
            (this._container.getAttribute('data-inject-datasource') || '')
            .split(';;')
            // "{target name}:{content address}"
            // where: {content address} = {address-source type}:{address}
            // e.g. data-inject-datasource="constants:HTTP-get-json:content/font_testing/includes/latin/constants-latin.json">
            .map(description=> {
                description = description.trim();
                if(!description) return;
                var separator = ':'
                  , index = description.indexOf(separator)
                  , targetName = index >= 0
                               ? description.slice(0, index)
                               : description
                  , address = index >= 0
                            ? description.slice(index + separator.length)
                            : ''
                  , loadArgs = []
                  ;
                targetName = targetName.trim(targetName);
                address = address.trim(address);
                if(address.indexOf('HTTP-get-json:') === 0)
                    // FIXME: using deepFreeze here because eventually
                    // _setDataToNamespace could mess with the loaded
                    // original data and produce hard to find side effects
                    // It could be an option to protect within
                    // _setDataToNamespace from modifying original data.
                    // e.g. to throw an error when such a thing is attempted.
                    // I prefer not to do defensive copies, unless, it
                    // could even be seen as a feature, to be able to
                    // define the namespace that deeply.
                    loadArgs.push(true/* deepFreeze*/ );
                return([targetName, this._remoteLoader.load(address, ...loadArgs)
                    .then(result=>this._injectionDataSources.set(targetName, result)
                          , error=> {
                              console.warn(`[${this.constructor.name}] `
                                  + `Can't load ${targetName} at ${address}: ${error}`);
                              throw error;
                          }
                    )
                ]);
            })
            // remove empty entries
            .filter(item=>!!item));
        if(this._options.injectionData) {
            for(let [k, v] of Object.entries(this._options.injectionData)) {
                if(this._injectionDataSources.has(k))
                    // as this comes in as an option I think it should
                    // be possible to override, however it may not make
                    // much sense.
                    continue;
                this._injectionDataSources.set(k, v);
            }
        }


        // OK, no we may have to wait for these results before we can
        // actually activate specimen...

        // initally activate the first specimen
        for(let id of this._subSpecimen.keys()) {
            this._activateSpecimen(id);
            break;
        }
    }

    var _p = SubSpecimenController.prototype = Object.create(Parent.prototype);
    _p.constructor = SubSpecimenController;

    SubSpecimenController.defaultOptions = {
        // An object og key:values where keys can be used to address
        // data that can be injected into child widgets. Values can be
        // also Promises.
        injectionData: null
        // used for addressing via CSS plus attr data-specimen-name:
        // `${this._options.specimenBaseClass}__{specimenElement.getAttribute('data-specimen-name')}`
      , specimenBaseClass: 'specimen'
    };

    _p._onAllEvents = function(event, ...message) {
        this._subPubSub.publish(event, ...message);
    };

    // ... TODO ... !!!

    // FIXME: once initialized, the widget could be kept, that way
    // contenteditable changed texts persist between switching pages
    // this is the original behavior of the font testing pages and
    // should be honored. could add an optional reset(reload) button to
    // reset, i.e. the behavior right now.
    _p._deactivateSpecimen = function() {
        if(!this._activeSpecimen)
          return;
        let [containers, widgets] = this._activeSpecimen;
        for(let widget of widgets) widget.destroy();
        containers.forEach(domTool.removeNode);
        this._activeSpecimen = null;
    };

    _p._initTemplateElement = function(element, templatesFragment
                                              , seenMarkers=new Set()
                                              , elementsSet=new Set()) {
        // <!-- template: .font-testing-short -->
        // get all comment nodes that start with "template:"

        // The default behavior is to treat template elements as the
        // documentFragments at their content property and all other
        // elements as they are.
        // Using "template-element:" as marker will include template elements
        // as a the actual element. All other nodes are treated as they are.
        // To get the contents of a regular element e.g. a selector can be
        // created with ".element-class>*", but that would not select
        // comments etc.
        var templateMarker = 'template:'
          , templateElementasNodeMarker = 'template-element:'
          ;
        for(let markerComment of domTool.getMarkerComments(element
                        , trimmedText=>trimmedText.indexOf(templateElementasNodeMarker) === 0
                                      || trimmedText.indexOf(templateMarker) === 0)) {
            if(seenMarkers.has(markerComment))
                continue;
            let markerText = markerComment.textContent.trim()
              , useTemplateAsFragment = markerText.indexOf(templateMarker) === 0
              , marker = useTemplateAsFragment ? templateMarker : templateElementasNodeMarker
              , templateSelector = markerText.slice(marker.length).trim()
              // this will be recursive
              , elementsFragment = this._loadTemplate(templatesFragment
                    , templateSelector, useTemplateAsFragment, elementsSet, seenMarkers)
              ;
            domTool.insertAfter(elementsFragment, markerComment);
            // this disables the marker for this run!;
            seenMarkers.add(markerComment);
        }
    };

    _p._loadTemplate = function(templatesFragment, templateSelector
                    , useTemplateAsFragment=true, elementsSet=new Set()
                                                , seenMarkers=new Set()) {
        var templates = Array.from(templatesFragment.querySelectorAll(templateSelector))
          , elements = []
          ;
        if(!templates.length)
            console.warn(`The selector ${templateSelector} did not match any templates.`);
        for(let item of templates) {
            if(elementsSet.has(item)) {
                // don't do recursion
                console.warn('Template self includes (recursion loop) in'
                                    , item, 'selector:', templateSelector);
                continue;
            }
            elementsSet.add(item);
            let element;
            if(useTemplateAsFragment && item.tagName === 'TEMPLATE')
                element = item.content.cloneNode(true);
            else
                element = item.cloneNode(true);
            // this is recursive
            this._initTemplateElement(element, templatesFragment, seenMarkers, elementsSet);
            elementsSet.delete(item);
            elements.push(element);
        }
        return domTool.createFragment(elements, false);
    };

    function _setDataToNamespace(targetNamespace, targetPath, data) {
        if(!targetPath.length)
            return;
        let lastKey = targetPath.slice(-1)[0]
            // Either we should not allow keys like __proto__!
            // or just use Object.create(null).
            // this is basically the= mkdir -p part.
          , lastEntry = targetPath.slice(0, -1).reduce(
                  (namespace, key)=> key in namespace
                                ? namespace[key]
                                : namespace[key]=Object.create(null)
                , targetNamespace)
          ;
        lastEntry[lastKey] = data;
    }

    // FIXME: conceptually it would be much better to create one
    // dependencies namespace per *widget* instead of per *container*
    // as a container can host many widgets and this can cause a namespace
    // clash!
    _p.dependenciesForContainer = function (injectData, container) {
        var namespace = Object.create(null);
        for(let [widgetsSelectorString, targetPath, data] of injectData) {
            if(!container.matches(widgetsSelectorString)) {
                continue;
            }
            _setDataToNamespace(namespace, targetPath, data);
        }
        return namespace;
    };

    _p._initSpecimen = function(id, contentMethod, content) {
        var specimenElement = this._subSpecimen.get(id)
          , templateSelector = specimenElement.getAttribute('data-template-selector')
          , insertedNodes
          , useTemplateAsFragment = true // true if it is a <template> otherwise use the nodes!
          , subContainerFragment =  templateSelector
                ? this._loadTemplate(this._templates, templateSelector, useTemplateAsFragment)
                : domTool.createFragment([])
          , dependenciesForContainerFn = null
          ;
        switch(contentMethod) {
            case 'address':
                // content is a documentFragment
                domTool.insertAtMarkerComment(subContainerFragment, 'insert: content', content);
            break;
            case 'inject':
                // content is the result of _getInjectData
                // widgetsSelectorString, targetPath, data
                dependenciesForContainerFn = this.dependenciesForContainer.bind(this, content);
            break;
        }

        insertedNodes = Array.from(subContainerFragment.childNodes);

        insertedNodes.forEach(node=>{
            if(!node.classList)
                return;
            let base = this._options.specimenBaseClass
              , tail = specimenElement.getAttribute('data-specimen-name')
              ;
            node.classList.add(`${base}__${tail}`);
        });

        domTool.insertAtMarkerComment(this._container, 'insert: specimen', subContainerFragment);
        // this selector is not needed if all sub-speciment are
        // in <template> elements, because these won't be
        // initiated by init widgets.
        var filterNodes = null // subContainer.getElementsByClassName('sub-specimen_ctrl__specimen')
          , [widgets /*, elements*/] = initWidgets(insertedNodes
                                    , this._subWidgetDependencies, filterNodes, dependenciesForContainerFn);

        this._activeSpecimen = [insertedNodes, widgets];

        // this could be a general service, after this, the global
        // pubsub can be used again.
        // post creation handlers must be configurable, per controller,
        // maybe per specimen setup as well
        // i.e. mdl: componentHandler.upgradeElements([container]);
        // see widgetsAPI.init!
        this._fontsLoadState.publish(this._subPubSub);
    };

    // ATTR data-inject-map:
    // triples separated by ;; of:
    // widget(s) css-selector; source property path; dependency injection name
    // CAUTION: separated by semi-colon, because css-selectors can contain colons!
    // if "dependency injection name" contains dots, these a) could be
    // resolved by initWidgets _getDependencies. For this to work,
    // but also to enable complete mapping of source property path to
    // dependency injection name, we need to create objects from
    // paths that contain dots, similar to mkdir -p (make parent directories
    // as needed).
    // i.e.: data-inject-map=".font-testing-short;constants.GRUMPY.adhesionShort;data;;
    //                        .font-testing-long;constants.GRUMPY.adhesionLong;data;"
    //
    // returns a [list of triples]
    // a triple: [widgetsSelectorString, targetPath, data]
    _p._getInjectData = function(injectMapString) {
        var injectMap = new Map()
          , promises = []
          ;

        injectMapString.split(';;')
        .map(triple=>triple.trim().split(';').map(str=>str.trim()))
        .filter(triple=>{
            if(triple.length !== 3) {
                if(triple.length)
                    console.warn(`data-inject-map triple is invalid: "${triple.join(';')}"`);
                return false;
            }
            return true;
        })
        .forEach(([widgetsSelectorString, sourcePropertyPathString, dependencyInjectionName])=>{
            // needs to resolve sourcePropertyPath
            // Collect all sourcePropertyPaths that read from the same source!
            var [sourceKey, ...sourcePropertyPath] = sourcePropertyPathString.split('.');

            if(!injectMap.has(sourceKey))
                injectMap.set(sourceKey, []);
            injectMap.get(sourceKey).push([widgetsSelectorString, sourcePropertyPath
                                         , dependencyInjectionName]);
        });

        for(let sourceKey of injectMap.keys()) {
            if(!this._injectionDataSources.has(sourceKey))
                return Promise.reject(new Error(`Key not found in data sources: ${sourceKey}`));
            promises.push(Promise.resolve(this._injectionDataSources.get(sourceKey)));
        }
        return Promise.all(promises).then(()=>{
            var result = [];
            for(let [sourceKey, rules] of injectMap) {
              for(let [widgetsSelectorString, sourcePropertyPath
                                , dependencyInjectionName] of rules) {
                let targetPath = dependencyInjectionName.split('.')
                  , data = sourcePropertyPath.reduce((object, key)=>{ // jshint ignore:line
                        if(!(key in object))
                            throw new Error('Path not found '
                              + `${sourcePropertyPath.join('.')} in ${sourceKey}.`);
                        return object[key];
                    } , this._injectionDataSources.get(sourceKey))
                ;
                // firstKey is the key in targetNamespace where the data
                // is located.
                result.push([widgetsSelectorString, targetPath, data]);
              }
            }
            return result;
        });
    };

    _p._activateSpecimen = function(id) {
        // to prevent a no content situation, deactivate could happen
        // when the new data is available and ready to switch over, or we
        // could show some kind of loading screen (spinning hourglass or so).
        this._deactivateSpecimen();

        // TODO:
        // * different methods for different values of data-content-method
        // * if required: wait for the promises/result of _injectionDataSources

        var specimenElement = this._subSpecimen.get(id)
          , contentMethod = specimenElement.getAttribute('data-content-method')
          ;
        switch(contentMethod) {
            case "address":
                var contentAddress = specimenElement.getAttribute('data-content-address');
                // OK so this is interesting because the source that needs this
                // kind of options is always HTML-(part)-text. A JSON is not
                // sanitized by DOMPurify! But in this case, we know that we
                // load something as HTML I guess, we know because of the way we
                // are using the loaded result:
                //    domTool.insertAtMarkerComment(subContainer, 'insert: content', docFragment);.
                return this._remoteLoader.load(contentAddress, {
                            ADD_TAGS: ['#comment'] // keep komments
                          , ADD_ATTR: ['contenteditable'] // keep content editable
                    })
                    .then(content=>this._initSpecimen(id, contentMethod, content));
            case "inject":
                return this._getInjectData(specimenElement.getAttribute('data-inject-map'))
                    .then(content=>this._initSpecimen(id, contentMethod, content));
            case null:
                this._initSpecimen(id, null, null);
                return;
            default:
                console.warn(`[${this.constructor.name}] unkonwn `
                           + `data-content-method ${contentMethod};`);
                break;
        }


        // not yet activated ...
        // CAUTION: there's a race condition, where a user selects another
        // widget while one is loading. In that case
        // container could be filled at this point with ready to go
        // widget html, but that would mean we know where to get the template
        // from. If we do that here, we don't need special specimen classes.
        //
        // the question how remote/sub specimen are defined, configured,
        // loaded and initialized is the main question that we have here!
        // maybe a first step would be to create some different kinds of
        // widgets and see how they work:

        // -> template element from a templates container -> produces widget node
        // -> remote templates container, picking templates element from within
        // -> remote markdown text -> produces widget node
        // -> remote .htmlPart file, fully functioning  -> include contents into widget node
        // -> markdown text from a templates elememt -> include contents into widget node
        //
        // e.g. a .htmlPart file can contain a whole specimen, even a
        //        reference to a sub-specimen .htmlPart and alsp remote
        //        markdown widgets.
        // hence, a .htmlPart file could contain a template element (widget)
        // OR maybe just be treated like a template element (type=text/template)
        //
        // TODO: write examples of whatever looks promising above and then
        //       implement until it works.

                                  // SpecimenClass could differ on how it produces
                                  // the actual template/widgets within its container
                                  // e.g. load htmlPart/markdown files frome external?
        //this._activeSpecimen = new SpecimenClass(container, this._subPubSub,
                    /* ...DI-value perhaps global or local to this controller (pubsub) e.g.
                     * fontsData, webfontProvider, loadedFiles, loadedFonts etc! ! */
                     // setup.options);

        // once the remote content was loaded ...
        // e.g. then((specimen)=>{...
        //    if(specimen !== this._activeSpecimen)
        //        // the specimen was changed before async initialization
        //        // could be finished
        //        return;
        //    ...

        // run inside SpecimenClass ?
        // funny, a widget that loads remote content has to return a
        // promise to signal when it's ready!


        // ... very much like what is done in the typical main function ...
        // ... then needs to replay all the necessary load protocol events
        //     this enures uniform specimen activation.
        //     some considerations:
        //         fsStateEntries is kept up to date, hence, a sub-specimen could
        //         use it to replay the needed load protocol events ...
        //         for(let [id, fontInfo] of fsStateEntries)
        //           pubsub.publish('prepare', id, fontInfo.name, this.countAll)
        //         for(let [id, fontInfo] of fsStateEntries)
        //          pubsub.publish('loadFont', id, fontFileName, font, fontArraybuffer);
        //         if(this.countAll)
        //           pubsub.publish('allFontsLoaded' , this.countAll)
        //         pubsub.publish('activateFont' , activeFont)
    };

    return SubSpecimenController;
});
