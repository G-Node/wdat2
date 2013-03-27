// ---------- file: api/url_tools.js ---------- //

// Add functions that are needed to transform search strings and
// parameter into URLs to the api mudule.
var api; (function(api) {

  /**
   * Remove everything but the path part from a URL.
   * Example: 'http://host/foo/bar?param' = 'foo/bar'
   *
   * @param url {string}    A string representing a URL.
   *
   * @returns {sting} The path part of the URL.
   */
  api.stripURL = function(url) {
    // TODO implement
  };

  /**
   * Turn a search string into a set of search parameter.
   *
   * @param str {string}    A search string.
   *
   * @returns {Array} An array with all search parameters extracted
   *                  from the search string.
   */
  api.strToSearch = function(str) {
    // TODO implement
  };

  /**
   * Turn a set of search parameter into a set of URLs.
   *
   * @param search {Array}   Array of search parameters.
   *
   * @returns {Array} Array of URLs.
   */
  api.searchToURL = function(search) {
    // TODO implement
  };

})(api || (api = {}));