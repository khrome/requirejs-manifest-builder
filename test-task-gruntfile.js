module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON(__dirname+'/package.json'),
        jsmanifest: {
            options: {}
        }
    });
    
    // Load the plugin that provides the "uglify" task.
    grunt.task.loadTasks(__dirname+'/adaptors/gruntTasks')
    
    // Default task(s).
    grunt.registerTask('default', ['jsmanifest']);

};