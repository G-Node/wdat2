//--------- network_resource.js ---------//

/*
 * Provides the class NetworkResource
 * The other classes defined in this module (RequestManager, Cache)
 * are not part of the public API
 */
define(['util/strings', 'api/model_helpers'], function (strings, model_helpers) {
    "use strict";


    /**
     * Constructor for the class RequestManager.
     * TODO Implement doGETArray()
     *
     * @constructor
     */
    function RequestManager() {

        var _cache      = new Cache();

        /**
         * Performs a single post request.
         *
         * @param url {String}      The url for the request
         * @param data {Object}     The request data.
         * @param callback {Function} Callback that gets the result back.
         */
        this.doPOST = function(url, data, callback) {

            var xhr = new XMLHttpRequest();

            url = strings.urlOmitHost(url);

            xhr.onreadystatechange = collect;
            xhr.open('POST', url);
            xhr.send(JSON.stringify(data));

            // collect the result and call callback function
            function collect() {
                if (xhr.readyState === 4) {

                    var response = _buildResponse(xhr, url, 'POST');

                    // store response and notify callback when all requests are done
                    callback({primary: [response], secondary: []});
                }
            }
        };

        /**
         * Performs multiple, parallel requests with deep option.
         *
         * @param urls {Array}
         * @param callback {Function}
         * @param depth {Number}
         */
        this.doGET = function(urls, callback, depth) {

            var primary = [] ,
                secondary = [] ,
                currDepth = depth || 0 ,
                error = false;

            // perform GET for all urls and let the results be collected
            // by collectPrimary
            _doMultiGET(urls, collectPrimary);

            // callback collects primary results and
            // starts deep requests if necessary
            function collectPrimary(responses) {

                for (var i = 0; i < responses.length && !error; i++) {
                    var d = responses[i];
                    if (d.error) {
                        error = true;
                    }
                    primary.push(d);
                }

                if (currDepth === 0 || error) {
                    callback({primary: primary, secondary: secondary});
                } else if (!error) {
                    var urls = _childURLs(responses);
                    if (urls.length > 0) {
                        currDepth -= 1;
                        _doMultiGET(urls, collectSecondary);
                    }
                }
            }

            // callback collects secondary results and
            // continues deep requests if necessary
            function collectSecondary(responses) {

                for (var i = 0; i < responses.length && !error; i++) {
                    var d = responses[i];
                    if (d.error) {
                        error = true;
                    }
                    secondary.push(d);
                }

                if (currDepth === 0 || error) {
                    callback({primary: primary, secondary: secondary});
                } else if (!error) {
                    var urls = _childURLs(responses);
                    if (urls.length > 0) {
                        currDepth -= 1;
                        _doMultiGET(urls, collectSecondary);
                    }
                }
            }

        };

        /**
         * Determine urls of all children of every response object
         * and return them in one single array.
         *
         * @param responses {Array}     Some responses from the REST-api
         *
         * @returns {Array} Urls from all children.
         *
         * @private
         */
        function _childURLs(responses) {

            var urls = [] ,
                selected ,
                element ,
                childfields ,
                children ,
                type;

            for (var i = 0; i < responses.length; i++) {
                if (!responses[i].error && responses[i].data) {

                    selected = responses[i].data.selected;

                    for (var j = 0; j < selected.length; j++) {
                        element = selected[j];
                        type = (type = element.model.split('.'))[type.length - 1];

                        childfields = model_helpers.children(type);

                        for (var k in childfields) {
                            if (childfields.hasOwnProperty(k) && childfields[k].type !== type) {
                                children = element.fields[k];
                                if (children) {
                                    urls = urls.concat(children);
                                }
                            }
                        }
                    }
                }
            }

            return urls;
        }

        /**
         * Private function that performs simple GET requests
         * without any other options (e.g. deep).
         *
         * @param urls {Array}
         * @param callback {Function}
         *
         * @private
         */
        function _doMultiGET(urls, callback) {

            var responses = [];
            for (var i = 0; i < urls.length; i++) {
                request(urls[i]);
            }

            // do single request with caching
            function request(url) {

                var xhr = new XMLHttpRequest() ,
                    tag;

                url = strings.urlOmitHost(url);
                tag = _cache.etagByURL(url);

                xhr.onreadystatechange = collect;
                xhr.open('GET', url);
                if (tag) {
                    xhr.setRequestHeader('If-None-Match', tag);
                } else {
                    xhr.setRequestHeader('If-None-Match', 'ed2876adff987613414abcged091875621823760');
                }
                xhr.send(null);

                // closure that collects results and
                // invokes callback when ready.
                function collect() {
                    if (xhr.readyState === 4) {

                        var response = _buildResponse(xhr, url, 'GET');

                        // store response and notify callback when all requests are done
                        responses.push(response);
                        if (responses.length === urls.length) {
                            _cache.clean();
                            callback(responses);
                        }
                    }
                }
            }
        }

        /**
         * Build a response object from a finished XMLHttpRequest (readyState == 4).
         * The response is an object that contains the following information:
         *
         * {
         *     url: {String},
         *     error: {Boolean},
         *     data: {Array},
         *     range: {Array},
         *     status: {Number},
         *     message: {String},
         * }
         *
         * @param xhr {XMLHttpRequest} Request object with ready state == 4.
         * @param url {String} The url of the request.
         * @param type {String} Either "GET" or "POST" (optional: default "GET").
         *
         * @returns {Object} A response object.
         * @private
         */
        function _buildResponse(xhr, url, type) {

            var contentType = xhr.getResponseHeader('Content-Type') ,
                etag        = xhr.getResponseHeader('ETag') ,
                content     = xhr.responseText;

            // default response
            var response = {
                    url:        url ,
                    error:      false ,
                    data:       [] ,
                    range:      [0, 0] ,
                    status:     parseInt(xhr.status) ,
                    type:       type || "GET",
                    message:    'No message'
            };

            // response and error handling
            if (response.status === 200) {
                // all OK

                if (contentType === 'application/json') {
                    content = JSON.parse(content);
                    if (etag !== null) {
                        _cache.store(url, etag, content);
                    }
                    response.message = content.message;
                    response.data    = content.selection;
                    response.range   = content.selected_range;
                } else {
                    response.error   = true;
                    response.message = "Severe Error: wrong content type or no content ("+status+")";
                }

            } else if (response.status === 304) {
                // unmodified

                content = _cache.contentByEtag(etag);
                if (!content) {
                    response.error   = true;
                    response.message = "Severe Error: cache miss etag = '"+etag+"' ("+status+")";
                } else {
                    response.message = content.message;
                    response.data    = content.selection;
                    response.range   = content.selected_range;
                }

            } else if (response.status >= 400 && response.status < 500) {
                // client errors

                response.error = true;
                if (contentType === 'application/json') {
                    content = JSON.parse(content);
                    response.message = content.message;
                } else {
                    response.message = "Client Error: unresolved ("+status+")";
                }

            } else {
                // server errors and unexpected responses

                response.error   = true;
                response.message = "Server Error: unresolved ("+status+")";

            }

            return response;
        }

    } // end RequestManager

    /**
     * Constructor for the class Cache. Implements a LRU (least recently used)
     * cache for request results.
     *
     * @constructor
     * @private
     */
    function Cache() {
        var _lru = {} ,
            _size = 1000;

        /**
         * Do cache lookup by etag and return content if cached.
         *
         * @param etag {String}     Etag for cache management.
         *
         * @returns {Object|undefined} The cached object or undefined.
         */
        this.contentByEtag = function(etag) {

            var content = undefined;

            for (var url in _lru) {
                if (_lru.hasOwnProperty(url) && _lru[url].etag === etag) {
                    content = _lru[url].content;
                    break;
                }
            }

            return content;
        };

        /**
         * Get the last etag that is associated with a URL.
         *
         * @param url {String} The associated URL.
         * @returns {String|undefined} The found etag or undefined if not found.
         */
        this.etagByURL = function(url) {

            var etag = undefined;

            if (_lru.hasOwnProperty(url) && _lru[url].etag) {
                etag = _lru[url].etag;
            }

            return etag;
        };

        /**
         * Store content in the cache.
         *
         * @param url {String} The URL pointing to the content.
         * @param etag {String} The etag of that content.
         * @param content {Object} The content as returned by the request.
         */
        this.store = function(url, etag, content) {

            if (url && etag && content) {
                _lru[url] = {etag: etag, content: content, time: (new Date()).valueOf(), url: url};
            }

        };

        /**
         * Remove least recently used content from the cache if the maximum size
         * was reached.
         */
        this.clean = function() {

            var all = [];

            for (var url in _lru) {
                if (_lru.hasOwnProperty(url)) {
                    var d = _lru[url];
                    all.push(d);
                }
            }

            var numDelete = all.length - _size;

            if (numDelete > 0) {
                all.sort(function(first, second) {
                    return first.time - second.time;
                });

                for (var i = 0; i < numDelete; i++) {
                    delete _lru[all[i].url];
                }
            }

        };

    } // end Cache

    return RequestManager;
});
