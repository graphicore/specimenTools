#! /usr/bin/env node

/*

There's one main use for this script currently:

specimenTools/build$ ./analyzeCharSets.js glyphSetInfo googleFontsTools/encodings/ --sublocales > ../lib/services/googleFontsCharSetsWithSublocales.json
specimenTools/build$ ./analyzeCharSets.js glyphSetInfo googleFontsTools/encodings/ > ../lib/services/googleFontsCharSets.json
*/

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
var FontsData = requirejs('specimenTools/services/FontsData')
  , languageCharsetsAdresses = {
        standard: '!require/text!specimenTools/services/languageCharSets.json'
      , sublocales: '!require/text!specimenTools/services/languageCharSetsWithSublocales.json'
    }
  , _languageCharsetsData = {}
  ;

// key = 'standard' | 'sublocales'
function getLanguageCharSets(key) {
    var result = _languageCharsetsData[key];
    if(!result)
        _languageCharsetsData[key] = result = JSON.parse(
                                requirejs(languageCharsetsAdresses[key]));
    return result;
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

function LanguageCoverage(languageCharSets, useLax) {
    this._namFiles = Object.create(null);
    this._languageCharSets = languageCharSets;
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

function _collectIncludes(allIncludes, item) {
    if(allIncludes.has(item))
        return;
    allIncludes.add(item);
    item.allIncludes.forEach(_collectIncludes.bind(null, allIncludes));
}

function _nameFromPath(filePath) {
    // path:
    //       some/path/GF-latin-plus_unique-glyphs.nam
    //       some/path/GF-latin-pro_unique-glyphs.nam
    //       some/path/GF-latin-pro_optional-glyphs.nam
    //       some/path/latin_unique-glyphs.nam
    //       some/path/latin-ext_unique-glyphs.nam
    var nameParts = path.basename(filePath).split('.', 1)[0].split('_')
      , name = nameParts[0].split('-')
                .filter(token => token !== 'GF')
                .map(token => token === 'ext'
                        ? 'Extended'
                        : (token[0].toUpperCase() + token.slice(1)))
      , optional = nameParts[1] && nameParts[1].includes('optional')
    ;
    if(optional) {
       name.push('Optional');
       name.optional = true;
    }
    // ['Latin', 'Plus']
    // ['Latin', 'Pro']
    // ['Latin', 'Pro', 'Optional']
    // ['Latin']
    // ['Latin', 'Plus']
    return name;
}

_p.__parseNam = function (fileName) {
    var data = parseNamFromFile(fileName, true)
      , dirname = path.dirname(fileName)
      , includes = this._loadIncludes(dirname, data.header.includes)
      , ownCharset = new Set(data.map(item=>item[0]))
      , charset = new Set()
      , allIncludes = new Set()
      , name = _nameFromPath(fileName).join(' ')
      ;
    // the union of each included charset and this charset
    includes.concat({charset:ownCharset})
            .forEach(item => item.charset
                                 // add all chars to charset
                                 .forEach(Set.prototype.add, charset));
    includes.forEach(_collectIncludes.bind(null, allIncludes));

    return {
        fileName: fileName
      , name: name
      , ownCharset: ownCharset
      , includes: includes
      , allIncludes: allIncludes
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
      , coverage = FontsData.getLanguageCoverageForCharSet(this._languageCharSets, item.charset, this.useLax)
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

function languageCoveragePerNamFile(namDir) {
    var useLax = true
      , args = Array.from(arguments)
      , sublocales = args.includes('--sublocales') ? 'sublocales' : 'standard'
      , languageCharSets = getLanguageCharSets(sublocales)
      , languageCoverage = new LanguageCoverage(languageCharSets, useLax)
      , namFiles = getNamFiles(namDir)
      , i, l, coverage
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
      , args = Array.from(arguments)
      , sublocales = args.includes('--sublocales') ? 'sublocales' : 'standard'
      , languageCharSets = getLanguageCharSets(sublocales)
      , languageCoverage = new LanguageCoverage(languageCharSets, useLax)
      , namFiles = getNamFiles(namDir)
      , i, l
      // , args = Array.from(arguments)
      , result = Object.create(null)
      , namelist
      , sortIndex = Object.create(null)
      ;


    namFiles.map(filenameToSortInfo.bind(null, languageCoverage))
            .sort(sortNameLists)
            .forEach((item, i)=> sortIndex[item.fileName] = i)
            ;

    for(i=0,l=namFiles.length;i<l;i++) {
        namelist = languageCoverage.getNamelist(namFiles[i], true);
        result[namelist.name] = [
            // [0] to match the fonts to the char sets
            Array.from(namelist.ownCharset).sort((a,b)=>a-b).map(cp => String.fromCodePoint(cp)).join('')
            // [1] to show the own supported languages
          , namelist.languageSupport.ownCoverage.filter(item => item[1] === 1).map(item => item[0])
            // [2] to show the inherited supported languages
          , Array.from(namelist.allIncludes)
                 .sort((a,b)=>sortIndex[a.fileName] - sortIndex[b.fileName])
                 .map(item=>item.name)
           // [length-1] for constant order when displaying
          , sortIndex[namFiles[i]]
        ];
    }

    console.log(JSON.stringify(result));//,  null, 4));
}

function filenameToSortInfo(languageCoverage, fileName) {
    // this could be a method of the class of languageCoverage
    var namelist = languageCoverage.getNamelist(fileName)
      , name = _nameFromPath(fileName)
      ;

    return {
        lang: name[0].toLowerCase()
      , type: (name[1] || '').toLowerCase()
      , optional: !!fileName.optional
      , fileName: fileName
      , dependencies: namelist.allIncludes.size
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

    // to make this useful we have to include into optional glyph sets
    // as well. otherwise, they are sorted higher than their unique counterparts
    // (which they should include)
    if(a.dependencies !== b.dependencies)
        return a.dependencies - b.dependencies;

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
        listNamFiles: function(dir){ console.log(getNamFiles(dir).join('\n')); }
      , languageCoverage: languageCoveragePerNamFile
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
