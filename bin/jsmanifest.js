#!usr/bin/env node
var config = require('commander');
var fs = require('fs');
var pkg = require(__dirname+'/../package');

var current = process.cwd();

config.version(pkg.version);
config.option('-d, --directory [directory]', 'The directory who\'s child node_modules will be scanned', current);
config.option('-m, --modules [directory]', 'The directory to scan [requires manifest.realPath() be called in-app to serve]');
config.option('-f, --file [file]', 'The destination file');
config.option('-v, --verbose', 'detailed output', false, function(val){ 
    return 
        (val && val.toLowerCase() !== 'false') &&
        (val && val.toLowerCase() !== 'f')
});
config.parse(process.argv);
config.name = pkg.name;

var ManifestBuilder = require('../builder');
var builder = new ManifestBuilder();

if(config.directory == '.') config.directory = process.cwd()+'/';
if(config.directory && config.directory[0] !== '/') config.directory = process.cwd()+'/' + config.directory;
if(config.modules == '.') config.modules = process.cwd()+'/';
if(config.modules && config.modules[0] !== '/') config.modules = process.cwd()+'/' + config.modules;

if(config.directory !== current  && config.modules) throw new Error('both a standard directory and a module directory ');
if(config.modules){
    builder.modulesPath(config.modules);
}else{
    if(config.directory) builder.options.directory = config.directory;
}
builder.buildManifest({}, function(err, manifest, modules){
    var def = JSON.stringify(manifest, undefined, '    ');
    if(config.file) fs.writeFile(config.file, def, function(err){
        if(err) console.log('failed to write config: '+err.message);
    });
    else console.log(def);
});

if(config.verbose) console.log("\n"+config.name + ' generating a requirejs config manifest '+(config.file?'at '+config.file:'to <stdout>')+' from '+config.directory);
