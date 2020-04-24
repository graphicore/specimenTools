define([
    './setup'
], function(
    setup
) {
    "use strict";
    require.config(setup);

    require.config({
        paths: {
            'specimenTools': '.'
          , 'socket.io': '/socket.io/socket.io'
        }
    });

    return require;
});
