define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
  , 'specimenTools/initDocumentWidgets'
], function(
    Parent
  , dom
  , initWidgets
) {
    "use strict";

    /* jshint esnext:true*/


    /**
     * We need a unsubscribe method from pubsub.
     * Least invasive is if InterfaceController does this for us,
     * because then we don't have to add a destroy method to all the
     * children widgets (which they don't have so far).
     */
    var ChildPubSub = (function() {
    function ChildPubSub(pubSub) {
        this._pubSub = pubSub;
        this._topics = new Map();
        this._unsubscribers = [];
    }

    var _p = ChildPubSub.prototype;

    _p._getTopic = function(topic) {
        if(this._topics.has(topic))
            return this._topics.get(topic);

        var topicData = {
            subscribers: []
        };
        this._topics.set(topic, topicData);
        return topicData;
    };

    _p.subscribe = function(channel, callback /*, args, ...*/) {
        var subscription = [channel, callback]
          , args = []
          , i, l, unsubscribe
          , topicData = this._getTopic(channel)
          ;
        for(i=2,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        // call unsubscribe on destroy
        topicData.subscribers.push([callback, args]);
        Array.prototype.push.apply(subscription, args);
        unsubscribe = this._pubSub.subscribe.apply(this._pubSub, subscription);
        this._unsubscribers.push(unsubscribe);
    };

    _p.unsubscribeAll = function() {
        this._unsubscribers.forEach(function(unsubscribe){unsubscribe();});
    };

    // when a child want's to publish to the global pubsub
    _p.publish = function(/*channel, message, ...*/) {
        var args = [], i, l;
         for(i=0,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        this._pubSub.publish.apply(this._pubSub, args);
    };

    function _publish(subscription, message) {
        var callback = subscription[0]
          , args = subscription[1].slice()
          ;
        Array.prototype.push.apply(args, message);
        return callback.apply(null, args);
    }

    // publish to all children, but not to the global pubsub
    _p.childPublish = function(channel) {
        var message = [], i, l
          , topicData = this._getTopic(channel)
          , subscribers = topicData.subscribers
          ;
        for(i=1,l=arguments.length;i<l;i++)
            message.push(arguments[i]);
        for(i=0,l=topicData.subscribers.length;i<l;i++)
           _publish(subscribers[i], message);
    };

    return ChildPubSub;
    })();

    /**
     * This adds a lifecycle: widgets can be created and destroyed.
     */
    function InterfaceController(container, pubSub, factories, componentHandler
                                                    , templatesNode, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._factories = factories;
        this._componentHandler = componentHandler;
        this._templatesNode = templatesNode;
        this._activeWidgets = Object.create(null);
        this._activeFont = null;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

        this._blueprintsNodes = this._getBlueprintNodes();

    }
    var _p = InterfaceController.prototype = Object.create(Parent.prototype);
    _p.constructor = InterfaceController;

    /**
     * collect direct child elements of this._templatesNode which have
     * a data-widget-key attribute, that is not empty and the first with
     * its value.
     */
    _p._getBlueprintNodes = function() {
        var i, l, childElements = this._templatesNode.children
          , blueprint, key
          , result = Object.create(null)
          ;
        for(i=0,l=childElements.length;i<l;i++) {
            blueprint = childElements[i];
            key = blueprint.getAttribute('data-widget-key');
            if(!key || key in result)
                continue;
            result[key] = blueprint;
        }
        return result;
    };


    InterfaceController.defaultOptions = {
    };

    _p._getMarker = function(blueprint) {
        var marker = blueprint.getAttribute('data-target-marker') || '(undefined)';
        return 'insert: ' + marker;
    };

    _p._createWidget = function(key) {
        var pubsub, blueprint, marker, widgetContainer;
        if(key in this._activeWidgets)
            return;
        console.log('_createWidget', key);
        if(!(key in this._blueprintsNodes))
            throw new Error('Widget key "' + key + '" not found.');

        blueprint = this._blueprintsNodes[key];
        marker = this._getMarker(blueprint);
        // clone the template node
        widgetContainer = blueprint.cloneNode(true);
        // raises if marker is not found
        dom.insertAtMarkerComment(this._container, marker, widgetContainer, false);

        // We could make this._activeWidgets[key] an array and then be able
        // to create many widgets per key, if there are many insertion points.
        // But we're hardly going to need it.
        this._activeWidgets[key] = {
            container: widgetContainer
          , pubsub: pubsub =  new ChildPubSub(this._pubSub)
        };
        this._initWidget(widgetContainer, pubsub);
    };

    _p._destroyWidget = function(key) {
        this._activeWidgets[key].pubsub.unsubscribeAll();
        dom.removeNode(this._activeWidgets[key].container);
        delete this._activeWidgets[key];
    };

    // after creating a widget
    _p._initWidget = function(widgetContainer, pubsub) {
        var containers = initWidgets(widgetContainer, this._factories, pubsub);
        this._componentHandler.upgradeElements(containers);
        if(this._activeFont !== null)
            pubsub.childPublish('activateFont', this._activeFont);
    };

    _p._onActivateFont = function(fontIndex) {
        this._activeFont = fontIndex;
    };

    return InterfaceController;
});
