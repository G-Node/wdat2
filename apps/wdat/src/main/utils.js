// ---------- file: utils.js ---------- //

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


