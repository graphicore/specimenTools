/* jshint esversion:6 */
/* global XMLHttpRequest */
define([
    'specimenTools/services/dom-tool'
], function(
    domTool
) {
    "use strict";

    /**
     * responseTypes: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestResponseType
     */
    function _loadFromAjaxUrl(url, responseType) {
        var request = new XMLHttpRequest()
          , resolve, reject
          , promise = new Promise((res, rej)=>{resolve=res; reject=rej;})
          ;
        request.open('get', url, true);
        request.responseType = responseType || 'text';
        request.onload = ()=>{
            if (request.status !== 200)
                return reject('File could not be loaded: ' + request.statusText);
            return resolve(request.response);
        };
        request.send();
        return promise;
    }

    const Source = (function(){
    function Source(parse) {
        this._parse = parse;
    }

    const _p = Source.prototype;

    _p.load = function() {
        throw new Error('load is not implemented');
    };

    return Source;
    })();

    const HTTPGetSource = (function(Parent) {
    function HTTPGetSource(responseType, ...args) {
        Parent.call(this, ...args);
        this._responseType = responseType;
    }

    const _p = HTTPGetSource.prototype = Object.create(Parent.prototype);

    _p.load = function(url, ...extraArgs) {
        var promise = _loadFromAjaxUrl(url, this._responseType);
        return this._parse
                ? promise.then(result=>this._parse(result, ...extraArgs))
                : promise
                ;
    };

    return HTTPGetSource;
    })(Source);

    // straight from MDN
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
    function deepFreeze(object) {

        // Retrieve the property names defined on object
        var propNames = Object.getOwnPropertyNames(object);

        // Freeze properties before freezing self

        for (let name of propNames) {
          let value = object[name];

          if(value && typeof value === "object") {
            deepFreeze(value);
          }
        }

        return Object.freeze(object);
    }

    function RemoteLoader(/* TODO: sources*/) {
        this._sources = {
        // simple http get:
            'HTTP-get-text': new HTTPGetSource('text')
          , 'HTTP-get-fragment': new HTTPGetSource('text', domTool.createFragmentFromHTML)
          , 'HTTP-get-markdown': new HTTPGetSource('text', domTool.createFragmentFromMarkdown)
          , 'HTTP-get-json': new HTTPGetSource('json', (result, freeze=true)=>freeze?deepFreeze(result):result)
        };
    }

    const _p = RemoteLoader.prototype;
    _p.constructor = RemoteLoader;


    /**
     * contentAddress: "{sourceName}:{contentName}"
     */
    _p.load = function(contentAddress, ...extraArgs) {
        var separator = ':'
          , sepIndex = contentAddress.indexOf(separator)
            // In the case of no separator there's no contentName ('').
          , sourceName = sepIndex >= 0
                        ? contentAddress.slice(0, sepIndex)
                        : contentAddress
          , contentName = sepIndex >= 0
                        ? contentAddress.slice(sepIndex + separator.length)
                        : ''
          , source = this._sources[sourceName]
          ;


        // TODO: could be cached, but may need a way to invalidate.
        //       also, if there's a way to invalidate it would be cool
        //       to have a way to automatically inform (subbscription)
        //       the user and reload. Would be a nice way to work on
        //       a specimen and have it reload on a change to its markup.
        //       But that wouldn't cover all cases. Reloading the CSS
        //       would be also nice via that mechanism.
        //       ALSO: LoadFiles/LoadFonts{Library} is VERY much related
        //       at that point. Need to find out how to separate the
        //       channels/purposes though.
        // FIXME: always as a promise? It's much quicker to implement.
        return Promise.resolve(source.load(contentName, ...extraArgs));
    };

    return RemoteLoader;
});
