var grunt = require('grunt');
var fs = require('fs');
var Manifest = require('../../builder');
grunt.registerTask('jsmanifest', 'Index modules in \'node_modules\' for UMD delivery to the client', function() {
    var builder = new Manifest();
    grunt.log.writeln('Generating requirejs config');
    var done = this.async();
    builder.buildManifest({}, function(buildError, manifest, modules){
        //todo: options
        var def = JSON.stringify(manifest, undefined, '    ');
        fs.writeFile(process.cwd()+'/config.json', def, function(writeError){
            //if(buildError || writeError) grunt.log.writeln('failed to write config: '+(buildError || writeError).message);
            //else grunt.log.writeln('config.json written');
            done();
        });
    });
});