define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/dom-tool'
], function(
    Parent
  , dom
) {
    "use strict";

    /* jshint esnext:true*/

    function LanguageInfo(container, pubSub, fontsData, componentHandler, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._componentHandler = componentHandler;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._currentElements = null;
        this._idHead = this._container.getAttribute('data-id-head')
                                        || this._options.fallbackIdHead;
    }
    var _p = LanguageInfo.prototype = Object.create(Parent.prototype);
    _p.constructor = LanguageInfo;

    LanguageInfo.defaultOptions = {
        maxShowMissing: 30
      , isLax: false
      , tabsClasses: 'mdl-tabs mdl-js-tabs mdl-js-ripple-effect'
      , tabsBarClasses: 'mdl-tabs__tab-bar'
      , tabsTabClasses: 'mdl-tabs__tab'
      , tabsPanelClasses: 'mdl-tabs__panel'
      , tabsActiveClass: 'is-active'
      , fallbackIdHead: 'coverage-info-tab'
    };

    function stringReplaceAll(string, data) {
        var k, result = string;
        for(k in data)
            result = result.replace(new RegExp('\\{'+ k +'\\}', 'g'), data[k]);
        return result;
    }

    _p._renderLines = function(doc, headline, linesContainerType, lineMacro, lines) {
        var h = doc.createElement('h4')
          , p = doc.createElement(linesContainerType)
          , result = doc.createDocumentFragment()
          ;

        h.textContent = headline;
        p.innerHTML = lines.map(stringReplaceAll.bind(null, lineMacro)).join('');
        result.appendChild(h);
        result.appendChild(p);
        return result;
    };

    _p._renderCoverage = function (label, coverage, isLax) {
        var doc = this._container.ownerDocument
          , i,l, missing
          , lines = []
          , linesContainerType = 'ul'
          , lineMacro =  '<li><strong>{name}</strong> {percent}% '
                  + '{having} of {needed}'
                  + (isLax ? ' skipped: {laxSkipped}' : '')
                  +' missing {missing}</li>\n'
          , maxShowMissing = this._options.maxShowMissing
          ;
        for(i=0,l=coverage.length;i<l;i++) {
            if(coverage[i][1] === 0) // optionally include all?
                continue;
            missing = coverage[i][4];
            lines.push({
                name: coverage[i][0]
              , percent: Math.round(coverage[i][1]*100)
              , having: coverage[i][2]
              , needed: coverage[i][3]
              , missing: missing.length + (missing.length
                    ? (  ' ('
                      + missing.slice(0, maxShowMissing).map(charCode =>
                              '"' + String.fromCodePoint(charCode) + '"'
                            + ' U+' + (('0000' + charCode.toString(16)).slice(-4))
                        ).join(',')
                      + (missing.length > maxShowMissing
                            ? ' … and ' + (missing.length - maxShowMissing) + ' more'
                            : ''
                        )
                      + ')'
                      )
                    : ''
                )
              , laxSkipped: coverage[i][6].length
            });
        }
        return this._renderLines(doc, label, linesContainerType, lineMacro, lines);
    };

    _p._makeTab = function(id, label, header, coverage, isLax) {
        return {
            tab: dom.createElement('a'
                , {href: '#' + id, 'class': this._options.tabsTabClasses}
                , label)
          , panel: dom.createElement('div'
                , {id: id, 'class': this._options.tabsPanelClasses}
                , this._renderCoverage(header, coverage, isLax))
        };
    };

    _p._makeTabs = function(fontIndex, isLax) {
        var bar = dom.createElement('div', {'class': this._options.tabsBarClasses})
          , tabs = dom.createElement('div', {'class': this._options.tabsClasses}, bar)
          , i, l, id, args, tab
          , func  = isLax
                ? 'getLanguageCoverageLax'
                : 'getLanguageCoverageStrict'
          , setup = [
                ['language', 'Language Coverage Details'
                    , this._fontsData[func](fontIndex), isLax]

              , ['charset', 'Charset Coverage Details'
                    , this._fontsData.getCharSetsCoverageSorted(fontIndex, isLax)
                    , isLax]
            ]
          ;

        for(i=0,l=setup.length;i<l;i++) {
            id = [this._idHead, i].join('-');
            args = [id];
            Array.prototype.push.apply(args, setup[i]);
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
            for(i=0,l=this._currentElements.length;i<l;i++)
                this._container.removeChild(this._currentElements[i]);
            this._currentElements = null;
        }
        this._currentElements = [];
        isLax = this._options.isLax
                    || this._container.hasAttribute('data-coverage-lax');
        this._currentElements.push(this._makeTabs(fontIndex, isLax));
        dom.appendChildren(this._container, this._currentElements);
        if(this._componentHandler)
            this._componentHandler.upgradeElements(this._currentElements);
    };

    return LanguageInfo;
});
