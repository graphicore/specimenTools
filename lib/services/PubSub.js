define([
], function(
) {
    "use strict";
    /**
     * Simple module for signaling.
     *
     * On a call to `pubSub.publish("channel-name"[, optional, arg1, ... args])`
     * the callback of all subscriptions of "channel-name" will be invoked
     * with the optional arguments given to `publish`:
     *          `callback(optional, arg1, ... args)`
     *
     * The subscriptions are always invoked in the order of subscription.
     *
     * There's no way to cancel subscription yet.
     */
    function PubSub() {
        this._topics = new Map();
    }

    var _p = PubSub.prototype;

    _p._getTopic = function(topic) {
        if(this._topics.has(topic))
            return this._topics.get(topic);

        var topicData = {
            subscribers: []
        };
        this._topics.set(topic, topicData);
        return topicData;
    };

    _p._unsubscribe = function(topic, marker) {
        var topicData = this._getTopic(topic)
          , subscribers = topicData.subscribers
          , i,l
          ;
        for(i=0,l=subscribers.length;i<l;i++) {
            if(subscribers[i][2] !== marker)
                continue;
            // found
            subscribers.splice(i, 1);
            break;
        }
    };

    function Marker(){}
    _p.subscribe = function(topic, callback /* callback args ... */) {
        var topicData = this._getTopic(topic)
          , args = [], i, l, subscription
          , marker = new Marker()
          ;
        for(i=2,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        subscription = [callback, args, marker];
        topicData.subscribers.push(subscription);
        // return unsubscribe function
        return this._unsubscribe.bind(this, topic, marker);
    };

    function _publish(subscription, message) {
        var callback = subscription[0]
          , args = subscription[1].slice()
          ;
        Array.prototype.push.apply(args, message);
        return callback.apply(null, args);
    }

    _p.publish = function(topic /* , message, ... */) {
        var message = [], i, l
          , topicData = this._getTopic(topic)
          , subscribers = topicData.subscribers
          ;
        for(i=1,l=arguments.length;i<l;i++)
            message.push(arguments[i]);
        for(i=0,l=subscribers.length;i<l;i++)
            _publish(subscribers[i], message);
    };

    return PubSub;
});
