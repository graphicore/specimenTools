define([
    'loadFonts'
], function(
    loadFonts
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

    function onLoadFont(element, idx, fontFileName, font) {
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
            console.log(fontFileName, 'features', features);
        }
    }

    function main(document, fontFiles) {
        var container = document.createElement('div');
        document.body.appendChild(container);
        loadFonts (fontFiles, [], [onLoadFont.bind(null, container)]);
    }

    return main;
});
