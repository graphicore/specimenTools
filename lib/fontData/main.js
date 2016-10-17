define([
    'loadFonts'
  , 'marked'
], function(
    loadFonts
  , marked
) {
    "use strict";

    function getFeatures(features, langSys, featureIndexes) {
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

    function collectFeatures(font) {
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
                    getFeatures.call(features
                        , table.features
                        , [scriptTag, lang].join(':')
                        , script.defaultLangSys.featureIndexes
                    );
                }
                if(script.langSysRecords) {
                    for(j=0,m=script.langSysRecords.length;j<m;j++){
                        lang = script.langSysRecords[j].tag;
                        getFeatures.call(features
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

    function markdownFormatFeatures(fontFileName, features) {
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
        text.push('\n**', key, '**: `');
        return text.join('');
    }

    function onLoadFont(idx, fontFileName, font) {
        /*jshint validthis:true*/
        var features = collectFeatures(font)
          , featuresMarkdown = markdownFormatFeatures(fontFileName, features)
          ;
        addMarkdownElement(this.fontElements[idx], featuresMarkdown);
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
