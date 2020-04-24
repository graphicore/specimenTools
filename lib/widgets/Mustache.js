define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
  , 'mustache'
], function(
    Parent
  , domTool
  , mustache
) {
    "use strict";
    /*jshint esnext:true*/

    /**
     * Render view to mutache template.
     */
    function Mustache(container, view, options) {
        Parent.call(this, options);
        this._container = container;
        this._view = view;
        this[Parent.$DESTRUCTORS] = false;

        this._container.querySelectorAll(`script.${this._options.templateClass}`)
        .forEach(node=>{
            var html = mustache.render(node.textContent, this._view)
              , fragment = domTool.createFragmentFromHTML(html, this._options.domPurifyTrusted)
              ;
            // just insert in place
            domTool.insertAfter(fragment, node);
        });

    }

    var _p = Mustache.prototype = Object.create(Parent.prototype);
    _p.constructor = Mustache;

    Mustache.defaultOptions = {
        templateClass: 'mustache__template'
        // config for the domTool.createFragmentFromHTML "trusted" argument
      , domPurifyTrusted: false
    };

    return Mustache;
});
