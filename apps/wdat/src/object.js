// ---------- file: object.js ---------- //


/**
 * Traverses the object and its child objects recursively and
 * returns the value of the first property with the given name. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object {Object}      The object to search in.
 * @param prop {string}     The name of the property to find.
 * @param children {Array}  Only search this subset of children (if present)
 *
 * @return The value of the first found property with the given name or null if no
 *          matching property was found.
 */
objGetRecursive = function(object, prop, children) {
  var found = null;
  var stack = [];
  stack.push(object);
  while (stack.length > 0 && !found) {
    var obj = stack.pop();
    for ( var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          found = obj[i];
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
};

/**
 * Traverse the object and its child objects recursively and
 * set all properties with a matching name to the given value. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object {Object}   The object to search in.
 * @param prop {string}     The name of the property to find.
 * @param val               The value to set
 * @param children {Array}  Only search this subset of children (if present)
 *
 * @return {number} The number of properties found with the given name.
 */
objSetRecursive = function(object, prop, val, children) {
  var found = 0;
  var stack = [];
  stack.push(object);
  while (stack.length > 0) {
    var obj = stack.pop();
    for ( var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          obj[i] = val;
          found++;
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
};

/**
 * Merges the properties of the first object into the second one.
 * Side effect! Changes the object passed as the second parameter.
 *
 * @param from {Object}        The source object.
 * @param to {Object}          The target object.
 * @param override {Boolean}   Override existing attributes in the target.
 * @param blacklist {Array} Exclude these attributes.
 *
 * @return {Object} The merged object (to).
 */
objMerge = function(from, to, override, blacklist) {
  if (from) {
    for ( var i in from) {
      if (from.hasOwnProperty(i) && (!blacklist || blacklist.indexOf(i) == -1)) {
        if (override || !to.hasOwnProperty(i))
          to[i] = from[i];
      }
    }
  }
  return to;
};

