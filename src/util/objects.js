//--------- objects.js ---------//

/*
 * This module defines helper functions for recursive operations
 * like merge, copy, set and get on objects.
 */
define(function() {
    "use strict";

    /**
     * Traverses the object and its child objects recursively and
     * returns the value of the first property with the given name. Optionally
     * a set of names of child objects can be defined in order of limiting the
     * scope of the search.
     *
     * @param object {Object}   The object to search in
     * @param prop {String}     The name of the property to find
     * @param children {Array}  Only search this subset of children (if present)
     *
     * @returns {} The value of the first property with the given name or undefined.
     */
    function deepGet(object, prop, children) {
        var found = undefined ,
            stack = [];

        stack.push(object); // stack used for object traversing

        while(stack.length > 0 && !found) {
            var obj = stack.pop();
            for (var field in obj) {
                if (obj.hasOwnProperty(field)) {
                    if (field === prop) {
                        found = obj[field];
                        break;
                    } else {
                        var v = obj[field];
                        if (children !== undefined) {
                            // if children check if v is an object
                            if (typeof(v) === 'object' && v !== null && children.indexOf(field) >= 0) {
                                stack.push(v);
                            }
                        } else {
                            // if children are not set check if v is an object
                            if (typeof(v) === 'object' && v !== null) {
                                stack.push(v);
                            }
                        }
                    }
                }
            }
        }

        return found;
    }

    /**
     * Traverse the object and its child objects recursively and
     * set all properties with a matching name to the given value. Optionally
     * a set of names of child objects can be defined in order of limiting the
     * scope of the search.
     *
     * @param object {Object}   The object to search in
     * @param prop {String}     The name of the property to find
     * @param val {}            The value to set
     * @param children {Array}  Only search this subset of children (if present)
     *
     * @return {Number} The number of properties found with the given name that have been changed.
     */
    function deepSet(object, prop, val, children) {
        var stack = [] ,
            count = 0;

        stack.push(object); // stack used for object traversing

        while(stack.length > 0) {
            var obj = stack.pop();
            for (var field in obj) {
                if (obj.hasOwnProperty(field)) {
                    if (field === prop) {
                        obj[field] = val;
                        count++;
                        break;
                    } else {
                        var v = obj[field];
                        if (children !== undefined) {
                            // if children, check if v is an object
                            if (typeof(v) === 'object' && v !== null && children.indexOf(field) >= 0) {
                                stack.push(v);
                            }
                        } else {
                            // if children are not set check if v is an object
                            if (typeof(v) === 'object' && v !== null) {
                                stack.push(v);
                            }
                        }
                    }
                }
            }
        }

        return count;
    }

    /**
     * Merges to objects recursively with deep copying.
     *
     * @param to {Object}           The object that will be merged.
     * @param thing {Object}        The object to merge with.
     * @param overwrite {Boolean}   Overwrite/merge existing fields (optional: default true).
     *
     * @returns {Object} The merged object.
     */
    function deepMerge(to, thing, overwrite) {
        var copies = [];

        overwrite = overwrite || overwrite === undefined;

        to = _merge(to, thing);


        // merges an object recursively with another
        function _merge(target, source) {

            for (var field in source) {
                if (source.hasOwnProperty(field)) {

                    var v = source[field];
                    var type = typeof(v);

                    if (target.hasOwnProperty(field) && type === 'object') {
                        if (overwrite) {
                            if (v === null) {
                                target[field] = v;
                            } else {
                                target[field] = _merge(target[field], v);
                            }
                        }
                    } else {
                        target[field] = _copy(v);
                    }
                }
            }

            return target;
        }

        // returns an existing copy or an empty object
        function _existingCopy(source) {
            var found = undefined;
            for (var i = 0; i < copies.length; i++) {
                if (source === copies[i][0]) {
                    found = copies[i][1];
                    break;
                }
            }
            return found;
        }

        // recursive deep copy
        function _copy(source) {
            var target = undefined ,
                type = typeof(source) ,
                c;

            if (source instanceof Array) {
                target = source.slice(0, source.length);
            } else if (type === 'string') {
                target = source.toString();
            } else if (type === 'number') {
                target = source;
            } else if (type === 'object') {
                if (source !== null) {
                    target = _existingCopy(source);
                    if (!target) {
                        target = {};
                        for(var field in source) {
                            if (source.hasOwnProperty(field)) {
                                c = _copy(source[field]);
                                if (c !== undefined) {
                                    target[field] = _copy(source[field]);
                                }
                            }
                        }
                        copies.push([source, target]);
                    }
                } else {
                    target = source;
                }
            }

            return target;
        }

        return to;
    }


    /**
     * Creates a deep copy of an array or object.
     *
     * @param thing {Object|Array} The thing to copy.
     *
     * @returns {Object|Array} The copy of thing.
     */
    function deepCopy(thing) {
        var copies = [] ,
            newthing;

        // call recursive copy function
        newthing = _copy(thing);

        // returns an existing copy or an empty object
        function _existingCopy(source) {
            var found = undefined;
            for (var i = 0; i < copies.length; i++) {
                if (source === copies[i][0]) {
                    found = copies[i][1];
                    break;
                }
            }
            return found;
        }

        // recursive deep copy
        function _copy(source) {
            var target = undefined ,
                type = typeof(source) ,
                c;

            if (source instanceof Array) {
                target = source.slice(0, source.length);
            } else if (type === 'string') {
                target = source.toString();
            } else if (type === 'number') {
                target = source;
            } else if (type === 'object') {
                if (source !== null) {
                    target = _existingCopy(source);
                    if (!target) {
                        target = {};
                        for(var field in source) {
                            if (source.hasOwnProperty(field)) {
                                c = _copy(source[field]);
                                if (c !== undefined) {
                                    target[field] = _copy(source[field]);
                                }
                            }
                        }
                        copies.push([source, target]);
                    }
                } else {
                    target = source;
                }
            }

            return target;
        }

        return newthing;
    }

    // return public parts of the module
    return {
        deepCopy:  deepCopy ,
        deepMerge: deepMerge ,
        deepSet:   deepSet ,
        deepGet:   deepGet
    };

});
