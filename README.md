requirejs-manifest-builder.js
==============
NPM is such a versatile solution, of course it works for frontend resources, so here's a requirejs manifest generator so you can register all those node modules right where they live. 

Script Usage
------------

(Soon™)To use it on the command line it's just `requirejs-mainfest [node_directory] manifest_path`

Programatic Usage
-----------------

    var builderClass = require('requirejs-manifest-builder');
    var builder = new builderClass();
    builder.buildManifest(function(err, manifest){
        //do stuff
    });

Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow