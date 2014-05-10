(function (root, factory) {
    if(root.document){
        root.require = factory(require);
    }else if (typeof exports === 'object') {
        module.exports = factory(require('requirejs'));
    }
}(this, function (oldRequire) {
    var paused = false; //pausable, so we can disable define.amd as needed
    var requireShim = function(deps, callback, errback, optional){
        if(paused){
            queue.push(function(){
                requireShim.apply(requireShim, arguments);
            })
        }else{
            oldRequire(deps, function(){
                var config = requirejs.s.contexts._.config;
                var modules = Array.prototype.slice.call(arguments);
                var name, map, shim;
                modules.forEach(function(module, index){
                    name = deps[index];
                    map = (config.map && config.map[name]) || {};
                    shim = (config.shim && config.shim[name]) || {};
                    if(shim.process) module = shim.process(name, module, config);
                    modules[index] = module;
                });
                if(callback) callback.apply(callback, modules);
            }, errback || console.err, optional);
        }
    };
    var queue = [];
    requireShim.pause = function(exemptions){
        paused = exemptions || true;
    };
    requireShim.resume = function(){
        var jobs = queue;
        queue = [];
         paused= false;
        jobs.forEach(function(job){
            job();
        });
    };
    requireShim.bypass = oldRequire;
    return requireShim;
}));