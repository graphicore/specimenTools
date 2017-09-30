define([
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    var weight2weightName = {
            250: 'Thin'
          , 275: 'ExtraLight'
          , 300: 'Light'
          , 400: 'Regular'
          , 500: 'Medium'
          , 600: 'SemiBold'
          , 700: 'Bold'
          , 800: 'ExtraBold'
          , 900: 'Black'
          // bad values (found first in WorkSans)
          , 260: 'Thin'
          , 280: 'ExtraLight'
        }
      , weight2cssWeight = {
            250: '100'
          , 275: '200'
          , 300: '300'
          , 400: '400'
          , 500: '500'
          , 600: '600'
          , 700: '700'
          , 800: '800'
          , 900: '900'
          // bad values (found first in WorkSans)
          , 260: '100'
          , 280: '200'
        }
      ;

    function FontsData(pubsub, options) {
        Parent.call(this, options);
        this._pubSub = pubsub;
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._data = [];
        Object.defineProperty(this._data, 'globalCache', {
            value: Object.create(null)
        });
    }

    var _p = FontsData.prototype = Object.create(Parent.prototype);
    _p.constructor = FontsData;

    FontsData.defaultOptions = {
        // This should be set explicitly to true (or a string containing
        // glyphs that are allowed to miss despite of being required in
        // languageCharSets or gfCharSets
        // The builtin FontsData.DEFAULT_LAX_CHAR_LIST is there for
        // convenience but may cause trouble!
        useLaxDetection: false
      , languageCharSets: null
      , charSets: null
      , minCharSetCoverage: 1
    };

    FontsData._cacheDecorator = function (k) {
        return function(fontIndex) {
            /*jshint validthis:true*/
            var args = [], i, l, data, cached;

            for(i=0,l=arguments.length;i<l;i++)
                args[i] = arguments[i];

            data = this._aquireFontData(fontIndex);
            if(!(k in data.cache))
                cached = data.cache[k] = this[k].apply(this, args);
            else
                cached = data.cache[k];
            return cached;
        };
    };

    FontsData._installPublicCachedInterface = function(_p) {
        var k, newk;
        for(k in _p) {
            newk = k.slice(1);
            if(k.indexOf('_get') !== 0
                        || typeof _p[k] !== 'function'
                        // don't override if it is defined
                        || newk in _p)
                continue;
            _p[newk] = FontsData._cacheDecorator(k);
        }
    };

    FontsData._getFeatures = function _getFeatures(features, langSys, featureIndexes) {
        /*jshint validthis:true*/
        var i,l, idx, tag;
        for(i=0,l=featureIndexes.length;i<l;i++) {
            idx = featureIndexes[i];
            tag = features[idx].tag;
            if(!this[tag])
                this[tag] = [];
            this[tag].push(langSys);
        }
    };

    FontsData.getFeatures = function getFeatures(font) {
        // get all gsub features:
        var features = {/*tag: ["{script:lang}", {script:lang}]*/}
          ,  table, scripts, i, l, j, m, script, scriptTag, lang
          ;
        if(!('gsub' in font.tables) || !font.tables.gsub.scripts)
            return features;
        table = font.tables.gsub;
        scripts = font.tables.gsub.scripts;
        for(i=0,l=scripts.length;i<l;i++) {
            script = scripts[i].script;
            scriptTag = scripts[i].tag;
            if(script.defaultLangSys) {
                lang = 'Default';
                FontsData._getFeatures.call(features
                  , table.features
                  , [scriptTag, lang].join(':')
                  , script.defaultLangSys.featureIndexes
                );
            }
            if(script.langSysRecords) {
                for(j = 0, m = script.langSysRecords.length; j < m; j++) {
                    lang = script.langSysRecords[j].tag;
                    FontsData._getFeatures.call(features
                      , table.features
                      , [scriptTag, lang].join(':')
                      , script.langSysRecords[j].langSys.featureIndexes
                    );
                }
            }
            return features;
        }
        // when supported by opentype.js, get all gpos features:
    };

    FontsData.sortCoverage = function sortCoverage(a, b) {
        if(a[1] === b[1])
            // compare the names of the languages, to sort alphabetical;
            return a[0].localeCompare(b[0]);
        return b[1] - a[1] ;
    };

    // These are characters that appear in the CLDR data as needed for
    // some languages, but we decided that they are not exactly needed
    // for language support.
    // These are all punctuation characters currently.
    // Don't just trust this list, and if something is terribly wrong
    // for your language, please complain!
    FontsData.DEFAULT_LAX_CHAR_LIST = new Set([
        0x0000 // NULL -> this is not necessary AFAIK (in legacy latin_unique-glyphs.nam)
      , 0x000D // CARRIAGE RETURN (CR) -> this is not necessary AFAIK (in legacy latin_unique-glyphs.nam)

        // PUA characters see google/fonts# 75
        // Used for foundry logo but not necessary.
        // (in legacy latin_unique-glyphs.nam)
      , 0xE0FF
      , 0xEFFD
      , 0xF000

        // we are working on getting these supported by the google encodings
      , 0x2010 // HYPHEN -> we usually use/include HYPHEN-MINUS: 0x002D
      , 0x2032 // PRIME
      , 0x2033 // DOUBLE PRIME
      , 0x02B9 // MODIFIER LETTER PRIME
      , 0x02BA // MODIFIER LETTER DOUBLE PRIME
      , 0x27e8 // MATHEMATICAL LEFT ANGLE BRACKET
      , 0x27e9 // MATHEMATICAL RIGHT ANGLE BRACKET
      , 0x2052 // COMMERCIAL MINUS SIGN
      , 0x2020 // DAGGER
      , 0x2021 // DOUBLE DAGGER
    ]);

    FontsData.getCharSetCoverage = function(testForChars /*string*/
                                , charset /*set*/, laxCharSet /*set*/) {
        var found = 0
          , i
          , total = testForChars.length
          , l = total
          , included = []
          , missing = []
          , laxSkipped = []
          , charCode
          ;
        for(i=0;i<l;i++) {
            charCode = testForChars.codePointAt(i);
            if(charset.has(charCode)) {
                found += 1;
                included.push(charCode);
            }
            else if(laxCharSet && laxCharSet.has(charCode)) {
                total = total-1;
                laxSkipped.push(charCode);
            }
            else
                missing.push(charCode);
        }
        return [found/total, found, total, missing, included, laxSkipped];
    };

    /**
     * Note that an empty string equals not using a lax char set.
     * But if chars is not a string, the default set will be returned.
     */
    FontsData.getLaxCharSet = function(chars) {
        var i, l, laxCharSet
          , charsIsString = typeof chars === 'string'
          ;
        if(charsIsString || (chars && isFinite(chars.length))) {
            laxCharSet = new Set();
            for(i=0,l=chars.length;i<l;i++)
                laxCharSet.add(charsIsString ? chars.codePointAt(i) : chars[i]);
        }
        else
            laxCharSet = FontsData.DEFAULT_LAX_CHAR_LIST;
        return laxCharSet;
    };

    FontsData.getCoverageInfo = function(testForCharsets, charset, useLaxDetection) {
        var result = Object.create(null)
          , key
          , laxCharList = FontsData.getLaxCharSet(useLaxDetection)
          ;

        for(key in testForCharsets) {
            // testForCharsets[key] is a string
            result[key] = FontsData.getCharSetCoverage(testForCharsets[key]
                                , charset, useLaxDetection && laxCharList);
        }
        return result;
    };

    FontsData.getLanguageCoverageForCharSet = function(languageCharSets, charset, useLaxDetection) {
        var coverage = FontsData.getCoverageInfo(languageCharSets, charset, useLaxDetection)
          , result = []
          , k, item
          ;
         // reformat and sort
         for(k in coverage) {
            item = [k];
            Array.prototype.push.apply(item, coverage[k]);
            result.push(item);
        }
        result.sort(FontsData.sortCoverage);
        return result;
    };

    FontsData.getLanguageCoverage = function (languageCharSets, font, useLaxDetection) {
        // FIXME: this charset could be cached per fontindex.
        // Duplicate in FontsData.getCharSetsCoverageInfo.
        var charSet = new Set(Object.keys(font.encoding.cmap.glyphIndexMap).map(function(k){return parseInt(k,10);}));
        return FontsData.getLanguageCoverageForCharSet(languageCharSets, charSet, useLaxDetection);
    };

    FontsData.getCharSetsCoverageInfoForCharSet = function(charSets, charset, useLaxDetection) {
        var extractedCharSets = Object.create(null)
          , k
          ;
        // prepare
        for(k in charSets)
            extractedCharSets[k] = charSets[k][0];

        return FontsData.getCoverageInfo(extractedCharSets, charset, useLaxDetection);
    };

    FontsData.getCharSetsCoverageInfo = function(charSets, font, useLaxDetection) {
        // FIXME: this charset could be cached per fontindex.
        // Duplicate in FontsData.getLanguageCoverage.
        var charSet = new Set(Object.keys(font.encoding.cmap.glyphIndexMap).map(function(k){return parseInt(k,10);}));
        return FontsData.getCharSetsCoverageInfoForCharSet(charSets, charSet, useLaxDetection);
    };

    _p._aquireFontData = function(fontIndex) {
        var data = this._data[fontIndex];
        if(!data)
            throw new Error('FontIndex "'+fontIndex+'" is not available.');
        return data;
    };

    _p._onLoadFont = function(fontIndex, fontFileName, font, originalArraybuffer) {
        this._data[fontIndex] = {
            font: font
          , fileName: fontFileName
          , originalArraybuffer: originalArraybuffer
          , cache: Object.create(null)
        };
    };

    _p.__getLanguageCoverage = function(fontIndex, useLaxDetection) {
        var languageCharSets = this._options.languageCharSets;
        if(!languageCharSets)
            throw new Error('To use "getLanguageCoverage" the optionial "languageCharSets" must be set.');
        return FontsData.getLanguageCoverage(languageCharSets, this._data[fontIndex].font, useLaxDetection);
    };

    _p.getLanguageCoverage = function(fontIndex) {
        var func = this._options.useLaxDetection
                                ? 'getLanguageCoverageLax'
                                : 'getLanguageCoverageStrict'
                                ;
        return this[func](fontIndex);
    };

    _p._getLanguageCoverageStrict = function(fontIndex) {
        return this.__getLanguageCoverage(fontIndex, false);
    };

    _p._getLanguageCoverageLax = function(fontIndex) {
        return this.__getLanguageCoverage(fontIndex, this._options.useLaxDetection || true);
    };
    ///////////////
    // START CHAR SETS INFO
    _p.__getCharSetsCoverage = function(fontIndex, useLaxDetection) {
        var charSets = this._options.charSets;
        if(!charSets)
            throw new Error('To use "getCharSetsCoverage" the optionial "charSets" must be set.');
        return FontsData.getCharSetsCoverageInfo(charSets, this._data[fontIndex].font, useLaxDetection);
    };

    _p.getCharSetsCoverage = function(fontIndex) {
        var func = this._options.useLaxDetection
                                    ? 'getCharSetsCoverageLax'
                                    : 'getCharSetsCoverageStrict'
                                    ;
        return this[func](fontIndex);
    };

    _p._getCharSetsCoverageStrict = function(fontIndex) {
        return this.__getCharSetsCoverage(fontIndex, false);
    };

    _p._getCharSetsCoverageLax = function(fontIndex) {
        return this.__getCharSetsCoverage(fontIndex, this._options.useLaxDetection || true);
    };

    /**
     * This is intended for analyzing rather than for specimen/end user application.
     * Thus we don't bother to cache the result and hence we can add more
     * arguments next to fontIndex.
     *
     * The returned coverage data in this case is formatted like the result
     * of `getLanguageCoverageLax/Strict`, so that it can be rendered with the
     * same function
     */
    _p.getCharSetsCoverageSorted = function(fontIndex, useLaxDetection) {
        var coverage =  this.__getCharSetsCoverage(
                                        fontIndex
                                      , useLaxDetection
                                            ? this._options.useLaxDetection
                                            : false
                                      )
          , charSets = this._options.charSets
          , result = []
          , name, entry
          ;
        for(name in coverage) {
            entry = [name];
            Array.prototype.push.apply(entry, coverage[name]);
            result.push(entry);
        }

        result.sort(function(a, b) {
            var sortIndexA, sortIndexB;
            if(a[1] !== b[1])
                // best coverage (the higher number) first
                return  b[1] - a[1];

            // sortIndexes are derived when prosessing the original Namelist files.
            sortIndexA = charSets[a[0]][a.length-1];
            sortIndexB = charSets[b[0]][b.length-1];
            return sortIndexA - sortIndexB;
        });
        return result;
    };

    function __collectCharSetsLanguages(names, charSets) {
        var langs = new Set()
          , result = []
          , ownLangs
          , i, l
          ;
        for(i=0,l=names.length;i<l;i++) {
            ownLangs = charSets[names[i]][1];
            ownLangs.forEach(Set.prototype.add, langs);
        }
        langs.forEach(function(item){result.push(item);});
        result.sort();
        return result;
    }

    _p.__getCharSetInfo = function (coverage, coveredLanguages, name) {
        var data = this._options.charSets[name]
          , ownLanguages= data[1]
          , deepDependencies = data[2] // array of charset names
          , inheritedLanguages = __collectCharSetsLanguages(deepDependencies
                                                ,  this._options.charSets)
          , ownCoveredLanguages = coveredLanguages && name in coveredLanguages
                                        ? coveredLanguages[name] : []
          , inheritedCoveredLanguages = []
          , inheritedCoveredLanguagesSet = new Set()
          , i, l, dependencyCharSetName
          ;

        function addToInheritedCoveredLanguages(lang) {
            if(inheritedCoveredLanguagesSet.has(lang))
                return;
            inheritedCoveredLanguagesSet.add(lang);
            inheritedCoveredLanguages.push(lang);
        }

        if(coveredLanguages) {
            // coveredLanguages: charset name => Array(languages supported).
            for(i=0,l=deepDependencies.length;i<l;i++) {
                dependencyCharSetName = deepDependencies[i];
                if(!(dependencyCharSetName in coveredLanguages))
                    continue;

                coveredLanguages[dependencyCharSetName]
                                .forEach(addToInheritedCoveredLanguages);
            }
        }

        return {
            name: name
          , charset: data[0]
          , ownLanguages: ownLanguages
          , inheritedLanguages: inheritedLanguages
          , allLanguages: inheritedLanguages.concat(ownLanguages).sort()
          , includedCharSets: data[2]
          , sortIndex: data[data.length-1]
          , laxSkipped: coverage ? coverage[name][5] : 0
          , coverage: coverage ? coverage[name][0] : 0
          , coverageDetails:  coverage ? coverage[name] : [0,0,0,0,0]
          , allCoveredLanguages: inheritedCoveredLanguages.concat(ownCoveredLanguages).sort()
          , inheritedCoveredLanguages: inheritedCoveredLanguages
          , ownCoveredLanguages: ownCoveredLanguages
        };
    };

    function _sortCharSetInfo(itemA, itemB) {
        return itemA.sortIndex - itemB.sortIndex;
    }

    /**
     * This for inspection tools.
     */
    _p.getFullCharSetsInfo = function() {
        var name, result = [];
        for(name in this._options.charSets)
            result.push(this.__getCharSetInfo(null, null, name));
        result.sort(_sortCharSetInfo);
        return result;
    };

    /**
     * No cache, so we can expose more arguments. This for inspection tools.
     */
    _p.getCharSetsInfoNoCache = function(fontIndex, useLaxDetection) {
        // this call will be cached actually
        var getCharSetsCoverageFunc =  useLaxDetection
                        ? 'getCharSetsCoverageLax'
                        : 'getCharSetsCoverageStrict'
          , coverage = this[getCharSetsCoverageFunc](fontIndex)
          , getLanguageCoverageFunc = useLaxDetection
                                ? 'getLanguageCoverageLax'
                                : 'getLanguageCoverageStrict'
          , languageCoverage = new Set(this[getLanguageCoverageFunc](fontIndex)
                     .filter(function(item){return item[1] === 1;})
                     .map(function(item){ return item[0];}))
          , name, allSupportedLanguages, ownCoveredLanguages
          , coveredLanguages = Object.create(null)
          ;

        for(name in this._options.charSets) {
            allSupportedLanguages = this._options.charSets[name][1];
            ownCoveredLanguages = allSupportedLanguages
                            .filter(Set.prototype.has, languageCoverage);
            if(!ownCoveredLanguages.length)
                continue;
            coveredLanguages[name] = ownCoveredLanguages;
        }
        // coveredLanguages is a map:
        // charset name => Array(languages supported).
        // if a charset name is missing, it has no supported languages
        return Object.keys(coveredLanguages)
            .map(this.__getCharSetInfo.bind(this, coverage, coveredLanguages))
            .sort(_sortCharSetInfo)
            ;
    };

    _p.getCharSetsInfo = function(fontIndex) {
        var func = this._options.useLaxDetection
                                    ? 'getCharSetsInfoLax'
                                    : 'getCharSetsInfoStrict'
                                    ;
        return this[func](fontIndex);
    };

    _p._getCharSetsInfoLax = function(fontIndex) {
        return this.getCharSetsInfoNoCache(fontIndex
                                    , this._options.useLaxDetection || true
                                    , this._options.minCharSetCoverage);
    };

    _p._getCharSetsInfoStrict = function(fontIndex) {
        return this.getCharSetsInfoNoCache(fontIndex
                                    , false
                                    , this._options.minCharSetCoverage);

    };
    // END CHAR SETS INFO
    ///////////////////////

    _p._getSupportedLanguages = function(fontIndex) {
        var coverage = this.getLanguageCoverage(fontIndex)
          , i, l
          , result = [], language, support
          ;
        for(i=0,l=coverage.length;i<l;i++) {
            language = coverage[i][0];
            support = coverage[i][1];
            if(support === 1)
                result.push(language);
        }
        result.sort();
        return result;
    };

    _p._getSupportedLanguagesByCharSets = function(fontIndex) {
        var languagesSet = new Set()
          , result = []
          ;
        this.getCharSetsInfo(fontIndex).forEach(function(item) {
            item.ownLanguages.forEach(Set.prototype.add, languagesSet);
        });
        languagesSet.forEach(function(item){result.push(item);});
        result.sort();
        return result;
    };

    _p._getNumberGlyphs = function(fontIndex) {
        return this._data[fontIndex].font.glyphNames.names.length;
    };

    _p._getFeatures = function(fontIndex) {
        return FontsData.getFeatures(this._data[fontIndex].font);
    };

    _p._getFamilyName  = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;
        fontFamily = fontFamily.split('-')[0];
        
        if (typeof this._options.overwrites === "object" && typeof this._options.overwrites[fontFamily] === "string") {
                fontFamily = this._options.overwrites[fontFamily]
        }

        return fontFamily
    };

    _p._getOS2FontWeight = function(fontIndex) {
        var font = this._data[fontIndex].font;
        return font.tables.os2.usWeightClass;
    };

    // Keeping this, maybe we'll have to transform this name further for CSS?
    _p._getCSSFamilyName = _p._getFamilyName;

    _p._getIsItalic = function(fontIndex) {
        var font = this._data[fontIndex].font
          , italicFromOS2 = !!(font.tables.os2.fsSelection & font.fsSelectionValues.ITALIC)
          , subFamily = this.getSubfamilyName(fontIndex).toLowerCase()
          , italicFromName = subFamily.indexOf("italic") !== -1
          ;
        return italicFromOS2 || italicFromName;
    };

    _p.getFamiliesData = function() {
        var cacheKey = 'getFamiliesData';
        if(cacheKey in this._data.globalCache)
            return this._data.globalCache[cacheKey];

        var families = Object.create(null)
          , weightDict, styleDict
          , fontFamily, fontWeight, fontStyle
          , fontIndex, l
          , result
          ;
        for(fontIndex=0,l=this._data.length;fontIndex<l;fontIndex++) {
            fontFamily  = this.getFamilyName(fontIndex);
            fontWeight = this.getCSSWeight(fontIndex);
            fontStyle = this.getCSSStyle(fontIndex);

            weightDict = families[fontFamily];
            if(!weightDict)
                families[fontFamily] = weightDict = Object.create(null);

            styleDict = weightDict[fontWeight];
            if(!styleDict)
                weightDict[fontWeight] = styleDict = Object.create(null);

            if(fontStyle in styleDict) {
                console.warn('A font with weight ' + fontWeight
                                + ' and style "'+fontStyle+'"'
                                + ' has already appeared for '
                                +'"' +fontFamily+'".\nFirst was the file: '
                                + styleDict[fontStyle] + ' '
                                + this.getFileName(styleDict[fontStyle])
                                + '.\nNow the file: ' + fontIndex + ' '
                                +  this.getFileName(fontIndex)
                                + ' is in conflict.\nThis may hint to a bad '
                                + 'OS/2 table entry.\nSkipping.'
                                );
                continue;
            }
            // assert(fontStyle not in weightDict)
            styleDict[fontStyle] = fontIndex;
        }

        result =  Object.keys(families).sort()
              .map(function(key){ return [key, this[key]];}, families);
        this._data.globalCache[cacheKey] = result;
        return result;
    };

    // no need to cache these: No underscore will prevent
    //_installPublicCachedInterface from doing anything.
    _p.getNumberSupportedLanguages = function(fontIndex) {
        return this.getSupportedLanguages(fontIndex).length;
    };

    _p.getNumberSupportedLanguagesByCharSets = function(fontIndex) {
        return this.getSupportedLanguagesByCharSets(fontIndex).length;
    };

    // used for inspection tool
    _p.getUseLaxDetection = function() {
        var chars, laxData, charList;
        if(!this._options.useLaxDetection)
            return 'False';
        chars = [];
        charList = [];

        laxData = FontsData.getLaxCharSet(this._options.useLaxDetection);
        laxData.forEach(function(item) {
            charList.push(item);
        });
        charList.sort();

        charList.forEach(function(item) {
            var hex = item.toString(16)
              , formatted = ['"'
                            , String.fromCodePoint(item)
                            , '" 0x'
                            , ('0000' + hex).slice(-Math.max(4, hex.length))
                            ].join('')
              ;
            chars.push(formatted);
        });

        return 'True: ' + chars.join(', ');
    };

    _p.getFont = function(fontIndex) {
        return this._aquireFontData(fontIndex).font;
    };

    _p.getFileName = function(fontIndex) {
        return this._aquireFontData(fontIndex).fileName;
    };

    _p.getOriginalArraybuffer = function(fontIndex) {
        return this._aquireFontData(fontIndex).originalArraybuffer;
    };

    _p.getCSSWeight = function(fontIndex) {
        return weight2cssWeight[this.getOS2FontWeight(fontIndex)];
    };

    _p.getWeightName = function(fontIndex) {
        return weight2weightName[this.getOS2FontWeight(fontIndex)];
    };

    _p.getCSSStyle = function(fontIndex) {
        return this.getIsItalic(fontIndex) ? 'italic' : 'normal';
    };

    _p.getStyleName = function(fontIndex) {
        return this.getWeightName(fontIndex) + (this.getIsItalic(fontIndex) ? ' Italic' : '');
    };

    _p.getPostScriptName = function(fontIndex) {
        return this._aquireFontData(fontIndex).font.names.postScriptName;
    };

    _p.getSubfamilyName = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily, subFamily
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;

        // delete all before and incuded the first "-", don't use PS subfamily string
        // but extract from full PS name;
        // also use the entrie name if no "-" was found
        if (fontFamily.indexOf("-") > -1) {
            subFamily = fontFamily.substring(fontFamily.indexOf("-") + 1);
        } else {
            subFamily = fontFamily;
        }
        return subFamily;
    };

    _p.getGlyphByName = function(fontIndex, name) {
        var font = this._aquireFontData(fontIndex).font
          , glyphIndex = font.glyphNames.nameToGlyphIndex(name)
          , glyph = font.glyphs.get(glyphIndex)
          ;
        return glyph;
    };

    _p.getFontValue = function(fontIndex, name /* like: "xHeight" */) {
        var font = this._aquireFontData(fontIndex).font;
        switch(name){
            case('xHeight'):
                return font.tables.os2.sxHeight;
            case('capHeight'):
                 return font.tables.os2.sCapHeight;
            case('ascender'):
            /*falls through*/
            case('descender'):
                return font[name];
            default:
                console.warn('getFontValue: don\'t know how to get "'+ name +'".');
        }
    };

    function familiesDataReducer(all, item) {
        var i, l, weightDict, weights, styles, result = [];
        weightDict = item[1];
        weights = Object.keys(weightDict).sort();
        for(i=0,l=weights.length;i<l;i++) {
            styles = weightDict[weights[i]];
            if('normal' in styles)
                result.push(styles.normal);
            if('italic' in styles)
                result.push(styles.italic);
        }
        return all.concat(result);
    }

    _p.getFontIndexesInFamilyOrder = function(){
        var familiesData = this.getFamiliesData();
        return familiesData.reduce(familiesDataReducer, []);
    };

    _p.getFontIndexes = function() {
        var fontIndex, l, result = [];
        for(fontIndex=0,l=this._data.length;fontIndex<l;fontIndex++)
            result.push(fontIndex);
        return result;
    };

    FontsData._installPublicCachedInterface(_p);
    return FontsData;
});
