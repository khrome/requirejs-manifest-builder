(function (root, factory) {
    if(root.document){
        root.foo = factory();
    }else if (typeof exports === 'object') {
        module.exports = factory();
    }
}(this, function () {
    return {foo:true};
}));