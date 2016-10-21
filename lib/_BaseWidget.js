define([], function(){
    "use strict";

    function _BaseWidget(options) {
        this._options = this._makeOptions(options);
    }

    _BaseWidget.defaultOptions = {};

    var _p = _BaseWidget.prototype;
    _p.constructor = _BaseWidget;

    _p._makeOptions = function(options) {
            // With Object.keys we won't get keys from the prototype
            // of options but maybe we want this!?
        var keys = options ? Object.keys(options) : []
          , i, l
          , result = Object.create(this.constructor.defaultOptions);
          ;
        for(i=0,l=keys.length;i<l;i++)
            result[keys[i]] = options[keys[i]];
        return result;
    };

    return _BaseWidget;
});
