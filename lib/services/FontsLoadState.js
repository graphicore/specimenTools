/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/LoadProtocolState'
], function(
    Parent
  , LoadProtocolState
) {
    "use strict";

    /**
     * record and publish load protocol state
     */
    function FontsLoadState (pubsub, options) {
        Parent.call(this, options);
        this._pubsub = pubsub;

        this._activeFont = null;
        this._loadedFonts = new LoadProtocolState(this._pubsub, {
            loadChannel: 'loadFont'
          , unloadChannel: 'unloadFont'
          , replayPrepareChannel: 'prepareFont'
        });

        this[Parent.$DESTRUCTORS] = [
            ()=>this._loadedFonts.destroy()
          , this._pubsub.subscribe('activateFont', this._onActivateFont.bind(this))
        ];
    }

    const _p = FontsLoadState.prototype = Object.create(Parent.prototype);
    FontsLoadState.constructor = FontsLoadState;

    FontsLoadState.defaultOptions = {
    };

    _p._onActivateFont = function(fontIndex) {
        this._activeFont = fontIndex;
    };

    _p.publish = function(pubSub) {
        this._loadedFonts.publish(pubSub);
        if(this._activeFont)
            pubSub.publish('activateFont', this._activeFont);
    };

    return FontsLoadState;
});
