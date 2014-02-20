var arrays = require('async-arrays');
var fs = require('fs');
var less = require('less');
var sass = require('node-sass');

function ManifestBuilder(options){
    this.options = options || {};
    this.cache = {};
}

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
            //console.log('!!', files);
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
        var handlers = {
            css : function(file, done){
                done(undefined, 'css!'+file);
            },
            js : function(file, done){
                done(undefined, file);
            },
            less : function(file, done){
                transcode.less.css(function(err, filename, shimPrefix){
                    done(err, shimPrefix+filename);
                });
            },
            scss : function(){
                transcode.scss.css(function(err, filename, shimPrefix){
                    done(err, shimPrefix+filename);
                });
            }
            //.coffee?
            //.json?
            //.html?
            //.jpg/.gif/.png? as base64?
            //.mp4?
        };
        var transcode = {
            less : {
                css : function(file, callback){
                    loadFile(function(err, body, path, typeless){
                        var fullpath = path + file;
                        try{
                            var parser = new(less.Parser)({
                                paths: [path], // Specify search paths for @import directives
                                filename: fullpath // Specify a filename, for better error messages
                            });
                            parser.parse(body, function (error, tree) {
                                if(error) writeFile(file, '/* ERROR : '+error.message+'*'+'/', callback);
                                else{
                                    try{
                                        writeFile(
                                            file, 
                                            tree.toCSS({ compress: options.compact || false }), 
                                            callback, 
                                            'css!'
                                        ); 
                                    }catch(ex){ writeFile(file, '/* ERROR : '+ex.message+'*'+'/', callback); }
                                }
                            });
                        }catch(ex){
                            handler(file, '/* ERROR : '+ex.message+'*'+'/', callback);
                        }
                    });
                }
            },
            scss : {
                css : function(file, callback){
                    loadFile(function(err, body, path, typeless){
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
        var path = function(mode){
            mode = (mode || 'local').toLowerCase();
            switch(mode){
                case 'local':
                    var path = process.cwd()+resource;
                    var parts = path.split('/');
                    parts.pop();
                    return parts.join('/');
                    break;
                case 'global':
                    return __dirname;
                    break;
                default : return mode; //if we don't know, it must be a path
            }
        }
        var readFile = function(filename, callback){
            fs.readFile(filename, function(err, body){
                if(err) return callback(err);
                var path = path('local');
                var parts = filename.split('.');
                parts.pop();
                var typeless = parts.join('.');
                callback(err, body, path, typeless);
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
        var ob = this;
        this.localModules(function(err, modules){
            var moduleNames = Object.keys(modules);
            arrays.forAllEmissions(moduleNames, function(name, key, complete){
                var moduleName = modules[name].browserMain || modules[name].main || 'index.js';
                var nn = (moduleName.substr(-3, 3).toLowerCase() === '.js') ? 
                    moduleName.substr(0, moduleName.length-3) :
                    moduleName;
                entries.paths[name] = modules[name].location+nn;
                var shim = {};
                if(modules[name].resources) arrays.forAllEmissions(modules[name].resources, function(resource, index, done){
                    Object.keys(handlers).forEach(function(typeName){
                        if(endsWith('.'+typeName, resource.toLowerCase())){
                            handlers[typeName]('./node_modules/'+name+'/'+resource, function(err, shimPath){
                                if(!shim.deps) shim.deps = [];
                                shim.deps.push(shimPath);
                                done();
                            });
                        }
                    });
                    if(shim.deps) entries.shim[name] = shim;
                }, function(){
                    complete();
                });
                else complete();
            }, function(){
                if(options.cacheable) ob.cache[process.cwd()] = entries;
                callback(undefined, entries);
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
            })
        })
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
    }
    //TODO: handle wrapping commonjs -> UMD
}
module.exports = ManifestBuilder;
