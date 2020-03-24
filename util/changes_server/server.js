#! /usr/bin/env node
"use strict";
/* jshint esnext:true, node:true */

const express = require('express')
  , http = require('http')
  , path = require('path')
  , socketio = require('socket.io')
  , open = require('open')
  , chokidar = require('chokidar')
  ;


function fontUrl(filename){
    return `/fonts/${filename}`;
}

function watch(dir, sio, fsState) {
    var handler = (eventType, filename /* stat (only for add and change), ...args*/) => {
            if (filename)
                console.log(eventType, 'filename:', filename);
            else
                console.log(eventType, '(no filename)');

            var clientEventName
                // currently enforcing a flat directory
              , clientFileName = path.basename(filename)
              , id = clientFileName
              , fontinfo = {
                    name: clientFileName
                  , url: fontUrl(clientFileName)
                }
            ;

            switch (eventType) {
                case 'add':
                    // falls through
                case 'change':
                    fsState.set(id, fontinfo);
                    clientEventName = 'load';
                    break;
                case 'unlink':
                    fsState.delete(clientFileName);
                    clientEventName = 'unload';
                    break;
            }
            // sends a message to all clients
            if(clientEventName)
                sio.to('fs-watch').emit('fs-watch', clientEventName, id, fontinfo);
        }
      , watcher = chokidar.watch(dir, {
            // no subdirectories
            depth: 0
            // try to not send unfinished writes
          , awaitWriteFinish: {
                // (default: 2000). Amount of time in milliseconds for a
                // file size to remain constant before emitting its event.
                stabilityThreshold: 300
                // (default: 100). File size polling interval, in milliseconds.
              , pollInterval: 100
          }
        })
      ;
    for(let event of ['add', 'change', 'unlink'])
        watcher = watcher.on(event,
            (path, ...args) => handler(event, path, ...args)); //jshint ignore: line

    return watcher;
}

function main(clientLib, client, watchDir, port) {
    const app = express()
        , httpServer = http.createServer(app)
        , sio = socketio(httpServer)
        , fsState = new Map()
        ;
    watch(watchDir, sio, fsState); // returns a fs.FSWatcher object
    app.use('/', express.static(client));
    app.use('/lib', express.static(clientLib));


    function downloadFont(req, res, next) {
            // using path.basename to sanitize the user given file parameter
        var file = path.basename(req.params.file)
          , filepath = path.join(watchDir, file)
          ;
        res.sendFile(filepath
                   , {dotfiles: 'deny'}
                   , err=>{if (err) next(err);});

    }

    // e.g.: '/fonts/:file'
    app.get(fontUrl(':file'), downloadFont);

    function _onSubscribe (channel, ackCallback) {
        // jshint validthis:true
        if(channel === 'fs-watch') {
            ackCallback(Array.from(fsState));
            this.join('fs-watch');
        }
    }

    sio.on('connection', (socket) => {
        socket.on('subscribe', _onSubscribe);
    });

    httpServer.listen(port
        , () => {
            console.log(`Example app listening on http://localhost:${port}!`);
            // open(`http://localhost:${port}`);
        });
}

if (typeof require != 'undefined' && require.main==module) {

    var port = 3000
      , watchDir = path.resolve(process.argv[process.argv.length-1])
      , client = path.resolve(process.argv[process.argv.length-2])
      , clientLib = path.resolve(path.join(require.main.path, '../../lib'))
      ;
    for(let i=0,l=process.argv.length-1;i<l;i++) {
        if(process.argv[i] === '-p' && i+1<l) {
            let foundPort = parseInt(process.argv[i+1], 10);
            if(foundPort >= 0) // not NaN or negative
                port = foundPort;
            break;
        }
    }
    console.log('clientLib:', clientLib);
    console.log('watchDir:', watchDir);
    console.log('client:', client);
    main(clientLib, client, watchDir, port);
}


/*

// watch .js and .css files
watch = require('node-watch')
filter = function(pattern, fun) {
  return function(filename) {
    if(pattern.test(filename)){fun(filename);}
  }
}

watch('tester', function(filename) {
  io.sockets.emit('reload') //send a message to all clients
});

var serveIndex = require('serve-index')
var serveStatic = require('serve-static')

app.use(function(req, res, next) {
  // remove our cache spoofing
  var index = req.url.indexOf('?');
  if(index !== -1) {
      req.url = req.url.slice(0, index);
      req.originalUrl = req.originalUrl.slice(0, req.originalUrl.indexOf('?'));
  }
  next();
});

console.log('__dirname', __dirname)
app.use(serveStatic(__dirname));

//set up express to serve static content
app.use(serveIndex("."));
*/
