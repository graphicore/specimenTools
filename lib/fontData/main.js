define([
    'loadFonts'
  , 'marked'
  , '!require/text!./languageCharSets.json'
], function(
    loadFonts
  , marked
  , languageCharSetsJson
) {
    "use strict";
    /*jshint esnext:true*/

    var languageCharSets = JSON.parse(languageCharSetsJson);

    function _getFeatures(features, langSys, featureIndexes) {
        /*jshint validthis:true*/
        var i,l, idx, tag;
        for(i=0,l=featureIndexes.length;i<l;i++) {
            idx = featureIndexes[i];
            tag = features[idx].tag;
            if(!this[tag])
                this[tag] = [];
            this[tag].push(langSys);
        }
    }

    function getFeatures(font) {
        // get all gsub features:
        if('gsub' in font.tables) {
            var table = font.tables.gsub
              , scripts = font.tables.gsub.scripts
              , features = {/*tag: ["{script:lang}", {script:lang}]*/}
              , i, l, j, m, script, scriptTag, lang
              ;

            for(i=0,l=scripts.length;i<l;i++) {
                script = scripts[i].script;
                scriptTag = scripts[i].tag;
                if(script.defaultLangSys) {
                    lang = 'Default';
                    _getFeatures.call(features
                        , table.features
                        , [scriptTag, lang].join(':')
                        , script.defaultLangSys.featureIndexes
                    );
                }
                if(script.langSysRecords) {
                    for(j=0,m=script.langSysRecords.length;j<m;j++){
                        lang = script.langSysRecords[j].tag;
                        _getFeatures.call(features
                            , table.features
                            , [scriptTag, lang].join(':')
                            , script.langSysRecords[j].langSys.featureIndexes
                        );
                    }
                }
            }
            return features;
        }
    }

    function addMarkdownElement(parent, markdown) {
        var elem = parent.ownerDocument.createElement('div');
        elem.innerHTML = marked(markdown);
        parent.appendChild(elem);
    }

    function markdownFormatFeatures(features) {
        var text, i, l, key
          , keys = Object.keys(features).sort()
          ;
        function formatItem(item){return ' | ' + item;}
        text = ['### Features'];
        for(i=0,l=keys.length;i<l;i++) {
            key = keys[i];
            text.push('\n**`', key, '`**: `');
            Array.prototype.push.apply(text,features[key].map(formatItem));
            text.push('`  ');
        }
        return text.join('');
    }

    function sortCoverage(a, b) {
        if(a[1] === b[1])
            // compare the names of the languages, to sort by alphabetical;
            return a[0].localeCompare(b[0]);
        return b[1] - a[1] ;
    }

    function getLanguageCoverage(font) {
        var result = []
          , included, missing
          , language, chars, charCode, found, i, total
          ;
        for(language in languageCharSets) {
            // chars is a string
            chars = languageCharSets[language];
            found = 0;
            total = chars.length;
            included = []
            missing = []
            for(i=0;i<total;i++) {
                charCode = chars.codePointAt(i);
                if(charCode in font.encoding.cmap.glyphIndexMap) {
                    found += 1;
                    included.push(charCode);
                }
                else
                    missing.push(charCode);
            }
            result.push([language, found/total, found, total, missing, included]);
        }

        result.sort(sortCoverage);
        return result;
    }

    function markdownFormatLanguageCoverage(coverage) {
        var i,l,language,support, text = [];
        for(i=0,l=coverage.length;i<l;i++) {
            language = coverage[i][0];
            support = coverage[i][1];
            if(support === 0)
                continue;
            text.push('**', language ,'**: ', Math.round(support*100)
                    , ' % ',  coverage[i][2] , ' of ',  coverage[i][3]
                    , (support > .9 && support < 1
                            ? ' missing: ' + coverage[i][4].map(charCode =>
                                    'U+' + (('0000' + charCode.toString(16)).slice(-4))
                              ).join(' ')
                            : ''
                      )
                    , '  \n');
        }
        return text.join('');
    }

    function onLoadFont(idx, fontFileName, font) {
        /*jshint validthis:true*/
        var features = getFeatures(font)
          , featuresMarkdown = markdownFormatFeatures(features)
          , coverage = getLanguageCoverage(font)
          , languagesMarkdown = markdownFormatLanguageCoverage(coverage)
          ;
        addMarkdownElement(this.fontElements[idx], featuresMarkdown);
        addMarkdownElement(this.fontElements[idx], languagesMarkdown);
    }

    function addFont(parentElement, i, fontName) {
        /*jshint validthis:true*/
        var doc = parentElement.ownerDocument
          , element = this.fontElements[i] = doc.createElement('div')
          , headline
          ;
        parentElement.appendChild(element);
        headline = doc.createElement('h2');
        headline.textContent = fontName;
        element.appendChild(headline);
    }

    function main(document, fontFiles) {
        var container = document.createElement('div')
          , state = Object.create(null)
          ;
        state.fontElements = [];
        document.body.appendChild(container);
        loadFonts (fontFiles, [addFont.bind(state, container)], [onLoadFont.bind(state)]);
    }

    return main;
});
