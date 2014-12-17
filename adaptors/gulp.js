var Manifest = require('../builder');
var builder = new Manifest();
var File = require('vinyl');
var arrays = require('async-arrays');
var strm = require('stream');

function GulpJSManifest(dir){
    this.queue = [];
    ob = this;
    setTimeout(function(){
        //console.log('manifest init start', dir);
        builder.buildManifest(function(buildError, manifest, output){
            ob.manifest = manifest;
            ob.polymer = output.polymer;
            ob.ready = function(fn){ fn(); };
            var jobs = ob.queue;
            ob.queue = [];
            jobs.forEach(function(job){
                job();
            });
        });
    }, 1);
};

GulpJSManifest.prototype.ready = function(cb){
    this.queue.push(cb);
};

var makeVinylFileWithContentMode = function(mode){
    var content;
    switch(mode.toLowerCase()){
        case 'stream':
            content = new Buffer('');
            content.put = function(str){
                content.fill(str);
            }
            break;
        case 'buffer':
            content = new streamBuffers.ReadableStreamBuffer();
            break;
        default : throw new Error('unrecognized mode: '+mode);
    }
    var outputFileObject = new File({
        base: "test/",
        path: "test/file.txt",
        contents: content
    });
    return outputFileObject;
}

var fileObject = function(object, mode, callback, builder){
    var file = makeVinylFileWithContentMode(mode || 'buffer');
    //console.log('??');
    builder.ready(function(){
        //console.log('READY');
        file.contents.put(JSON.stringify(object, undefined, '    '), "utf8");
        if(callback) callback(file);
    });
}

var createObjectStreamFromMember = function(manifest, member, mode){
    var stream = new strm.Readable({ objectMode: true });
    stream.queue = [];
    var finished = false;
    stream.safePush = function(data){
        //console.log('pushing', data);
        if(stream.queue === true){
            stream.push(data);
            stream.queue = [];
        }else{
            stream.queue.push(data);
        }
    }
    stream.safeDone = function(){
        finished = true;
        if(stream.queue === true) stream.push(null);
    }
    stream._read = function () {
        if(stream.queue.length){
            stream.push(stream.queue.shift());
        }else{
            if(finished) stream.push(null);
            else stream.queue = true; //mark for immediate push when data is ready
        }
    };
    if(typeof member == 'string'){
        if(typeof manifest[member] == 'array'){
            var ob = this;
            arrays.forEachEmission(manifest[member], function(ob, index, done){
                fileObject(ob, mode, function(file){
                    stream.safePush(file);
                    //console.log('*PUSH', file);
                    done()
                }, ob);
            }, function(){
                stream.safeDone();
            });
        }else{
            fileObject(manifest[member], mode, function(file){
                //console.log('&PUSH', file);
                stream.safePush(file);
            }, manifest);
            stream.safeDone();
        }
    }else{
        fileObject(member, mode, function(file){
            //console.log('$PUSH', file);
            stream.safePush(file);
        });
        stream.safeDone();
    }
    /*stream.on('readable', function(){
        console.log('$$$$', arguments);
    }); */
    return stream;
}

GulpJSManifest.prototype.config = function(mode){
    return createObjectStreamFromMember(this, 'manifest', mode);
};

GulpJSManifest.prototype.polymerComponents = function(mode){
    return createObjectStreamFromMember(this, 'polymer', mode);
};

var manifest;

module.exports = {
    config : function(options){
        return (manifest || (manifest = new GulpJSManifest())).config((options && options.buffer)?'buffer':'stream');
    },
    polymer : function(options){
        return (manifest || (manifest = new GulpJSManifest())).polymerComponents((options && options.buffer)?'buffer':'stream');
    }
};