/* jshint esnext:true */
/* globals io, document, console*/
(function () {
    "use strict";
    console.log('hello!');
    const socket = io();

    function render(fsState) {
        document.body.innerHTML = `
<code>
    ${Array.from(fsState).sort().join('<br />')}
<code>`;
    }

    var fsState;

    socket.on('fs-watch', (clientEventName, clientFileName, url) => {
        console.log(clientEventName, clientFileName, url);
        switch(clientEventName) {
            case 'load':
                fsState.add(clientFileName);
                break;
            case 'unload':
                fsState.delete(clientFileName);
                break;
        }
        render(fsState);
    });

    console.log('subscribing...');
    socket.emit('subscribe', 'fs-watch', (fsStateEntries)=>{
        fsState = new Set(fsStateEntries);
        render(fsState);
        console.log(`CALLBACK subscribe fs-watch (initial dir):`, fsState);
    });
})();



