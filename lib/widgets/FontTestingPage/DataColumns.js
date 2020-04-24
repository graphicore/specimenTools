/* jshint esversion:6 */
define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
], function(
    Parent
  , domTool
) {
    "use strict";
                            // use: 'data.text', 'data.columns'
    function DataColumns(container, textContent, dataColumns, options) {
        Parent.call(this, options);
        this._container = container;
        this._textContent = textContent;
        this._columnSizes = dataColumns.map(obj=>obj.sizes);
        this._textLineTemplate = this._container.querySelector(
                                this._options.textLineTemplateSelector);
        this._columnTemplate = this._container.querySelector(
                                    this._options.columnTemplateSelector);
        this[Parent.$DESTRUCTORS] = false;
        this._samples = new Set();
        this._initColumns();
        // just use one handler to collect all input events as they bubble
        this._container.addEventListener('input', this._onInput.bind(this), true);
    }

    var _p = DataColumns.prototype = Object.create(Parent.prototype);
    _p.constructor = DataColumns;

    DataColumns.defaultOptions = {
        fontSizeSelector: '.font-testing-data__font-size'
      , textLineTemplateSelector: 'template.font-testing-data__textline'
      , columnTemplateSelector: 'template.font-testing-data__column'
      , sampleTag: 'p'
      , sampleClass: 'font-testing-data__sample'
    };

    _p._initColumns = function() {
        var columns = [];
        for (let sizes of this._columnSizes) {
            let column
              , items = []
              ;

            if(this._columnTemplate) {
                column = this._columnTemplate.content.cloneNode(true);
                columns.push(column);
            }
            else
                // if there's no column template, fall back to the container
                // ALSO: no mutli columns possible!
                column = this._container;
            for(let size of sizes) {
                let fontsizeLabel = `${size} px`
                  , setFontSize = el=>el.fontSize=fontsize //jshint ignore:line
                  , item = this._textLineTemplate.content.cloneNode(true)
                  , sample = domTool.createElement(this._options.sampleTag
                                    , {
                                          'class': this._options.sampleClass
                                    , contenteditable: 'true'
                                        , style: `font-size: ${size}px`
                                      }
                                    , this._textContent);
                this._samples.add(sample);
                // e.g.:
                // <p class="sizelabel"><!-- insert: font size --></p>
                // <p class="font-testing-data__font-size" style="font-size: ${fontsize}">
                // <!-- insert: text -->
                // </p>
                domTool.insertAtMarkerComment(item, 'insert: font size'
                                , domTool.createTextNode(fontsizeLabel));
                domTool.insertAtMarkerComment(item, 'insert: sample', sample);
                items.push(item);
            }
            domTool.insertAtMarkerComment(column
                                  , 'insert: textline'
                                  , domTool.createFragment(items, false));
        }
        if(columns.length)
            // must insert at the end, otherwise, the documentFragment
            // is empty and we can't use it to insert the samples.
            // Also good to keep  the correct order.
            domTool.insertAtMarkerComment(this._container
                                , 'insert: columns'
                                , domTool.createFragment(columns, false));
    };

    _p._onInput = function(e) {
        if(!this._samples.has(e.target))
            // really only use changes occuring to our samples.
            return;
        this._changeText(e.target.textContent);
    };

    _p._changeText = function (newText) {
        if(this._textContent === newText)
            return;
        this._textContent = newText;
        for(let sample of this._samples) {
            if(sample.ownerDocument.activeElement === sample)
                // need this or we loose the focus/prompt position
                continue;
            sample.textContent = newText;
        }
    };

    return DataColumns;
});
