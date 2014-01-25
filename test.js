var should = require("should");
var RequireJSManifestBuilder = require('./builder');

var builder = new RequireJSManifestBuilder();

describe('requirejs-mainifest-builder', function(){
    it('generates a manifest', function(done){
        builder.buildManifest(function(err, manifest){
            should.not.exist(err);
            should.exist(manifest);
            should.exist(manifest.paths);
            should.exist(manifest.paths['async-arrays']);
            manifest.paths['async-arrays'].should.equal('./node_modules/async-arrays/async-arrays.js');
            done();
        });
    });
});