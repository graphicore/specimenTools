define([
    'opentype'
], function(
    opentype
) {
    "use strict";
    /*globals setTimeout, FileReader, XMLHttpRequest, console*/

    function _publishLoaded(task, data) {
        var state = task.state
          , index = task.index
          , fontFileName = task.name
          , err = data.error
          , font = data.font
          , fontArraybuffer = data.arraybuffer
          ;

        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            state.countAll--;
        }
        else {
            state.pubsub.publish('loadFont', index, fontFileName, font, fontArraybuffer);
            state.countLoaded += 1;
        }

        if(state.countLoaded === state.countAll)
            state.pubsub.publish('allFontsLoaded', state.countAll);
    }

    function _getLoadedFontData(err, fontArraybuffer) {
        var err_ = err || null
          , font = null
          ;
        if(!err) {
            try {
                font =  opentype.parse(fontArraybuffer);
            }
            catch (parseError) {
                err_ = parseError;
            }
        }

        return {
            error:err_
          , font: font
          , arraybuffer:fontArraybuffer
        };
    }

    function _onLoadQueued(cache, key, err, fontArraybuffer) {
        var data, queue, i, l, task;

        cache.loaded[key] = data = _getLoadedFontData(err, fontArraybuffer);
        queue = cache.queues[key];
        delete cache.queues[key];

        for(i=0,l=queue.length;i<l;i++) {
            task = queue[i];
            _publishLoaded(task, data);
        }
    }

    /**
     * Callback for when a fontfile has been loaded
     *
     * @param i: index of the font loaded
     * @param fontFileName
     * @param err: null, error-object or string with error message
     * @param fontArraybuffer
     */
    function _onLoadFont(task, err, fontArraybuffer) {
        var data = _getLoadedFontData(err, fontArraybuffer);
        _publishLoaded(task, data);
    }

    function loadFromUrl(fontInfo, callback) {
        var request = new XMLHttpRequest()
          , url = fontInfo.url
          ;
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            if (request.status !== 200) {
                return callback('Font could not be loaded: ' + request.statusText);
            }
            return callback(null, request.response);
        };
        request.send();
    }

    function fileInputFileOnLoad(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(null, this.result);
    }
    function fileInputFileOnError(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(this.error);
    }
    function loadFromFileInput(file, callback) {
        var reader = new FileReader();
        reader.onload = fileInputFileOnLoad.bind(reader, callback);
        reader.onerror = fileInputFileOnError.bind(reader, callback);
        reader.readAsArrayBuffer(file);
    }

    function loadFontsFromFileInput(pubsub, fileInputFiles) {
        _loadFonts(pubsub, fileInputFiles, loadFromFileInput);
    }
    loadFontsFromFileInput.needsPubSub = true;

    function loadFontsFromUrl(pubsub, fontFiles, cache) {
        var i, l
          , fontInfo = []
          ;
        for(i=0,l=fontFiles.length;i<l;i++) {
            if (!fontFiles[i])
                throw new Error('The url at index '+i+' appears to be invalid.');
            fontInfo.push({
                  name: fontFiles[i]
                , url: fontFiles[i]
                // this is for the cache and must be the same as url in this case,
                // to ensure we request a file only once
                , key: fontFiles[i]
            });
        }
        _loadFonts(pubsub, fontInfo, loadFromUrl, cache);
    }

    function _initCache(cache) {
        if(!('loaded' in cache))
            cache.loaded = Object.create(null);
        if(!('queues' in cache))
            cache.queues = Object.create(null);
    }

    function _loadFonts(pubsub, fontFiles, loadFont, cache) {
        var i, l, fontInfo, key, onload, task, data
          , loaderState = {
                countLoaded: 0
              , countAll: fontFiles.length
              , pubsub: pubsub
            }
          ;
        if(cache)
            _initCache(cache);

        filesLoop:
        for(i=0,l=fontFiles.length;i<l;i++) {
            fontInfo = fontFiles[i];
            pubsub.publish('prepareFont', i, fontInfo.name, l);
            task = {
                state: loaderState
              , index: i
              , name: fontInfo.name
            };
            onload = null;
            if(cache) {
                key = fontInfo.key;
                if(key in cache.loaded) {
                    data = cache.loaded[key];
                    // execute async
                    setTimeout(_publishLoaded.bind(null, task, data), 0);
                    continue filesLoop;
                }
                // put into queue
                if(!(key in cache.queues)) {
                    // initiate queue
                    cache.queues[key] = [];
                    onload = _onLoadQueued.bind(null, cache, key);
                }
                cache.queues[key].push(task);
            }
            else // no cache
                onload = _onLoadFont.bind(null, task);

            // if no cache or of queue was just initiated
            if(onload)
                loadFont(fontInfo, onload);
        }
    }

    return {
        fromUrl: loadFontsFromUrl
      , fromFileInput: loadFontsFromFileInput
    };
});
