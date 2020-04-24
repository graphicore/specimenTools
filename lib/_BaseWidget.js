/* jshint esversion:6 */
define([
    './services/dom-tool'
], function(
    domTool
){
    "use strict";

    const $DESTRUCTORS = Symbol('DESTRUCTORS');

    function _BaseWidget(options) {
        // jshint validthis:true
        this._options = this._makeOptions(options);

        // If this is set,it's used by _p.destroy like an array
        // as default implementation. Each item a callback.
        this[$DESTRUCTORS] = null;

    }

    _BaseWidget.defaultOptions = {};

    var _p = _BaseWidget.prototype;
    _p.constructor = _BaseWidget;
    _BaseWidget.$DESTRUCTORS = $DESTRUCTORS;

    _p._makeOptions = function(options) {
            // With Object.keys we won't get keys from the prototype
            // of options but maybe we want this!?
        var keys = options ? Object.keys(options) : []
          , i, l
          , result = Object.create(this.constructor.defaultOptions)
          ;
        for(i=0,l=keys.length;i<l;i++)
            result[keys[i]] = options[keys[i]];
        return result;
    };

    _p._applyClasses = domTool.applyClasses;

    _p._cssName2jsName = function (name) {
        var pieces = name.split('-'), i, l;
        for(i=1,l=pieces.length;i<l;i++)
            pieces[i] = pieces[i][0].toUpperCase() + pieces[i].slice(1);
        return pieces.join('');
    };

    // is especially needed if e.g. this widget needs to unsubscribe from
    // pubsub or so. I.e. wherever there are external references to this
    // widget.
    _p.destroy = function() {
        if(this[$DESTRUCTORS]) {
            for(let destructor of this[$DESTRUCTORS])
                destructor();
        }
        // initial value is null and must be set to an array of destructors
        // or to false.
        else if (this[$DESTRUCTORS] === null)
            // By default this raises, so we don't forget to implement
            // destructors explicitly when needed!
            // If no destructor is needed, a sub class could either
            // re implement this method or an instance can define:
            // this[_BaseWidget.$DESTRUCTORS] = false;
            throw new Error(`destroy is not implemented in ${this.constructor.name}:\n ${this.constructor}`);
        // else: pass
    };

    return _BaseWidget;
});
