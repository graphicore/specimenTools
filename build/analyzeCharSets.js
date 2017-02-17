#! /usr/bin/env node

"use strict";
// jshint esnext:true

var fs = require('fs')
  , child_process = require('child_process')
  , requirejs = require('requirejs')
  , path = require('path')
  ;

requirejs.config({
    baseUrl: path.normalize(path.dirname(process.argv[1]) + '/../lib')
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
  , nodeRequire: require
  , paths: {specimenTools: '.'}
});
requirejs.config(requirejs('setup'));
var FontsData = requirejs('specimenTools/services/FontsData');

var languageCharSetsJson =  requirejs('!require/text!../build/languageCharSets_with_locales.json')
  , languageCharSets = JSON.parse(languageCharSetsJson)
  ;

function getLangData(languageCharset, googleCharsets, alphabetKey){
    var result = {
            charsetNames: null
          , notFoundChars: null
        }
      , k, i, l
      , charset
      , charsetNames = new Set()
      , languageChars = new Set(languageCharset.split(''))
      , notFoundChars = new Set()
      ;
    for(k in googleCharsets) {
        charset = googleCharsets[k][alphabetKey]
                + googleCharsets[k].symbols
                + googleCharsets[k].numerals
                ;
        charset = charset.replace('\n', '').replace(' ', '');



        for(i=0,l=charset.length;i<l;i++)
            if(languageChars.has(charset[i]))
                charsetNames.add(k);
            else
                notFoundChars.add(charset[i]);
    }
    result.charsetNames = Array.from(charsetNames);
    result.notFoundChars = Array.from(notFoundChars).join('');
    return result;
}

function wrongLanguageInfo(languagesCharsetsFile, googleCharsetsFile) {
    var languagesCharsets = JSON.parse(fs.readFileSync(languagesCharsetsFile))
      , googleCharsets = JSON.parse(fs.readFileSync(googleCharsetsFile))
      , k, data
      , langData = Object.create(null)
      , langDataMinimal = Object.create(null)
      ;
    // "Thai": {
    //     "alphabet": "ก ข ฃ ค ฅ ฆ ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม  ย ร ล ว ศ ษ ส ห ฬ อ ฮ ะ ั ็ า ิ ่ ํ ุ ู เ ใ ไ โ ฤ ฤๅ ฦ ฦๅ ่  ้  ๊  ๋",
    //     "minimalSet": "ก ข ค ฆ ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม  ย ร ล ว ศ ษ ส ห ฬ อ ฮ ะ า เ ใ ไ โ ฤ ฤๅ",
    //     "numerals": "๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙",
    //     "symbols": "ๆ ฯ ฯลฯ ๏ ๚ ๛  ┼  \\"
    //


    // the aim is to have:
    //      languageName => {
    //          charsetNames: []
    //        , notFoundChars: []
    //      }
    //
    // and eventually
    //      charsetName => {
    //          supportedLanguages: []
    //      }

    for(k in languagesCharsets) {
        data = getLangData(languagesCharsets[k], googleCharsets, 'alphabet');
        //if(!data.notFoundChars.length)
            langData[k] = data;
        data = getLangData(languagesCharsets[k], googleCharsets, 'minimalSet');
        //if(!data.notFoundChars.length)
            langDataMinimal[k] = data;
    }
    // console.log(JSON.stringify({
    //     langData: langData
    //   , langDataMinimal: langDataMinimal
    // }, null, 4));
    console.log(JSON.stringify(langData, null, 4));

}

function parseNamHeader(lines) {
    var result = {
            lines: lines
          , includes: []
        }
      , i, l, line, keyword, args
      ;
    for(i=0,l=lines.length;i<l;i++) {
        line = lines[i];
        if( line.slice(0,2) !== '#$' )
            // non functional line
            continue;
        line = line.slice(2).trimLeft();
        keyword = line.split(' ', 1)[0];
        args = line.slice(keyword.length);
        switch(keyword) {
            case 'include':
                args = args.trim();
                if(args)
                    result.includes.push(args);
                break;
            // default:
        }
    }
    return result;
}

