# Specimen Tools for websites

## Usage/Markup Examples

Currently the main usage is in [mdlFontSpecimen](https://github.com/graphicore/mdlFontSpecimen).

However, the main documentation of the available widgets can be found here.

There is a minimal [example](examples/simple/index.html). You can run it like this:

```
~$ git clone git@github.com:graphicore/specimenTools.git
~$ cd specimenTools
~/specimenTools$ bower install
# now start a http-server to serve from ~/specimenTools
# e.g. python3 -m http.server 8000
# visit: http://localhost:8000/examples/simple/index.html
```

The [widgets](lib/widgets) have some documentation in their js files.



## Bootstrapping, Signals and Life Cycle

Have a look at [the minimal examples/simple/main.js](examples/simple/main.js).

All signaling is done via a single central instance of the [PubSub module](lib/services/PubSub.js).

The order of subscription is relevant, it may be important to have some
modules subscribe before/after other modules. Currently, subscribing the
services [FontData](lib/services/FontData.js) and then [WebFontProvider](lib/services/WebFontProvider.js)
first is expected by other modules.

Subscription is usually done in the constructors.

### Bootstrapping

1. **Initializing the "services".** The widget constructors will
   require them to be injected at their initialization time.
* **Initializing the widgets.** The document will be searched for the
   widgets CSS-class and the resulting containers will each be initialized
   with a new widget instance.
* **A callback is subscribed** to the `allFontsLoaded` channel, to activate
   a first font when loading is completed.
* **Font loading starts,** calling [`loadFonts`](lib/loadFonts.js).

#### `loadFonts` is publishing to the following channels:

##### `prepareFont` with arguments: `(int) fontIndex`, `(string) fontFileName`

Directly before the actual file loading is executed. If the file loading
is asynchronous (it is) all `prepareFont` signals will be sent before any
`loadFont` signal is send.

##### `loadFont` with arguments: `(int) fontIndex`, `(string) fontFileName`, `(opetype.js font instance) font`, `(arraybuffer) fontArraybuffer`

When the font file is loaded and opetype.js has parsed it. I.e. All the font data
is now available.

##### `allFontsLoaded` with arguments: `(int) countAllFonts`

Won't be published if not all fonts could be loaded. There will be a warning
in the console output in this case.


### Runtime

Currently there is only one channel published to during runtime:

##### `activateFont` with arguments: `(int) fontIndex`

This is published by the [`FamilyChooser`](lib/widget/FamilyChooser.js) widget.
Most of the widgets are subscribed to this signal, including `FamilyChooser` itself
(that way many FamilyChooser widgets can coexist if needed).


## Configuration Options

Most of the widgets are configurable via options. At the moment these options
are used to make specimenTools blend into Material Design Lite, see the
extensive configuration done in [`main.js` of `mdlFontSpecimen`](https://github.com/graphicore/mdlFontSpecimen/blob/master/lib/main.js#L33).

Most of the options define the CSS-Classes that are used in the widgets,
either as markers, to control aspects of the marked DOM-Element or as
CSS-Classes of newly created DOM elements. Some are callbacks/hooks e.g.
to activate ui-elements of MDL.

The same widgets can be used with different sets of options, for this the
"factory" array in the main function would be configured with different
CSS-selection-classes and different options but the same widget constructors.

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
