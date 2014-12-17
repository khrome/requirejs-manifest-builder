var chai = require("chai");
var should = chai.should();
chai.use(require('chai-string')); //this lib's naming convention is horrible, submit PR to keep fluent syntax
var fs = require('fs');

var RequireJSManifestBuilder = require('../builder');
var builder = new RequireJSManifestBuilder();

function manifestHas(manifest, module){
    should.exist(manifest.paths[module]);
    manifest.paths[module].should.startsWith('node_modules/'+module+'/');
}

function validateManifest(manifest){
    should.exist(manifest);
    should.exist(manifest.paths);
    manifestHas(manifest, 'async-arrays');
    manifestHas(manifest, 'async-objects');
    manifestHas(manifest, 'commander');
    manifestHas(manifest, 'less');
}

describe('requirejs-mainifest-builder', function(){
    it('generates a manifest', function(done){
        builder.buildManifest(function(err, manifest){
            should.not.exist(err);
            validateManifest(manifest);
            done();
        });
    });
});

describe('requirejs grunt plugin', function(){
    it('generates a manifest', function(done){
        var grunt = require("grunt");
        
        //grunt.log.writeln = function(){};
        //grunt.verbose.writeln = function(){};
        
        /*
        grunt.log.writeln = function(){};
        grunt.log.write = function(){};
        grunt.verbose.writeln = function(){};
        grunt.verbose.write = function(){};
        //*/
        grunt.cli({
            gruntfile: __dirname+'/../test-task-gruntfile.js',
            
        }, function(){
            fs.readFile('config.json', function(err, data){
                should.not.exist(err);
                var manifest = JSON.parse(data.toString());
                validateManifest(manifest);
                fs.unlinkSync('config.json');
                done();
            });
        });
    });
});

describe('requirejs gulp plugin', function(){
    it('generates a manifest', function(done){
        var gulp = require("gulp");
        var debug = require('gulp-debug');
        var generator = require('../adaptors/gulp.js');
        builder = new RequireJSManifestBuilder();
        gulp.task('test-task', function(cb) {
            var stream = generator.config();
            //stream.pipe(debug({verbose: true}));
            stream.pipe(gulp.dest('test'));
            stream.on('end', function(){
                setTimeout(function(){
                    fs.existsSync('test/file.txt').should.equal(true);
                    fs.readFile('test/file.txt', function(err, data){
                        should.not.exist(err);
                        var manifest = JSON.parse(data.toString());
                        validateManifest(manifest);
                        fs.unlinkSync('test/file.txt');
                        cb(undefined);
                        done();
                    });
                }, 500);
            });
        });
        
        gulp.start(['test-task']);
        
        //var writable = fs.createWriteStream('file.txt');
        //stream.pipe(writable);
        //stream.pipe(gulp.dest('test'));
    });
});