function parseNam(str, returnCodePoints) {
    // File format is described in https://github.com/google/fonts/tree/master/tools/encodings
    //    " The subsetting requires that each line must start with 0x and then
    //      have 4 uppercase hex digits; what follows is an arbitrary description
    //      to the end of the line. Comments are lines starting with #.
    // Though! we have lines that do not include a unicode, i.e. start with
    // whitespace, e.g. in https://github.com/google/fonts/blob/master/tools/encodings/GF%202016%20Glyph%20Sets/GF-latin-expert_unique-glyphs.nam
    // we find lines like this: "          acircumflexdotbelow.sc"
    // In here, for now, we'll ignore all lines that don't "start with 0x and then
    // have 4 uppercase hex digits"
    // FIXME: update the nam file documentation to reflect the use for glyphs
    // that have no unicode value. (line starts with 6 spaces?)

    var result = []
      , lines = str.split('\n')
      , i, l, line
      , test, match, unicode
      , uniReg=/^[A-F0-9]{4,5}/
      , extractingHeader = true
      , headerLines = []
      ;
    for(i=0,l=lines.length;i<l;i++) {
        line = lines[i];
        if(extractingHeader) {
            // The header is a series of comment lines at the beginning
            // of the file. The first non-comment line ends the header.
            if(line[0] === '#') {
                headerLines.push(line);
                continue;
            }
            else
                // first non-comment line, go on to regular parsing
                extractingHeader = false;
        }
        if(line.slice(0,2) !== '0x')
            continue;

        test = line.slice(2,7);
        match = uniReg.exec(test);
        if(match === null) {
            if ((match = uniReg.exec(test.toUpperCase())) !== null)
                console.warn('Found lowercase codepoint, but must be uppercase: ' + line.slice(0,6));
            continue;
        }
        unicode = match[0];
        result.push([
                // unicode char
                returnCodePoints
                    ? parseInt(unicode, 16)
                    : String.fromCodePoint(parseInt(unicode, 16))
                // arbitrary description
              , line.slice(2+unicode.length)
        ]);
    }
    result.header = parseNamHeader(headerLines);
    return result;
}

function parseNamFromFile(namFile, returnCodePoints) {
    return parseNam(fs.readFileSync(namFile, {encoding: 'utf8'}), returnCodePoints);
}

function namFile2charSet(namFile, returnCodePoints) {
    return new Set(parseNamFromFile(namFile, returnCodePoints).map(item=>item[0]));
}

function languageCoveredByCharset(languageCharset, charset, collectMissing) {
    var i, l, missing = collectMissing ? [] : null;
    for(i=0,l=languageCharset.length;i<l;i++) {
        if(charset.has(languageCharset[i]))
            continue;
        if(!collectMissing)
            return [false, missing];
        missing.push(languageCharset[i]);
    }
    return [collectMissing
                    ? (missing.length === 0)
                    : true
            , missing
            ];
}

function languagesCoveredByCharset(languagesCharsets, charset) {
    var language, coveredLanguages = [], r;
    for (language in languagesCharsets) {
        if(!(r = languageCoveredByCharset(languagesCharsets[language], charset, true))[0])
            continue;
        coveredLanguages.push(language);
    }
    coveredLanguages.sort();
    return coveredLanguages;
}

function getLanguagesCharsets(languagesCharsetsFile) {
    return JSON.parse(fs.readFileSync(languagesCharsetsFile));
}


function getNamFiles(dir) {
    if(!fs.lstatSync(dir).isDirectory())
        // don't use this shell injection with input that is not a dir name
        throw new Error('dir "'+dir+'" is not a directory');
    var r = child_process.spawnSync('find'
                            , [dir, '-type', 'f', '-name', '*.nam']
                            , {
                                  maxBuffer: 200000000
                                , encoding: 'utf8'
                                , stdio: 'pipe',
                            }
            );
    return r.output[1].split('\n').filter(item => item.length >= 1);
}

