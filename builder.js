var arrays = require('async-arrays');
var fs = require('fs');

function ManifestBuilder(options){
    this.options = options || {};
}

ManifestBuilder.prototype = {
    constructor : ManifestBuilder,
    localModules : function(callback){
        var modules = {};
        fs.readdir('./node_modules/', function(err, files){
            arrays.forAllEmissions(files, function(file, index, done){
                var packageFile = './node_modules/'+file+'/package.json';
                fs.exists(packageFile, function(exists){ 
                    if(exists){
                        fs.readFile(packageFile, function(err, body){
                            var pkg = JSON.parse(body);
                            modules[file] = pkg;
                            pkg.location = './node_modules/'+file+'/';
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
        var entries = {
        //baseUrl: "/another/path",
        paths: {},
        waitSeconds: 15
      };
        this.localModules(function(err, modules){
            Object.keys(modules).forEach(function(name){
                var moduleName = modules[name].browserMain || modules[name].main || 'index.js';
                var nn = (moduleName.substr(-3, 3).toLowerCase() === '.js') ? 
                    moduleName.substr(0, moduleName.length-3) :
                    moduleName;
                entries.paths[name] = modules[name].location+nn;
            });
            callback(undefined, entries);
        });
    },
    saveNewManifest : function(filename){
        
    },
    //TODO: handle wrapping commonjs -> UMD
}
module.exports = ManifestBuilder;