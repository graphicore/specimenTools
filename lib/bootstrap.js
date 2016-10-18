define([
], function(
) {
    "use strict";
    var setup = {
    //    baseUrl: 'lib' should be already set by the file that includes this file
        paths: {
            'opentype': 'bower_components/opentype.js/dist/opentype'
          , 'Atem-CPS-whitelisting': 'bower_components/Atem-CPS-whitelisting/lib'
          , 'Atem-Errors': 'bower_components/Atem-Errors/lib'
          , 'Atem-Math-Tools': 'bower_components/Atem-Math-Tools/lib'
          , 'Atem-Pen-Case': 'bower_components/Atem-Pen-Case/lib'
          , 'marked': 'bower_components/marked/marked.min'
          , 'require/text': 'bower_components/requirejs-text/text'
        }
    };
    require.config(setup);
    return require;
});
