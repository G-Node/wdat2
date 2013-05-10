// ---------- file: api/url_tools.js ---------- //

// Add functions that are needed to transform search strings and
// parameter into URLs to the wdat module.
var wdat; (function(wdat) {

  /**
   * Remove everything but the path part from a URL.
   * Example: 'http://host/foo/bar?param' = 'foo/bar'
   *
   * @param url {string}    A string representing a URL.
   *
   * @returns {sting} The path part of the URL.
   */
  wdat.stripURL = function(url) {
    var tmp = url.split('://');
    // remove protocol host and port if present
    if (tmp.length > 1) {
      tmp = tmp.slice(1, tmp.length).join('');
      tmp = tmp.split('/');
      tmp = tmp.slice(1, tmp.length).join('/');
    } else {
      tmp = tmp.join('');
    }
    // remove parameter
    return tmp.split('?')[0];
  };

  /**
   * Turn a search string into a set of search parameter.
   *
   * @param str {string}    A search string.
   *
   * @returns {Array} An array with all search parameters extracted
   *                  from the search string.
   */
  wdat.stringToSearch = function(str) {
    var splitOR, splitAND, splitOp, error;
    var result = [];
    splitOR = str.split(/\s+[Oo][Rr]\s+|\|/);
    for (var i in splitOR) {
      var partResult = {};
      splitAND = splitOR[i].split(/\s+[Aa][Nn][Dd]\s+|,|&/);
      for (var j in splitAND) {
        splitOp = splitAND[j].split(/([<>=:])/);
        if (splitOp.length == 3) {
          var key = strTrim(splitOp[0]);
          var op  = strTrim(splitOp[1]);
          var val = strTrim(splitOp[2]);
          if (op == ':') op = '=';
          partResult[key] = [val, op];
        } else {
          error = 'Parsing of search parameters failes at substring "' +
                  splitAND[j] + '".';
          throw error;
        }
      }
      result.push(partResult);
    }
    return result;
  };

  /**
   * Turn a set of search parameter into a set of URLs.
   *
   * @param search {Array}   Array of search parameters.
   *
   * @returns {Array} Array of URLs.
   *
   * TODO
   * also generate urls for deep search like
   * http://localhost:8000/metadata/value/?parent_property__section=15
   */
  wdat.searchToURL = function(search) {
    // TODO implement
  };


  /**
   *
   */
  function _specifierToURL(spec) {
    // TODO implement
  }

  /**
   *
   */
  function _specifierToURLComp(type, key, value, operator) {
    // TODO implement
  }

})(wdat || (wdat = {}));