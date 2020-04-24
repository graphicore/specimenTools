/* jshint esversion:6 */
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
        this._callbacks = [];
        this._channels = Object.create(null);
        this._callId = 0;
    }

    const _p = PubSub.prototype
      , $ALL = Symbol('ALL')
      ;

    PubSub.$ALL = $ALL;

    _p._unsubscribe = function(channel, callbackId) {
        delete this._callbacks[callbackId];
        var callbackIds = this._channels[channel];
        if(callbackIds)
            callbackIds.delete(callbackId);
    };

    _p.subscribe = function(channel, callback, ...subscriberArgs) {
        var callbackIds = this._channels[channel]
          , callbackId
          ;
        if(!callbackIds)
            this._channels[channel] = callbackIds = new Set();

        callbackId = this._callbacks.push([callback, subscriberArgs]) - 1;
        callbackIds.add(callbackId);
        return this._unsubscribe.bind(this, channel, callbackId);
    };

    _p.subscribeAll = function(callback, ...subscriberArgs) {
        return this.subscribe($ALL, callback, ...subscriberArgs);
    };

    _p.publish = function(channel, ...args) {
        if(channel === $ALL)
            throw new Error('publishing to $ALL channels is not supported');
        var allArgs = [channel, ...args]
          , callbackIdsChannel = this._channels[channel] || new Set()
          , callbackIdsAll = this._channels[$ALL] || new Set()
          // sorted ids in global order
          , callbackIds = [...callbackIdsChannel, ...callbackIdsAll].sort((a,b)=>a-b)
          ;
        allArgs = [channel, ...args];

        for(let callbackId of callbackIds) {
            let [callback, subscriberArgs] = this._callbacks[callbackId]
              , callArgs = [
                        ...subscriberArgs
                        // use channel as first arg if it is a $ALL callback.
                      , ...(callbackIdsAll.has(callbackId) ? allArgs : args)]
              ;
            try {
                callback(...callArgs);
            }
            catch(e) {
                console.error('PubSub.publish', channel, e);
            }
        }
    };

    return PubSub;
});
