/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    /**
     * record and publish load protocol state
     */
    function LoadProtocolState(pubsub, options) {
        Parent.call(this, options);
        this._pubsub = pubsub;
        this._state = new Map();

        this[Parent.$DESTRUCTORS] = [
            this._pubsub.subscribe(this._options.loadChannel, this._onLoad.bind(this))
          , this._pubsub.subscribe(this._options.unloadChannel, this._onUnload.bind(this))
        ];
    }

    const _p = LoadProtocolState.prototype = Object.create(Parent.prototype);
    LoadProtocolState.constructor = LoadProtocolState;

    LoadProtocolState.defaultOptions = {
        loadChannel: 'loadFile'
      , unloadChannel: 'unloadFile'
      , replayPrepareChannel: 'prepareFile' // only used for replay
      , replayLoadChannel:  null // falls back to 'loadChannel'
      , replayAllLoadedChannel: null // only used for replay i.e.: 'allFilesLoaded'
    };

    _p._onLoad = function(id, ...args) {
        this._state.set(id, args);
    };

    _p._onUnload = function(id) {
        this._state.delete(id);
    };

    _p.publish = function(pubsub, channels={}) {
        var allLoadedChannel = channels.allLoaded
                    || this._options.replayAllLoadedChannel
                    || false
          , prepareChannel = channels.prepare
                    || this._options.replayPrepareChannel
                    || false
          , loadChannel = channels.load
                    || this._options.replayLoadChannel
                    || this._options.loadChannel
                    || false
          , publishFiniteInfo = !!allLoadedChannel
          ;

        if(prepareChannel)
            for(let id of this._state.keys())
                pubsub.publish(prepareChannel, id, publishFiniteInfo ? this._state.size : null);

        for(let [id, args] of this._state)
            pubsub.publish(loadChannel, id, ...args);

        if(publishFiniteInfo && allLoadedChannel)
            pubsub.publish(allLoadedChannel, this._state.size);
    };

    _p.getState = function(defensiveCopy=false) {
        return defensiveCopy ? new Map(this._state) : this._state;
    };

    return LoadProtocolState;
});
