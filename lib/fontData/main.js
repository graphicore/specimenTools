define([
    'specimenTools/loadFonts'
  , 'specimenTools/fontControl/PubSub'
  , 'marked'
  , './FontsData'
], function(
    loadFonts
  , PubSub
  , marked
  , FontsData
) {
    "use strict";
    /*jshint esnext:true*/


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

    function markdownFormatLanguageCoverage(coverage) {
        var i,l,language,support, text = ['### Language Coverage\n'];
        for(i=0,l=coverage.length;i<l;i++) {
            language = coverage[i][0];
            support = coverage[i][1];
            if(support === 0)
                continue;
            text.push('**', language ,'**: ', Math.round(support*100)
                    , ' % ',  coverage[i][2] , ' of ',  coverage[i][3]
                    , (support > 0.9 && support < 1
                            ? ' missing: ' + coverage[i][4].map(charCode =>
                                    'U+' + (('0000' + charCode.toString(16)).slice(-4))
                              ).join(' ')
                            : ''
                      )
                    , '  \n');
        }
        return text.join('');
    }

    function markdownFormatGlyphsCount(count) {
        var text = ['### Glyphs Count\n', count];
        return text.join('');
    }

    function onLoadFont(idx, fontFileName, font) {
        /*jshint validthis:true, unused:vars */
        var features = this.fontsData.getFeatures(idx)
          , featuresMarkdown = markdownFormatFeatures(features)
          , glyphsCount = this.fontsData.getNumberGlyphs(idx)
          , glyphsCountMarkdown = markdownFormatGlyphsCount(glyphsCount)
          , coverage =  this.fontsData.getLanguageCoverage(idx)
          , languagesMarkdown = markdownFormatLanguageCoverage(coverage)
          ;
        addMarkdownElement(this.fontElements[idx], featuresMarkdown);
        addMarkdownElement(this.fontElements[idx], glyphsCountMarkdown);
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
          , pubsub = new PubSub()
          , fontsData = new FontsData(pubsub, {useLaxDetection: true})
          , state = Object.create(null)
          ;
        state.fontElements = [];
        state.fontsData = fontsData;
        document.body.appendChild(container);

        pubsub.subscribe('prepareFont' , addFont.bind(state, container));
        pubsub.subscribe('loadFont' , onLoadFont.bind(state));

        loadFonts (fontFiles, pubsub);
    }

    return main;
});
