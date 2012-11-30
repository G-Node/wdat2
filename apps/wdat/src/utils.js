// ---------- file: utils.js ---------- //

//-------------------------------------------------------------------------------------
// IMPORTANT: This file defines functions and name spaces that can and should be used
// by every other part of the project. Make sure that the definitions in this file are
// always available (see Makefile).
//-------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------
// Helper functions
//-------------------------------------------------------------------------------------

// deprecated
String.prototype.startsWith = function (leader) {
  return this.substr(0, leader.length) === leader;
};

/* Evaluates if a string starts with a certain substring.
 * 
 * Parameters:
 *  - str: String     The string to check
 *  
 *  - cmp: String     The putative start sequence
 *  
 * Return value:
 *    True if str starts with cmp, false otherwise.
 */
function strStartsWith(str, cmp) {
  return str.substr(0, cmp.length) == cmp;
}

/* Capitalizes the first character of a string or the first characters of all 
 * words of a string.
 * 
 * Parameters:
 *  - str: String     The string to capitalize.
 *  
 *  - sep:            Definition of word separators. If this is a falsy value only
 *                    the first character of the string is capitalized. If it is true
 *                    all words separated by ' ' are capitalized. If it is a string or
 *                    regex this will be used to separate words (See string.split())
 * 
 * Return value:
 *    A copy of str with capitalized first character(s).
 */
function strCapitalizeWords(str, sep) {
  var tmp;
  if (sep) {
    if (sep === true)
      tmp = str.split(/\ /);
    else
      tmp = str.split(sep);
  } else {
    tmp = [str];
  }
  for (var i in tmp) {
    var s = tmp[i];
    tmp[i] = s[0].toUpperCase()+s.slice(1);
  }
  return tmp.join(' ');
}

/* Removes leading and trailing white space characters.
 * 
 * Parameters:
 *  - str: String     The string to trim.
 *  
 * Return value:
 *    Copy of the string without leading and trailing white space characters.
 */
function strTrim(str) {
  return (str || '').replace(/^\s+|\s+$/g, '');
}

/* Traverses the object and its child objects recursively and 
 * returns the value of the first property with the given name. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 * 
 * Parameters:
 *  - obj: Obj          The object to search in
 * 
 *  - prop: String      The name of the property to find
 *  
 *  - children: Array   Only search this subset of children (if present)
 *  
 * Return value:
 *    The value of the first found property with the given name or null if no
 *    matching property was found. 
 */
function objGetRecursive(obj, prop, children) {
  var found = false;
  var stack = [];
  stack.push(obj);
  while(stack.length > 0 && !found) {
    obj = stack.pop();
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          found = obj[i];
          break;
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object' ) {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
}

/* Traverse the object and its child objects recursively and
 * set all properties with a matching name to the given value. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * Parameters:
 *  - obj: Obj          The object to search in
 * 
 *  - prop: String      The name of the property to find
 *  
 *  - val: Any          The value to set
 *  
 *  - children: Array   Only search this subset of children (if present)
 *  
 * Return value:
 *    The number of properties found with the given name.
 */
function objSetRecursive(obj, prop, val, children) {
  var found = 0;
  var stack = [];
  stack.push(obj);
  while(stack.length > 0) {
    obj = stack.pop();
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          obj[i] = val;
          found++;
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object' ) {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
}

/* More expressive inheritance. 
 *
 * Parameter:
 *  - subclass: function     Constructor of the subclass
 *
 *  - superclass: function   Constructor of the super class
 *
 * Return value:
 *    None
 */
function inherit(Sub, Super) {
  Sub.prototype = new Super();
  Sub.prototype.constructor = Sub;
  Sub.parent = Super.prototype;
}

//-------------------------------------------------------------------------------------
// Name spaces
//-------------------------------------------------------------------------------------
var WDAT = WDAT || {};
WDAT.api = WDAT.api || {};    // name space related to the RESTfull API
WDAT.app = WDAT.app || {};    // name space for application specific parts
WDAT.ui  = WDAT.ui || {};     // name space for UI base classes