define([
], function(
) {
    "use strict";

    function PubSub() {
        this._callbacks = Object.create(null);
    }

    var _p = PubSub.prototype;

    _p.subscribe = function(event, callback) {
        var callbacks = this._callbacks[event];
        if(!callbacks)
            this._callbacks[event] = callbacks = [];
        callbacks.push(callback);
    };

    _p.publish = function(event /* , args, ... */) {
        var i, l
          , args = []
          , callbacks = this._callbacks[event] || [];
          ;
        for(i=1,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        for(i=0,l=callbacks.length;i<l;i++)
            callbacks[i].apply(null, args);
    };

    return PubSub;
});
