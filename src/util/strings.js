//--------- strings.js ---------//

/*
 * This module provides some functions for string and URL handling.
 */
define(function () {
    "use strict";


    /**
     * Evaluates if a string starts with a certain substring.
     *
     * @param s {String}    The string to check.
     * @param cmp {String}    The putative start sequence
     *
     * @returns {Boolean} True if str starts with cmp, false otherwise.
     *
     * @public
     */
    function startsWith(s, cmp) {
        return s.substr(0, cmp.length) == cmp;
    }

    /**
     * Capitalizes the first character of a string or the first characters of all
     * words of a string.
     *
     * @param s {String}        The string to capitalize.
     * @param sep {String}      Definition of word separators. If this is a falsy value only
     *                          the first character of the string is capitalized. If it is true
     *                          all words separated by ' ' are capitalized. If it is a string or
     *                          regex this will be used to separate words (See string.split())
     *
     * @return {String} A copy of s with capitalized first character(s).
     *
     * @public
     */
    function capitalWords(s, sep) {
        var tmp;
        if (sep) {
            if (typeof(sep) == 'string')
                tmp = s.split(sep);
            else
                tmp = s.split(/[_\- \.:]/);
        } else {
            tmp = [s];
        }
        for (var i = 0; i < tmp.length; i++) {
            var str = tmp[i];
            tmp[i] = str[0].toUpperCase() + str.slice(1);
        }
        return tmp.join(' ');
    }

    /**
     * Removes leading and trailing white space characters.
     *
     * @param s {String}    The string to trim.
     *
     * @return {String} Copy of the string without leading and trailing white space characters.
     *
     * @public
     */
    function trim(s) {
        return (s || '').replace(/^\s+|\s+$/g, '');
    }

    /**
     * Remove leading protocol, host and port from a URL if present.
     *
     * "http://foo.de/a/b/c?d=e" becomes "/a/b/c?d=e"
     *
     * TODO refine regex
     *
     * @param s {String} The URL to modify.
     *
     * @returns {String} The URL without leading protocol, host and port.
     *
     * @public
     */
    function urlOmitHost(s) {

        var result = s.match(/^(http:\/\/|)([A-Za-z0-9\.:-@]*|)(\/.*|^.*)/)[3];

        if (!result) {
            throw "Error: URL mismatch"
        }

        return result;
    }

    /**
     * An id can have the following form
     *
     *      'id'
     *      '/type/id'
     *      '/category/type/id'
     *
     * The function analyses the id and returns all of its parts
     * as an object.
     *
     * @param id {String|Number} The id to analyse.
     *
     * @returns {{type: *, category: *, id: *}} The parts of the segmented id.
     *
     * @public
     */
    function segmentId(id) {

        var type    = undefined ,
            cat     = undefined ,
            numId   = undefined ,
            tmp;

        if (id) {

            // remove host and query part
            tmp = urlOmitHost(id);
            tmp = tmp.split('?')[0];

            // split by path separator
            tmp = tmp.split('/');

            switch (tmp.length) {
                case 1:
                    numId = parseInt(tmp[0]);
                    break;
                case 2:
                    numId = parseInt(tmp[1]);
                    type  = tmp[0];
                    break;
                case 3:
                    numId = parseInt(tmp[2]);
                    type  = tmp[1];
                    cat   = tmp[0];
                    break;
                default:
                    throw "Id '" + id + "' seems not to be a valid id ";
            }

        }

        return {type: type, category: cat, id: numId};
    }

    /**
     * Create a URL from a category, type and id.
     *
     * @param category {String}     The category.
     * @param type {String}         The type.
     * @param id {String}           The id.
     *
     * @returns {string} A base URL.
     *
     * @public
     */
    function makeBaseURL(category, type, id) {
        var url = '/';

        if (category) {
            url = url + category + '/';
        }
        if (type) {
            url = url + type + '/';
        }
        if (id) {
            url = url + id + '/';
        }

        return url + '?';
    }

    // return public parts of the module
    return {
        startsWith:     startsWith ,
        capitalWords:   capitalWords ,
        trim:           trim ,
        urlOmitHost:    urlOmitHost ,
        segmentId:      segmentId ,
        makeBaseURL:    makeBaseURL
    };
});
