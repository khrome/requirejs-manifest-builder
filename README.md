requirejs-manifest-builder.js
=============================

NPM is such a versatile solution, of course it works for frontend resources, so here's a requirejs manifest generator so you can register all those node modules right where they live. It will find at module at or above the project root, and generates the manfest for require.js (resource loading requires the requirejs css plugin).

This is intended for use in an application framework, or as part of a build process.

Programmatic Usage
------------------
I use this to dump configs directly onto an index page.

    var builderClass = require('requirejs-manifest-builder');
    var builder = new builderClass();
    builder.buildManifest(function(err, manifest, output){
        //do stuff
    });
    
Resources
---------

To include non-UMD js or css add it to an array in the(nonstandard) `resources` entry in the module's package.json, no dependencies are loaded until used.

- **[CSS](http://www.w3.org/Style/CSS/Overview.en.html)** : all css is injected into the browser
- **[SCSS](http://sass-lang.com/)** : If you include a .scss asset it will be rendered and stored in an in-memory cache, then shipped to the client as css
- **[LESS](http://lesscss.org/)** : If you include a .less asset it will be rendered and stored in an in-memory cache, then shipped to the client as css
- **[JS](http://www.w3.org/standards/webdesign/script)** : Any .js included is loaded as a browser global, allowing you to both have a place to do anything you need to do freestyle, as well as enabling drop-in compatibility for older scripts

**Future Resources**


Upcoming extended functionality can be had with a slightly modified [UMD wrapper](https://github.com/umdjs/umd/blob/master/returnExports.js), so you can have user extendable resources(primarily for client-side modules).
	
	(function (root, factory) {
	    if (typeof define === 'function' && define.amd) {
	        // AMD. Register as an anonymous module.
	        define(['jsmanifest','b'], function(jsmanifest){
	        	jsmanifest.load(['text', 'json'], function(){
	        		factory.apply(factory, arguments);
	        	});
	        });
	    } else if (typeof exports === 'object') {
	        // Node. Does not work with strict CommonJS, but
	        // only CommonJS-like environments that support module.exports,
	        // like Node.
	        var jsmanifest = require('jsmanifest');
	        jsmanifest.loadSync(['text', 'json']);
	        module.exports = factory(jsmanifest, require('b'));
	    } else {
	        // Browser globals (root is window)
	        // perform load as part of UI ready logic, if you do it the 'old way'
	        root.moduleName = factory(root.jsmanifest, root.b);
	    }
	}(this, function (jsmanifest, b) {
	    //use b in some fashion.
	    
	    //jsmanifest is a container for any loaded styles, scripts, text, data or images
	
	    // Just return a value to define the module export.
	    // This example returns an object, but the module
	    // can return a function as the exported value.
	    return {};
	}));

The module encapsulation is designed to load a diverse array of resources for the purpose of encapsulation and preemtion. Your component can now finally own it's own styles, templates, etc. without taking the freedom to modify away from implementers.. all while retaining drop-in upgrading! This is the range of support I plan to offer:

- **[INI/CONF[Soon™]](http://en.wikipedia.org/wiki/INI_file)**, **[XML[Soon™]](http://www.w3.org/XML/)**, **[JSON[Soon™]](http://www.json.org/)** : Any data files are accessible as structured data in the client:
	
		var myObject = jsmanifest.data('my-module:path/some-data.type');
	
- **[TEXT[Soon™]](http://en.wikipedia.org/wiki/UTF-8)** : Any unknown files are considered text and loaded as such.
		
		var myString = jsmanifest.text('my-module:path/some-text.file');

- **[IMAGE/PNG[Soon™]](http://www.libpng.org/pub/png/)**, **[IMAGE/GIF[Soon™]]()**, **[IMAGE/JPEG[Soon™]](http://www.jpeg.org/jpeg/index.html)**, **[IMAGE/SVG+XML[Soon™]](http://www.w3.org/Graphics/SVG/)** : Images are loaded and shipped to the browser or concatenated as a JSON object of base64 payloads. Within the module they may be accessed as base64, Image(or SVG for vector features) tag, or canvas objects:

		var myString = jsmanifest.image.base64('my-module:path/some-image.file');
		var myImage = jsmanifest.image.tag('my-module:path/some-image.file');
		var myCanvas = jsmanifest.image.canvas('my-module:path/some-image.file');
		var mySVG = jsmanifest.image.tag('my-module:path/some-image.file');

In addition, modules may be replaced on the server:
				
		builder.replace('my-module:some-directory/file-to.replace', data);

So you can override the default resources in the module with your own.

Polymer
-------

** note : requirejs-manifest-builder just had a large reworking, the polymer functionality remains untested **

In addition to requirejs configuration, you can also output your modules as [Polymer](https://www.polymer-project.org/) components. This is done via the nonstandard `polymer` entry in the package.json. An example would look like:

    polymer : {
        extends : 'tray',
        noscript : false,
        template : 'stuff.html',
        style : 'mystyle.less',
        script : 'polymer-script.js'
    }

note that constructor is not an option and is based on the package.json's name for clarity. In this way you get a clean blending of polymer, UMD or traditional scripts.

Any components from the process will be in `output.polymer` and can then be dropped onto the index page.

server side module paths
------------------------

Then when resolving paths inside your application:

	instance.realPath(path, function(path){
		//the path now reflects the altered root
	});

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

Sticky Bundling[Soon™]
-----------------------------

This will allow you to bundle sets of modules together so that when one is loaded, they all come in. This allows you to minimize transfers in a production environment and will also be how CDNs and static rendering are supported.

CLI Usage[Beta]
---------------

If you'd like to generate a static manifest for inclusion in your app you can run:

	jsmanifest -d some/path/to/node_modules
	
and you'll get interactive output add `-f [path]` or `--file [path]` to write it directly to a file. If you'd like to use a custom module root, use the `-m [path]` or `--modules [path]` flag instead of the directory option.

Grunt Support[Beta]
-------------------
To use grunt to generate a requirejs config file from your `node_modules` directory in your Gruntfile:


	grunt.task.loadTasks('requirejs-manifest-builder/adaptors/gruntTasks');
	grunt.registerTask('build-requirejs-config', ['jsmanifest']);
	
There are currently no options or polymer support.

Gulp Support[In Progress]
-------------------------

Rather than a transforming gulp plugin, this acts as a generator allowing you to create assets which are gulp compatible streams.

For example:
	
	var gulp = require('gulp');
	var jsmanifest = require('requirejs-manifest-builder/adaptors/gulp');
	var jsonminify = require('gulp-jsonminify');
	
	gulp.task('build-requirejs-config', function(){
    	return jsmanifest.config()
        	.pipe(jsonminify())
        	.pipe(gulp.dest('build'));
	});

Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

Disclaimer
----------

This is not an official Google product.

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow