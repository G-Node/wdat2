// ---------- file: string.js ---------- //


/**
 * Evaluates if a string starts with a certain substring (mixin).
 * @deprecated
 *
 * @param cmp {string}    The string to commpare with.
 *
 * @returns {Boolean} True if the string starts with cmp, false otherwise.
 */
String.prototype.startsWith = function(cmp) {
  return this.substr(0, cmp.length) === cmp;
};

/**
 * Evaluates if a string starts with a certain substring.
 *
 * @param s {string}    The string to check.
 * @param cmp {string}    The putative start sequence
 *
 * @returns True if str starts with cmp, false otherwise.
 */
strStartsWith = function(s, cmp) {
  return s.substr(0, cmp.length) == cmp;
};

/**
 * Capitalizes the first character of a string or the first characters of all
 * words of a string.
 *
 * @param s {string}      The string to capitalize.
 * @param sep {string}      Definition of word separators. If this is a falsy value only
 *                          the first character of the string is capitalized. If it is true
 *                          all words separated by ' ' are capitalized. If it is a string or
 *                          regex this will be used to separate words (See string.split())
 *
 * @return A copy of s with capitalized first character(s).
 */
strCapitalWords = function(s, sep) {
  var tmp;
  if (sep) {
    if (typeof(sep) == 'string')
      tmp = s.split(sep);
    else
      tmp = s.split(/[_\-\ \.:]/);
  } else {
    tmp = [s];
  }
  for ( var i in tmp) {
    var s = tmp[i];
    tmp[i] = s[0].toUpperCase() + s.slice(1);
  }
  return tmp.join(' ');
};

/**
 * Removes leading and trailing white space characters.
 *
 * @param s {string}    The string to trim.
 *
 * @return Copy of the string without leading and trailing white space characters.
 */
strTrim = function(s) {
  return (s || '').replace(/^\s+|\s+$/g, '');
};

