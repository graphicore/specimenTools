define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    /* jshint esnext:true*/

    function LanguageInfo(container, pubSub, fontsData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._currentElements = null;
    }
    var _p = LanguageInfo.prototype = Object.create(Parent.prototype);
    _p.constructor = LanguageInfo;

    LanguageInfo.defaultOptions = {
        maxShowMissing: 30
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

    _p._renderLanguageCoverage = function (coverage, isLax) {
        var doc = this._container.ownerDocument
          , i,l, missing
          , lines = []
          , linesContainerType = 'ul'
          , lineMacro =  '<li><strong>{language}</strong> {percent}% '
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
                language: coverage[i][0]
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
        return this._renderLines(doc, 'Language Coverage Details'
                                , linesContainerType, lineMacro, lines);
    };

    _p._onActivateFont = function(fontIndex) {
        var isLax, coverage, fragment, i, l;
        if(this._currentElements !== null) {
            for(i=0,l=this._currentElements.length;i<l;i++)
                this._container.removeChild(this._currentElements[i]);
            this._currentElements = null
        }
        isLax = this._container.hasAttribute('data-coverage-lax')
        coverage = isLax
                ? this._fontsData.getLanguageCoverageLax(fontIndex)
                : this._fontsData.getLanguageCoverageStrict(fontIndex)
                ;
        fragment = this._renderLanguageCoverage(coverage, isLax);
        this._currentElements = Array.from(fragment.childNodes);
        this._container.appendChild(fragment);
    };

    return LanguageInfo;
});
