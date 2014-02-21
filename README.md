requirejs-manifest-builder.js
==============
NPM is such a versatile solution, of course it works for frontend resources, so here's a requirejs manifest generator so you can register all those node modules right where they live. It scans the node_modules directory in the project root(non-recursively) and generates the manfest for require.js. 

Programatic Usage
-----------------

    var builderClass = require('requirejs-manifest-builder');
    var builder = new builderClass();
    builder.buildManifest(function(err, manifest){
        //do stuff
    });
    
Resources
---------

To include non-UMD js or css add it to an array in the(nonstandard) `resources` entry in the module's package.json

Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow