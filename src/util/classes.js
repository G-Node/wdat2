//--------- file: classes.js ---------//

define(function () {

    function inherit(subClass, superClass) {
        if (typeof(parent.constructor) === 'function') {
            subClass.prototype = new superClass();
            subClass.prototype.constructor = subClass;
            subClass.parent = superClass.prototype;
        } else {
            subClass.prototype = parent;
            subClass.prototype.constructor = subClass;
            subClass.parent = superClass;
        }
    }

    return {
        inherit: inherit
    };

});
