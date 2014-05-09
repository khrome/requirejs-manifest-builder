(function (root, factory) {
    if(root.document){
        root.require = factory(require);
    }else if (typeof exports === 'object') {
        module.exports = factory(require('requirejs'));
    }
}(this, function (oldRequire) {
    var requireShim = function(deps, callback, errback, optional){
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
            callback.apply(callback, modules);
        }, errback || console.err, optional);
    };
    return requireShim;
}));