function printCoverage(namFile, coverage, useLax) {
    var i, l, missing, maxShowMissing = 10;
    console.log(namFile);
    console.log('lax language detection:', useLax);

    for(i=0,l=coverage.length;i<l;i++) {
        if(coverage[i][1] === 0) // optionally include all?
            continue;
        missing = coverage[i][4];
        console.log('language:', coverage[i][0]
                  , Math.round(coverage[i][1]*100), '%' //percent
                  , 'having:', coverage[i][2]
                  , 'needed:', coverage[i][3]
                  , 'missing:', missing.length + (missing.length
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
                  , 'laxSkipped:', coverage[i][6].length
        );
    }
}

function printCoverageShort(namFile, coverage, useLax, coverageThreshold) {
    var i, l
      , ct = coverageThreshold === undefined
                                        ? 1
                                        : coverageThreshold
      , result = []
      , item
      ;

    for(i=0,l=coverage.length;i<l;i++) {
        if(coverage[i][1] < ct)
            continue;
        if(coverage[i][1] !== 1)
            item = [coverage[i][0],' (', coverage[i][1]*100, '%)'].join('');
        else
            item = coverage[i][0];
        result.push(item);
    }
    if(result.length)
        console.log(namFile +':', result.join(', '));
}

function languageCoveragePerNamFile(namDir) {
    var namFiles = getNamFiles(namDir)
      , useLax = true
      , i, l
      ;
    for(i=0,l=namFiles.length;i<l;i++) {
        if(i!==0)
            console.log('======================');
        _languageCoverageforNamFile(namFiles[i], useLax);
    }
}

function _languageCoverageforNamFile(namFile, useLax) {
    var charset =  namFile2charSet(namFile, true)
      , coverage = FontsData.getLanguageCoverageForCharSet(languageCharSets, charset, useLax)
      ;
    printCoverage(namFile, coverage, useLax);
}

function languageCoverageforNamFile(namFile) {
    var useLax = true;
    _languageCoverageforNamFile(namFile, useLax);
}

function LanguageCoverage(useLax) {
    this._namFiles = Object.create(null);
    this._includesRecursionDetection = new Set();
    Object.defineProperty(this, 'useLax', {
        value: !!useLax
      , enumerable: true
      // useLax should never be changed in the lifetime of an instance,
      // or we'd have to prune all caches. So rather use two instances,
      // depending on the case.
      , writable: false
    });
}

function RecursionError(message) {
    this.name = 'RecursionError';
    this.message = message;
    this.stack = (new Error()).stack;
}
RecursionError.prototype = Object.create(Error.prototype);
RecursionError.prototype.constructor = RecursionError;

var _p = LanguageCoverage.prototype;

_p._loadIncludes = function(baseDir, files) {
    var includes = new Set(), result = [], include, i, l;
    for(i=0,l=files.length;i<l;i++) {
        try {
            include = this._parseNam([baseDir, files[i]].join('/'));
        }
        catch (err) {
            if(!(err instanceof RecursionError))
                throw err;
            // pass with a warning, a recursively included set wouldn't
            // add any extra information or change the existing set.
            console.warn(err.message);
            continue;
        }
        if(includes.has(include))
            continue;
        includes.add(include);
        // not sure if order will be important, just in case we keep it
        // in this array rather than loosing it in the includes set.
        result.push(include);
    }
    return result;
};

_p.__parseNam = function (fileName) {
    var data = parseNamFromFile(fileName, true)
      , dirname = path.dirname(fileName)
      , includes = this._loadIncludes(dirname, data.header.includes)
      , ownCharset = new Set(data.map(item=>item[0]))
      , charset = new Set()
      , name, nameParts
      ;
    // the union of each included charset and this charset
    includes.concat({charset:ownCharset})
            .forEach(item => item.charset
                                 // add all chars to charset
                                 .forEach(Set.prototype.add, charset));

    // The name could be defined in the header as well.
    // GF-latin-plus_unique-glyphs.nam
    // GF-latin-pro_unique-glyphs.nam
    // GF-latin-pro_optional-glyphs.nam
    // latin_unique-glyphs.nam
    // latin-ext_unique-glyphs.nam
    nameParts = path.basename(fileName).split('.', 1)[0].split('_');
    name = nameParts[0].split('-')
                .filter(token => token !== 'GF')
                .map(token => token === 'ext' ? 'Extended' : (token[0].toUpperCase() + token.slice(1)))
                ;
    if(nameParts[1].includes('optional'))
       name.push('Optional');
    // Latin Plus
    // Latin Pro
    // Latin Pro Optional
    // Latin
    // Latin Extended
    name = name.join(' ');

    return {
        fileName: fileName
      , name: name
      , ownCharset: ownCharset
      , includes: includes
      , languageSupport: null // placeholder
      , charset: charset
    };
};

_p._parseNam = function(namFile) {
    var fileName = path.normalize(namFile)
      , result
      ;
    if(this._includesRecursionDetection.has(fileName))
        throw new RecursionError(fileName);
    this._includesRecursionDetection.add(fileName);
    result = this._namFiles[namFile];
    if(!result)
        result = this._namFiles[namFile] = this.__parseNam(namFile);
    this._includesRecursionDetection.delete(fileName);
    return result;
};

_p.getNamelist = function(namFile, ensureLanguageSupport) {
    if(ensureLanguageSupport)
        this.getLanguageSupport(namFile);
    return this._parseNam(namFile);
};

_p.getLanguageSupport = function(namFile) {
    var item = this._parseNam(namFile)
      , coverage = FontsData.getLanguageCoverageForCharSet(languageCharSets, item.charset, this.useLax)
      , ownCoverage = []
      , ownCoveredLanguages = new Set()
      , coveredLanguages = new Set()
      , languagesCoveredByIncludes = new Set()
      , i, l, includeLangSupport, lang
      ;

    for(i=0,l=item.includes.length;i<l;i++) {
        includeLangSupport = this.getLanguageSupport(item.includes[i].fileName);
        includeLangSupport.coveredLanguages
                .forEach(Set.prototype.add, languagesCoveredByIncludes);

    }

    for(i=0,l=coverage.length;i<l;i++) {
        if(coverage[i][1] !== 1) {
            // so we don't loose the info of what is not fully covered
            ownCoverage.push(coverage[i]);
            continue;
        }
        lang = coverage[i][0];
        coveredLanguages.add(lang);
        if(languagesCoveredByIncludes.has(lang))
            continue;
        ownCoveredLanguages.add(lang);
        ownCoverage.push(coverage[i]);
    }

    item.languageSupport = {
        coverage: coverage
      , coveredLanguages: coveredLanguages
      , ownCoveredLanguages: ownCoveredLanguages
      , ownCoverage: ownCoverage
      , languagesCoveredByIncludes: languagesCoveredByIncludes
    };
    return item.languageSupport;
};

function fancyLanguageCoveragePerNamFile(namDir) {
    var useLax = true
      , languageCoverage = new LanguageCoverage(useLax)
      , namFiles = getNamFiles(namDir)
      , i, l, coverage
      , args = Array.from(arguments)
      ;
    for(i=0,l=namFiles.length;i<l;i++) {
        coverage = languageCoverage.getLanguageSupport(namFiles[i]).ownCoverage;
        if(args.includes('--short')) {
            printCoverageShort(namFiles[i], coverage, useLax, 0.9);
            continue;
        }
        if(i!==0)
            console.log('======================');
        printCoverage(namFiles[i], coverage, useLax);
    }
}

function glyphSetInfo(namDir) {
    // FIXME: use false here and then useLax when matching fonts to char sets
    // of course, after the glyph sets have been updated.
    var useLax = true
      , languageCoverage = new LanguageCoverage(useLax)
      , namFiles = getNamFiles(namDir)
      , i, l
      // , args = Array.from(arguments)
      , result = Object.create(null)
      , namelist
      , sortIndex = Object.create(null)
      ;


    namFiles.map(filenameToSortInfo)
            .sort(sortNameLists)
            .forEach((item, i)=> sortIndex[item.fileName] = i)
            ;

    for(i=0,l=namFiles.length;i<l;i++) {
        namelist = languageCoverage.getNamelist(namFiles[i], true);
        result[namelist.name] = [
            // to match the fonts to the char sets
            Array.from(namelist.ownCharset).sort().map(cp => String.fromCodePoint(cp)).join('')
            // to show the supported languages
          , namelist.languageSupport.ownCoverage.filter(item => item[1] === 1).map(item => item[0])
           // for constant order when displaying
          , sortIndex[namFiles[i]]
        ];
    }
    console.log(JSON.stringify(result));
}

function filenameToSortInfo(fileName) {
    // GF-latin-plus_unique-glyphs.nam
    // GF-latin-pro_unique-glyphs.nam
    // GF-latin-pro_optional-glyphs.nam
    // latin_unique-glyphs.nam
    // latin-ext_unique-glyphs.nam
    var nameParts = path.basename(fileName).split('.', 1)[0].split('_')
      , name = nameParts[0].split('-')
                .filter(token => token !== 'GF')
                .map(token => token === 'ext' ? 'Extended' : token)
                ;
    if(nameParts[1].includes('optional'))
       name.push('Optional');
    // Latin Plus
    // Latin Pro
    // Latin Pro Optional
    // Latin
    return {
        lang: name[0].toLowerCase()
      , type: (name[1] || '').toLowerCase()
      , optional: nameParts[1].toLowerCase().includes('optional')
      , fileName: fileName
    };
}

function sortNameLists(a, b) {
    var aFirst = -1
      , bFirst = 1
      , types = {
            'plus': 1
          , 'pro': 2
          , 'expert': 3
        }
      ;
    if(a.lang !== b.lang) {
        // latin is always first, because we have everything depending on it.
        if(a.lang === 'latin')
            return aFirst;
        if(b.lang === 'latin')
            return bFirst;
        return a.lang < b.lang ? aFirst : bFirst;
    }

    if(a.type !== b.type) {
        if(a.type in types || b.type in types)
            return (types[a.type] || 100) - (types[b.type] || 100);
        return a.type < b.type ? aFirst : bFirst;
    }

    if(a.optional !== b.optional)
        return a.optional ? bFirst : aFirst;

    // it's the same!
    return 0;
}


function main(command, args) {
    var func = ({
        wrongLanguageInfo: wrongLanguageInfo
      , listNamFiles: function(dir){ console.log(getNamFiles(dir).join('\n')); }
      , languageCoverage: languageCoveragePerNamFile
      , languageCoveragePerFile: languageCoverageforNamFile
      , fancyLanguageCoverage: fancyLanguageCoveragePerNamFile
      , glyphSetInfo: glyphSetInfo
    })[command];
    if(!func)
        throw new Error('Subcommand "'+command+'" not found.');
    func.apply(null, args);
}

if (require.main === module)
    var command = process.argv[2]
      , commandArgs = process.argv.slice(3)
      ;
    main(command, commandArgs);
