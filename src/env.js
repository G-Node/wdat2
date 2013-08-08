//--------- env.js ---------//

/*
 * This module defines some variables like version and debug mode.
 */
define(function () {
    "use strict";

    /**
     * The current version number of wdat.
     *
     * @type {String}
     */
    var version = '0.17.0';

    /**
     * Turn on/of debug mode for wdat.
     *
     * @type {Boolean}
     */
    var debug = true;

    return {
        version:    version ,
        debug:      debug
    };
});
