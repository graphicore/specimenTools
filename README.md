# Specimen Tools for websites


## HowTos:

### Regenerate the file `lib/fontData/languageCharSets.json`

Update the CLDR submodules `cldr-localenames-modern` and `cldr-misc-modern`.

```sh
$ git submodule update --recursive --remote
```

Then run this command to recreate the `languageCharSets.json` file:

```
$ ./build/makeChars2LanguageCoverageTable.js lib/fontData/languageCharSets.json
```
