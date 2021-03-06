//--------- file: classes.js ---------//

define(function () {

    function inherit(subClass, superClass) {
        if (typeof(superClass.constructor) === 'function') {
            subClass.prototype = new superClass();
            subClass.prototype.constructor = subClass;
            subClass.parent = superClass.prototype;
        } else {
            subClass.prototype = superClass;
            subClass.prototype.constructor = subClass;
            subClass.parent = superClass;
        }
    }

    return {
        inherit: inherit
    };

});
