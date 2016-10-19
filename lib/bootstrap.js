define([
    './setup'
], function(
    setup
) {
    "use strict";
    require.config(setup);
    return require;
});
