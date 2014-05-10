requirejs-manifest-builder.js
=============================

NPM is such a versatile solution, of course it works for frontend resources, so here's a requirejs manifest generator so you can register all those node modules right where they live. It scans the node_modules directory in the project root(non-recursively) and generates the manfest for require.js (resource loading requires the requirejs css plugin). 

Programatic Usage
-----------------

    var builderClass = require('requirejs-manifest-builder');
    var builder = new builderClass();
    builder.buildManifest(function(err, manifest, modules){
        //do stuff
    });
    
Resources
---------

To include non-UMD js or css add it to an array in the(nonstandard) `resources` entry in the module's package.json

Extensions
----------

in order to use extensions, you'll need to make the `/requireplus.js` available on the page, this modifies the top level require to be able to do post-load operations, including temporarily injecting into a global to register plugins then removing itself, in general:

1. it enables a `process` function on the shim
2. when modules are loaded if they have a shim process this is passed the module and returns the module which is then passed to the require callback
3. the config generator uses this (when `process:true` is passed to it) to enable post-load processing of a series of modules after your load is complete.
4. if you provide an `extends` entry in the package, this global value will get the module value before execution, amd will be disabled during extension load and the global is removed when complete. (this enables a module that plays poorly with UMD to load the core as a UMD module and auto-load a series of extensions in global browser mode for a more simple loading process (I'm looking at you codemirror)). It also blocks other requires until the load is complete, when they will continue.

Once it's all setup you can do something like this:

    {
        "name": "my-sites-codemirror",
        "version":"4.1.0",
        "main": "lib/codemirror.js",
        "extends" : "CodeMirror",
        "extensions" : [
            "mode/css/css.js",
            "mode/javascript/javascript.js",
            "mode/python/python.js",
            "mode/php/php.js",
            "mode/ruby/ruby.js",
            "mode/properties/properties.js",
            "mode/markdown/markdown.js"
        ],
        "resources" : [
            "lib/codemirror.css",
            "theme/mdn-like.css"
        ]
    }
    
Then when you call 

    builder.buildManifest({process:true}, function(err, manifest, modules){
        //do something with the manifest string
    });

that will output a config string for inclusion on a page with `requireplus.js` on it. Once this is all setup, you can just pretend everything is normal, no build process needed.

Sticky Bundling
---------------

Coming Soon™

CLI Usage
---------

Coming Soon™

Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow