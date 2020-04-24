/* jshint esversion:6 */
define([
], function(
) {
    "use strict";

    /**
     * Very basic interface to switch between all loaded fonts.
     * See FamilyChooser for a more advanced interface.
     */

    function SimpleFileChooser(container, pubSub) {
        this._container = container;
        this._pubSub = pubSub;

        this._switches = {};
        this._switchesContainer = this._container.ownerDocument.createElement('div');
        this._container.appendChild(this._switchesContainer);

        this._pubSub.subscribe('prepareFont', this._prepareLoadHook.bind(this));
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._pubSub.subscribe('unloadFont', this._onUnloadFont.bind(this));


        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = SimpleFileChooser.prototype;

    _p._prepareLoadHook = function(id, fontFileName) {
        if(id in this._switches) // reload
            return;
        var button = this._switchesContainer.ownerDocument.createElement('button');
        button.textContent = fontFileName;
        button.disabled = true;
        button.addEventListener('click', ()=>this._activateFont(id), true);
        this._switches[id] = button;
        this._switchesContainer.appendChild(button);
    };

    _p._onLoadFont = function (id, fontFileName, font) {
        /*jshint unused: vars*/
        if(id in this._switches)
            this._switches[id].disabled = false;
    };

    _p._onUnloadFont = function (id) {
        if(!this._switches[id])
            return;
        this._switchesContainer.removeChild(this._switches[id]);
        delete this._switches[id];
    };

    _p._activateFont = function(id) {
        // this will call this._onActivateFont
        this._pubSub.publish('activateFont', id);
    };

    _p._onActivateFont = function(id) {
        /*jshint unused: vars*/
        // this should only change the view, not emit signals
        // ToDo: mark the button(s) active/inactive
    };

    return SimpleFileChooser;
});
