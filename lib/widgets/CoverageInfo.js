define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
], function(
    Parent
  , dom
) {
    "use strict";

    /* jshint esnext:true*/

    function CoverageInfo(container, pubSub, fontsData, widgetsAPI, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._widgetsAPI = widgetsAPI;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._currentElements = null;
        this._idHead = this._container.getAttribute('data-id-head')
                                        || this._options.fallbackIdHead;
        this._filterValues = {min:0, max:100};
        this._filterItems = this._initAllFilterItems();
        this._updateFilters('min');
        this._updateFilters('max');
        this._state = null;
    }
    var _p = CoverageInfo.prototype = Object.create(Parent.prototype);
    _p.constructor = CoverageInfo;

    CoverageInfo.defaultOptions = {
        maxShowMissing: 30
      , isLax: false
      // FIXME: move all `mdl-` classes to mdlFontSpecimen
      , tabsClasses: 'mdl-tabs mdl-js-tabs mdl-js-ripple-effect'
      , tabsBarClasses: 'mdl-tabs__tab-bar'
      , tabsTabClasses: 'mdl-tabs__tab'
      , tabsPanelClasses: 'mdl-tabs__panel'
      , tabsActiveClass: 'is-active'
      , fallbackIdHead: 'coverage-info-tab'
      , tableClasses: 'mdl-data-table mdlfs-coverage-info_data-table'
      , minFilterSelector: '.mdlfs-coverage-info_filter-min'
      , maxFilterSelector: '.mdlfs-coverage-info_filter-max'
    };

    function _selectAll(elem, selector) {
        return Array.prototype.slice.apply(elem.querySelectorAll(selector));
    }

    function _setValue(elem, value) {
        /* global Event */
        if(elem.value === value)
            return;
        elem.value = value;
        // so e.g. mdl is notified
        elem.dispatchEvent(new Event('change'));
    }

    _p._onChangeFilter = function(key, event) {
        var elem = event.target
          , value = fromRawValue(elem.value, key==='max')
          ;
        if(this._filterValues[key] === value)
            return;
        this._filterValues[key] = value;
        this._updateFilters(key);
    };

    _p._updateFilters = function(key) {
        var value = this._filterValues[key]
          , rawValue = toRawValue(value, key==='max')
          , items = this._filterItems[key]
          , i, l
          ;
        if(!items) return;
        function setInputValue(element) {
            _setValue(element, rawValue);
        }
        function setTextContent(element) {
            element.textContent = value.toFixed(2);
        }

        for(i=0,l=items.length;i<l;i++) {
            _selectAll(items[i], 'input').forEach(setInputValue);
            _selectAll(items[i], '.value').forEach(setTextContent);
        }
        this._updateFilteredRows();
    };

    _p._updateFilteredRows = function() {
        var k, i, l, row;
        if(this._state === null)
            return;
        for(k in this._state) {
            for(i=0,l=this._state[k].rows.length;i<l;i++) {
                row = this._state[k].rows[i];
                if(row.value > this._filterValues.max
                        || row.value < this._filterValues.min)
                    row.row.style.display = 'none';
                else
                    // show
                    row.row.style.display = '';
            }
        }
    };

    function _convertValue(value, to, highValControl) {
        // position will be between 0 and 100
        var maxp = 100
            // The result should be between 0 an 100
          , maxv = Math.log1p(100)
            // calculate adjustment factor
          , scale = maxv / maxp
          , result
          ;

        if(!highValControl)
            value = maxp - value;

        if(!to)
            result = Math.log1p(value) / scale;
        else // from
            result = Math.expm1(scale*value);

        if(!highValControl)
                result = maxp - result;
        return result;
    }

    function toRawValue(value, highValControl) {
        return _convertValue(value, true, highValControl).toFixed(2);
    }
    function fromRawValue(value, highValControl) {
        var flVal = Math.round((parseFloat(value) * 100) / 100);
        return _convertValue(flVal, false, highValControl);
    }

    _p._initFilterItems = function(key, selector) {
        var items = _selectAll(this._container, selector)
          , i, l, elem
          , changeHandler = this._onChangeFilter.bind(this, key)
          , mdlUpgradeHandler = this._filterAddTicks.bind(this, key)
          , value = this._filterValues[key] // default fallback
          , rawValue = toRawValue(value, key==='max')
          ;
        for(i=0,l=items.length;i<l;i++) {
            elem = _selectAll(items[i], 'input')[0];
            if(!elem)
                continue;
            if(i === 0) {
                rawValue = elem.value;
                this._filterValues[key] = fromRawValue(rawValue
                                                        , key==='max');
            }
            else
                // make all elements have the same value
                _setValue(elem, rawValue);
            elem.addEventListener('change', changeHandler);
            elem.addEventListener('mdl-componentupgraded'
                                                    , mdlUpgradeHandler);
        }
        return items;
    };

    _p._filterAddTicks = function(key, event) {
        // FIXME: *very* mdl specific.
        var i, ticks = [], tick, pos;
        for(i=0;i<11;i++) {
            tick = dom.createElement('div', {class: 'slider-tick'});
            pos = toRawValue(10 * i, key==='max');
            tick.style.left = pos + '%';
            ticks.push(tick);
        }
        // parentElement === .mdl-slider__container
        dom.insert( event.target.parentElement, 'append',
                dom.createElement('div', {class: 'slider-ticks'}, ticks));

    };

    _p._initAllFilterItems = function() {
        var items = {
            min: this._initFilterItems('min', this._options.minFilterSelector
                                                    , this._filterValues.min)
          , max: this._initFilterItems('max', this._options.maxFilterSelector
                                                    , this._filterValues.max)
        };
        return items;
    };

    /**
     * Usage:
     *
     * > stringFormat('Hello {name}', {name: 'Helga'});
     * Hello Helga
     *
     */
    function stringFormat(string, data) {
        var k, result = string;
        for(k in data)
            result = result.replace(new RegExp('\\{'+ k +'\\}', 'g'), data[k]);
        return result;
    }

    _p._makeRow = function(order, data, cellTag, firstCellTag) {
        var i ,l, key, format, value
          , cells = []
          , tag
         ;
        for(i=0,l=order.length;i<l;i++) {
            key = order[i];
            format = null;
            if(key instanceof Array) {
                format = key[1];
                key = key[0];
                value = stringFormat(format, data);
            }
            else
                value = data[key];
            tag = (i === 0 && firstCellTag) ? firstCellTag : cellTag;
            cells.push(dom.createElement(tag, {}, value));
        }
        return dom.createElement('tr', {}, cells);
    };

    // FIXME: too much mdl specific structures!
    _p._toggleMissingDrilldown = function(state, stopElement, event) {
        var searchAttribute = 'data-index'
          , index = dom.validateChildEvent(event, stopElement, searchAttribute)
          , row, missing
          , rowState, changeRowState
          , maxShowMissing = this._options.maxShowMissing
          ;
        if(index === undefined)
            return;
        rowState = state.rows[index];
        row = rowState.row;
        rowState.missing = missing = state.coverage[index][4];
        if(rowState.switchMissingInput.hasAttribute('disabled') )//|| event.target !== button)
            return;

        if(state.rows[index].drilldown) {
            // remove the drilldown row
            if(this._widgetsAPI)
                this._widgetsAPI.destroy(rowState.drilldown);
            dom.removeNode(rowState.drilldown);
            delete rowState.drilldown;
            return;
        }

        // init the drilldown row

        // in there: show maxShowMissing number of glyphs and a
        // (… and 34 more) (less) button to expand the list fully
        // show a switch: show characters / show unicodes

        rowState.showMoreLessInput = dom.createElement('input'
                , { type:'checkbox', 'class': 'mdl-switch__input'});
        rowState.showMoreLessLabel = dom.createElement('span'
                , {'class': 'mdl-switch__label'}
                , 'show '+ (missing.length - maxShowMissing) +' more'
        );
        rowState.showMoreLess = dom.createElement(
              'label'
            , {'class': 'mdl-switch mdl-js-switch'}
            , [rowState.showMoreLessInput, rowState.showMoreLessLabel]
        );


        rowState.showCharactersInput = dom.createElement('input'
                , { type:'checkbox', 'class': 'mdl-switch__input'});

        rowState.showCharacters = dom.createElement(
              'label'
            , {'class': 'mdl-switch mdl-js-switch'}
            , [
                  rowState.showCharactersInput
                , dom.createElement('span', {'class': 'mdl-switch__label'}
                                                , 'show as characters')
              ]
        );

        rowState.charContent = dom.createElement('span');

        rowState.drilldown = dom.createElement('tr', {},[
            dom.createElement('th', {},  row.children[0].textContent + ' Missing Chars')
          , dom.createElement(
                'td'
              , {
                    'colspan': row.children.length-1
                  , 'class': 'mdl-data-table__cell--non-numeric'
                }
              , [
                    rowState.showCharacters
                  , missing.length > maxShowMissing ? rowState.showMoreLess : ''
                  , rowState.charContent
                ]
            )
        ]);

        dom.insert(row, 'after', rowState.drilldown);
        if(this._widgetsAPI)
            this._widgetsAPI.init(rowState.drilldown);

        changeRowState =  this._changeRowState.bind(this, rowState);
        rowState.showCharactersInput.addEventListener('change', changeRowState);
        rowState.showMoreLessInput.addEventListener('change', changeRowState);

        this._setDrildownContent(rowState);
    };

    _p._changeRowState = function(rowState, event) {
        event.preventDefault();
        event.stopPropagation();
        this._setDrildownContent(rowState);
    };

    function _hexFromCodePoint(charCode) {
        return ' U+' + (('0000' + charCode.toString(16)).slice(-4));
    }

    function _stringFromCodePoint(charCode) {
        return String.fromCodePoint(charCode);
    }

    _p._setDrildownContent = function(rowState) {
        var missing = rowState.missing
          , maxShowMissing = this._options.maxShowMissing
          , displayCodes = rowState.showMoreLessInput.checked
                ? missing
                : missing.slice(0, maxShowMissing)
          , formatChars = rowState.showCharactersInput.checked
                ? _stringFromCodePoint
                : _hexFromCodePoint

          ;
        rowState.charContent.textContent = displayCodes.map(formatChars).join(' ');
    };

    _p._addMissingDrilldown = function(state, missingCell, disabled) {


        state.switchMissingLabel = dom.createElement('span'
                , {'class': 'mdl-switch__label'}
                , 'show');

        state.switchMissingInput = dom.createElement('input'
                , { type:'checkbox', 'class': 'mdl-switch__input'});


        state.switchMissing = dom.createElement(
              'label'
            , {'class': 'mdlfs-coverage-info_missing-switch mdl-switch mdl-js-switch'}
            , [state.switchMissingInput, state.switchMissingLabel]
        );

        if(disabled)
            state.switchMissingInput.setAttribute('disabled', '');
        dom.appendChildren(missingCell, [' ', state.switchMissing]);
        state.drilldown = null;
    };

    _p._makeTable = function(state, label, coverage, isLax) {
        var headRows = []
          , dataRows = []
          , thead, tbody
          , order = ['name', 'percent', 'found', 'total', 'laxSkipped', 'missing']
          , labels = {
                name: label // TODO: as argument
              , percent: 'Percentage'
              , found: 'Found'
              , total: 'Total'
              , missing: 'Missing'
              , laxSkipped: 'Lax Skipped'
            }
          , i, l, data, row
          , missingIndex
          ;
        if(!isLax)
            order.splice(order.indexOf('laxSkipped'), 1);
        missingIndex = order.indexOf('missing');

        headRows = this._makeRow(order, labels, 'th');
        order.splice(order.indexOf('percent'), 1, ['percent', '{percent} %']);

        function formatPercent(ratio){
            var percent = Math.round(ratio*10000) / 100;
            return percent.toFixed(2);
        }

        for(i=0,l=coverage.length;i<l;i++) {
            data = {
                name: coverage[i][0]
              , percent: formatPercent(coverage[i][1])
              , found: coverage[i][2]
              , total: coverage[i][3]
              , missing: coverage[i][4].length
              , laxSkipped: coverage[i][6].length
            };

            row = this._makeRow(order, data, 'td','th');
            row.setAttribute('data-index', i);
            state.rows[i] = {
                row:row
              , value: data.percent
            };
            this._addMissingDrilldown(state.rows[i], row.children[missingIndex]
                                                , !coverage[i][4].length);
            dataRows.push(row);
        }

        thead = dom.createElement('thead', {}, headRows);
        tbody = dom.createElement('tbody', {}, dataRows);
        tbody.addEventListener('change', this._toggleMissingDrilldown.bind(this, state, tbody));
        return dom.createElement('table', {'class': this._options.tableClasses}, [thead, tbody]);
    };

    _p._makeTab = function(state, id, label, coverage, isLax) {
        return {
            tab: dom.createElement('a'
                , {href: '#' + id, 'class': this._options.tabsTabClasses}
                , label)
          , panel: dom.createElement('div'
                , {id: id, 'class': this._options.tabsPanelClasses}
                , this._makeTable(state, label, coverage, isLax)
                )
        };
    };

    _p._makeTabs = function(fontIndex, isLax) {
        var bar = dom.createElement('div', {'class': this._options.tabsBarClasses})
          , tabs = dom.createElement('div', {'class': this._options.tabsClasses}, bar)
          , i, l, k, id, args, tab
          , func  = isLax
                ? 'getLanguageCoverageLax'
                : 'getLanguageCoverageStrict'
          , setup = {
                language: ['Language'
                        , this._fontsData[func](fontIndex), isLax]

              , charset: ['Charset'
                        , this._fontsData.getCharSetsCoverageSorted(fontIndex, isLax)
                        , isLax]
            }
          , order = ['language', 'charset']
          ;

        for(i=0,l=order.length;i<l;i++) {
            k = order[i];
            id = [this._idHead, i].join('-');
            this._state[k] = {
                coverage: setup[k][1]
              , rows: []
            };
            args = [this._state[k], id];
            Array.prototype.push.apply(args, setup[k]);
            tab = this._makeTab.apply(this, args);

            if(i === 0) {
                tab.tab.classList.add(this._options.tabsActiveClass);
                tab.panel.classList.add(this._options.tabsActiveClass);
            }
            bar.appendChild(tab.tab);
            tabs.appendChild(tab.panel);
        }
        return tabs;
    };

    _p._onActivateFont = function(fontIndex) {
        var isLax, i, l;
        if(this._currentElements !== null) {
            if(this._widgetsAPI)
                this._widgetsAPI.destroy(this._currentElements);
            for(i=0,l=this._currentElements.length;i<l;i++)
                this._container.removeChild(this._currentElements[i]);
            this._currentElements = null;

        }
        this._currentElements = [];
        this._state = Object.create(null);
        isLax = this._options.isLax
                    || this._container.hasAttribute('data-coverage-lax');
        this._currentElements.push(this._makeTabs(fontIndex, isLax));
        dom.appendChildren(this._container, this._currentElements);
        if(this._widgetsAPI)
            this._widgetsAPI.init(this._currentElements);
        this._updateFilters();
    };

    return CoverageInfo;
});
