#! /usr/bin/env node

"use strict";
// jshint esnext:true

var fs = require('fs')
  , child_process = require('child_process')
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


function parseNam(str) {
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
      , unicode
      , uniReg=/^[A-F0-9]{4}$/
      ;
    for(i=0,l=lines.length;i<l;i++) {
        line = lines[i];
        if(line.slice(0,2) !== '0x')
            continue;
        unicode = line.slice(2,6);
        if(!uniReg.test(unicode))
            continue;
        result.push([
                // unicode char
                String.fromCodePoint(parseInt(unicode, 16))
                // arbitrary description
              , line.slice(6)
        ]);
    }
    return result;
}

function parseNamFromFile(namFile) {
    return parseNam(fs.readFileSync(namFile, {encoding: 'utf8'}));
}

function namFile2charSet(namFile) {
    return new Set(parseNamFromFile(namFile).map(item=>item[0]));
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
        if(!(r = languageCoveredByCharset(languagesCharsets[language], charset, true))[0]) {
            console.log('charset misses', language, 'missing chars: ', r[1].join(''));
            continue;
        }
        coveredLanguages.push(language);
    }
    coveredLanguages.sort();
    return coveredLanguages;
}

function getLanguagesCharsets(languagesCharsetsFile) {
    return JSON.parse(fs.readFileSync(languagesCharsetsFile));
}


function getNamFiles(dir) {
    var cmd;
    if(!fs.lstatSync(dir).isDirectory())
        // don't use this shell injection with input that is not a dir name
        throw new Error('dir "'+dir+'" is not a directory');
    cmd = 'find ' + dir + '  -type f -name *.nam';
    return child_process.execSync(cmd, {maxBuffer: 200000000, encoding: 'utf8'}).split('\n').filter(item => item.length >= 1);
}

function languageCoveragePerNamFile(namDir, languagesCharsetsFile) {
    var namFiles = getNamFiles(namDir)
      , languagesCharsets = getLanguagesCharsets(languagesCharsetsFile)
      , i, l, charset
      , languages
      ;
    for(i=0,l=namFiles.length;i<l;i++) {
        if(i!==0)
            console.log('======================');
        console.log(namFiles[i]);
        charset = namFile2charSet(namFiles[i]);
        languages = languagesCoveredByCharset(languagesCharsets, charset);
        console.log('languages:', languages.join(', '));
        console.log(namFiles[i]);
    }
}

function languageCoverageforNamFile(namFile, languagesCharsetsFile) {
    var languagesCharsets = getLanguagesCharsets(languagesCharsetsFile)
      , charset
      , languages
      ;
    console.log(namFile);
    charset = namFile2charSet(namFile);
    languages = languagesCoveredByCharset(languagesCharsets, charset);
    console.log('languages:', languages.join(', '));
}

function main(command, args) {
    var func = ({
        wrongLanguageInfo: wrongLanguageInfo
      , listNamFiles: function(dir){ console.log(getNamFiles(dir).join('\n')); }
      , languageCoverage: languageCoveragePerNamFile
      , languageCoveragePerFile: languageCoverageforNamFile
    })[command];
    func.apply(null, args);
}


if (require.main === module)
    var command = process.argv[2]
      , commandArgs = process.argv.slice(3)
      ;
    main(command, commandArgs);
