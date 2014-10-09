var arrays = require('async-arrays');
var objects = require('async-objects');
var fs = require('fs');
var less = require('less');
var sass = require('node-sass');

function ManifestBuilder(options){
    this.options = options || {};
    this.cache = {};
}
var lessCache = {};
var polymerCache = {};
var glob = {};
ManifestBuilder.prototype = {
    constructor : ManifestBuilder,
    localModules : function(options, callback){
        if(typeof options == 'function'){
            callback = options;
            options = { directory : (options.directory || './')+'node_modules/' };
        }
        var modules = {};
        fs.readdir(options.directory, function(err, files){
            if(err) throw err;
            arrays.forAllEmissions(files, function(file, index, done){
                var packageFile = options.directory+file+'/package.json';
                fs.exists(packageFile, function(exists){ 
                    if(exists){
                        fs.readFile(packageFile, function(err, body){
                            var pkg = JSON.parse(body);
                            modules[file] = pkg;
                            pkg.location = options.directory+file+'/';
                            done();
                        });
                    }else{
                        done();
                    }
                });
                //todo: handle lone .js files
            }, function(){
                callback(undefined, modules);
            });
        });
    },
    expandDependencies : function(){
        
    },
    buildManifest : function(options, callback){
        if(typeof options == 'function' && !callback){
            callback = options;
            options = {};
        }
        if(options.cacheable && this.cache[process.cwd()]) return this.cache[process.cwd()];
        var entries = {
            //baseUrl: "/another/path",
            paths: {},
            shim: {},
            map: {
                '*': { 'css': 'require-css' }
            },
            waitSeconds: 15
        };
        var output = {
        };
        var handlers = {
            css : function(file, done){
                done(undefined, 'css!'+file);
            },
            js : function(file, done){
                done(undefined, file);
            },
            less : function(file, done){
                if(lessCache[file]){
                    done(undefined, lessCache[file]);
                }else{
                    transcode.less.css(file, function(err, filename, shimPrefix){
                        lessCache[file] = shimPrefix+filename;
                        done(err, shimPrefix+filename);
                    });
                }
            },
            scss : function(file, done){
                transcode.scss.css(file, function(err, filename, shimPrefix){
                    lessCache[file] = shimPrefix+filename;
                    done(err, shimPrefix+filename);
                });
            }
            //.coffee?
            //.json?
            //.html?
            //.jpg/.gif/.png? as base64?
            //.mp4?
        };
        
        var symlinkCache = {};
        
        var transcode = {
            less : {
                set : function(name, value){
                    glob[name] = value;
                },
                css : function(file, callback){
                    readFile(file, function(err, body, path, typeless){
                        if(file[0] === '.') file = file.substring(1);
                        var dir = path;
                        file = file.split('/');
                        file = file.pop();
                        var paths = ['.', dir];
                        fs.realpath(dir, symlinkCache, function (err, resolvedPath) {
                            paths = ['.', resolvedPath];
                        try{
                            var parser = new(less.Parser)({
                                paths: paths, // Specify search paths for @import directives
                                relativeUrls : true,
                                filename: resolvedPath+'/'+file // Specify a filename, for better error messages
                            });
                            parser.parse(body, function (error, tree) {
                                var newFile = file+'.css';
                                if(error){
                                    console.log('LESS rendering error!');
                                    console.log(error);
                                    writeFile(newFile, '/* ERROR : '+error.message+'*'+'/', callback);
                                }else{
                                    try{
                                        writeFile(
                                            newFile, 
                                            tree.toCSS({ compress: options.compact || false }), 
                                            callback, 
                                            'css!'
                                        );
                                        console.log('RENDERED LESS: '+newFile);
                                    }catch(ex){
                                        console.log(ex);
                                        writeFile(newFile, '/* ERROR : '+ex.message+'*'+'/', callback);
                                    }
                                }
                            },{ //target, callback, options... WTF?
                                modifyVars: glob
                            });
                        }catch(ex){
                            console.log(ex);
                            handler(file, '/* ERROR : '+ex.message+'*'+'/', callback);
                        }
                        });
                    });
                }
            },
            scss : {
                css : function(file, callback){
                    readFile(file, function(err, body, path, typeless){
                        var fullpath = path + file;
                        try{
                            sass.render(body.toString(), function (error, css) {
                                if(error) handler(resource, '/* ERROR : '+error.message+'*'+'/', callback);
                                else writeFile(file, css, callback, 'css!');
                            });
                        }catch(ex){
                            writeFile(file, '/* ERROR : '+ex.message+'*'+'/', callback);
                        }
                    });
                }
            }
        };
        var getPath = function(mode, resource){
            mode = (mode || 'local').toLowerCase();
            var result = mode;
            switch(mode){
                case 'local':
                    if(resource[0] === '.' && resource[1] === '/') resource = resource.substring(2);
                    var path = process.cwd()+'/'+resource;
                    var parts = path.split('/');
                    parts.pop();
                    result = parts.join('/');
                    break;
                case 'global':
                    result = __dirname;
                    break;
            }
            return result;
        }
        var readFile = function(filename, callback){
            fs.readFile(filename, function(err, body){
                if(err) return callback(err);
                var path = getPath('local', filename);
                var parts = filename.split('.');
                parts.pop();
                var typeless = parts.join('.');
                callback(err, body.toString?body.toString():body, path, typeless);
            });
        }
        var writeFile = function(filename, body, callback, shimType){
            shimType = shimType || '';
            fs.writeFile(filename, body, function(err){
                callback(err, filename, shimType);
            });
        }
        var endsWith = function(substr, str){
            return str.substring(str.length - substr.length) === substr;
        };
        
        var handlePolymer = function(module, path, complete){
            if(!output) throw new Error('No output in scope!');
            if(!output.polymer) output.polymer = [];
            var location = 'polymer/cache/'+module.name+'.polymer.html';
            fs.exists(location, function(exists){
                if(exists){
                    output.polymer.push(module.name);
                    if(complete) complete();
                }else{
                    if(!module.polymer.template) throw new Error('Polymer template for '+module.name+' not found!');
                    if(!module.polymer.script) throw new Error('Polymer script for '+module.name+' not found!');
                    if(!module.polymer.style) throw new Error('Polymer style for '+module.name+' not found!');
                    var template = fs.readFileSync('./node_modules/'+module.name+'/'+module.polymer.template);
                    var script = fs.readFileSync('./node_modules/'+module.name+'/'+module.polymer.script);
                    var style = fs.readFileSync('./node_modules/'+module.name+'/'+module.polymer.style);
                    var definitionLines = [
                        '<!-- Define element -->',
                        '<polymer-element name="'+module.name+'" attributes="'+(
                            module.attributes?(module.attributes.join?module.attributes.join(','):module.attributes):''
                        )+'" constructor="Testu">',
                            '<template>',
                                '<style>'+style+'</style>',
                                template,
                            '</template>',
                            '<script>',
                                script,
                            '</script>',
                        '</polymer-element>'
                    ];
                    fs.writeFile(location, definitionLines.join("\n"), function(err){
                        if(!err){
                            output.polymer.push(module.name);
                        }
                        if(complete) complete();
                    });
                }
            });
        };
        
        var ob = this;
        var iterator = 'forEachEmission';
        this.localModules(function(err, modules){
            var moduleNames = Object.keys(modules);
            var FNs = [];
            arrays[iterator](moduleNames, function(name, key, complete){
                if(modules[name].polymer){
                    handlePolymer(modules[name], complete);
                }else{
                    var moduleName = modules[name].browserMain || modules[name].browserify || modules[name].main || 'index.js';
                    var nn = (moduleName.substr(-3, 3).toLowerCase() === '.js') ? 
                        moduleName.substr(0, moduleName.length-3) :
                        moduleName;
                    entries.paths[name] = modules[name].location+nn;
                }
                var shim = {};
                if(modules[name].resources){
                    arrays[iterator](modules[name].resources, function(resource, index, done){
                        var found  = false;
                        Object.keys(handlers).forEach(function(typeName){
                            if(endsWith('.'+typeName, resource.toLowerCase())){
                                found = true;
                                handlers[typeName]('./node_modules/'+name+'/'+resource, function(err, shimPath){
                                    if(!shim.deps) shim.deps = [];
                                    shim.deps[index] = shimPath;
                                    done();
                                });
                            }
                        });
                        if(!found){
                            done(); //short circuit if we don't understand the type
                        }
                    }, function(){
                        if(shim.deps) entries.shim[name] = shim;
                        var lines = [];
                        if(options.process === true && modules[name].extensions){
                            var exts = modules[name].extensions.map(function(value){
                                if(value.indexOf('.') === -1) return value;
                                return 'node_modules/'+name+'/'+value;
                            });
                            if(modules[name].extends) lines.push('window["'+modules[name].extends+'"] = module;');
                            lines.push('var callbacks = [];');
                            if(modules[name].extends) lines.push('define.amd = false;'); //here we turn off amd, so extensions are treated as browser objects
                            if(modules[name].extends) lines.push('require.pause();'); //pause so UMDs we intend to to load as AMD aren't treated as globals
                            lines.push('require.bypass('+JSON.stringify(exts)+', function(){'); //use bypass to load extensions
                            lines.push(     'var cbs = callbacks;');
                            lines.push(     'callbacks = false;');
                            lines.push(     'cbs.forEach(function(cb){ cb(); });');
                            if(modules[name].extends) lines.push(     'require.resume();'); //clean up our mess
                            if(modules[name].extends) lines.push(     'define.amd = true;');
                            if(modules[name].extends) lines.push(     'delete window["'+modules[name].extends+'"];');
                            lines.push('});');
                            lines.push('module.extensions = {ready:function(cb){');
                            lines.push(     'if(callbacks === false) cb();');
                            lines.push(     'else callbacks.push(cb);');
                            lines.push('}}');
                            lines.push('return module;');
                        }
                        if(lines.length){
                            if(!entries.shim[name]) entries.shim[name] = {};
                            entries.shim[name].process = '[['+FNs.length+']]';
                            FNs.push(new Function('name', 'module', 'config', lines.join("\n")));
                        }
                        if(modules[name].map){
                            if(!entries.map) entries.map = {};
                            entries.map[name] = modules[name].map;
                        }
                        complete();
                    });
                }else{
                    complete();
                }
            }, function(){
                if(options.cacheable) ob.cache[process.cwd()] = entries;
                if(FNs.length){
                    entries = JSON.stringify(entries, null, "\t");
                    FNs.forEach(function(fn, index){
                        entries = entries.replace('"[['+index+']]"', fn.toString());
                    });
                }
                callback(undefined, entries, output);
            });
        });
    },
    saveNewManifest : function(filename, options, callback){
        if(typeof options == 'function'){
            callback = options;
            delete options;
        }
        options = options || {};
        buildManifest(function(error, manifest){
            fs.writeFile(filename, JSON.stringify(manifest), function(err){
                if(callback) callback(error || err, manifest);
            });
        });
    },
    renderMetaStylesToCSS : function(handler, callback){
        this.localModules(function(err, modules){
            array.forAllEmissions(Object.keys(modules), function(name, index, done){
                if(modules[name].resources) modules[name].resources.forEach(function(resource){
                    if(resource.substr(resource.length -5, resource.length).toLowerCase() == '.less'){
                        fs.readFile(resource, function(err, body){
                            body = body.toString()
                            var path = process.cwd()+resource;
                            var parts = path.split('/');
                            parts.pop();
                            var dir = parts.join('/');
                            try{
                                var parser = new(less.Parser)({
                                    paths: [dir], // Specify search paths for @import directives
                                    filename: path // Specify a filename, for better error messages
                                });
                                parser.parse(body, function (error, tree) {
                                    if(error) handler(file, '/* ERROR : '+error.message+'*'+'/');
                                    else{
                                        try{ handler(file, tree.toCSS({ compress: options.compact || false })); }
                                        catch(ex){ handler(file, '/* ERROR : '+ex.message+'*'+'/'); }
                                    }
                                });
                            }catch(ex){
                                handler(file, '/* ERROR : '+ex.message+'*'+'/');
                            }
                        });
                    }
                    if(resource.substr(resource.length -5, resource.length).toLowerCase() == '.scss'){
                        fs.readFile(resource, function(err, body){
                            if(err) handler(resource, '/* ERROR : '+err.message+'*'+'/');
                            else sass.render(body.toString(), function (error, css) {
                                if(error) handler(resource, '/* ERROR : '+error.message+'*'+'/');
                                else handler(file, css);
                            });
                        });
                    }
                });
                if(shim.deps) entries.shim[name] = shim;
            }, function(){
                callback();
            });
        });
    },
    aggregate : function(type, callback){
        this.localModules(function(err, modules){
            var files = [];
            Object.keys(modules).forEach(function(name){
                if(modules[name].resources) modules[name].resources.forEach(function(resource){
                    if(resource.substr(resource.length - (type.length+1), resource.length).toLowerCase() == '.'+type.toLowerCase()){
                        files.push(resource);
                    }
                });
                if(shim.deps) entries.shim[name] = shim;
            });
            var buffer = '';
            array.forEachEmission(files, function(file, index, done){
                fs.readFile(file, function(err, body){
                    if(err) buffer += 'throw new Error("unable to bundle file:'+file+'");';
                    else buffer += body.toString();
                    done();
                })
            }, function(){
                callback(buffer);
            })
        });
    },
    minify : function(type, body, callback){
        switch(type.toLowerCase()){
            case 'js':
            case 'css':
                setTimeout(function(){ //todo: implement minify
                    callback(body);
                }, 1);
            default :
                console.log('cannot compact '+type+' files');
                setTimeout(function(){
                    callback(body);
                }, 1);
        }
    },
    lessSet : function(name, value){
        glob[name] = value;
    }
    //TODO: handle wrapping commonjs -> UMD
}
module.exports = ManifestBuilder;
