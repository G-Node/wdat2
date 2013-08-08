//--------- network_resource.js ---------//

/*
 * Provides the class NetworkResource
 * The other classes defined in this module (RequestManager, Cache)
 * are not part of the public API
 */
define(['util/strings', 'api/model_helpers'], function (strings, model_helpers) {
    "use strict";

    /**
     * Constructor for the class network resource.
     *
     * TODO Implement get method or specifier for data
     * TODO Implement synchronous request e.g. for user data
     *
     * @constructor
     * @public
     */
    function NetworkResource() {

        // some constants
        var SAFETY_LEVEL    = {'public': 1, 'friendly': 2, 'private': 3} ,
            OPERATOR        = {'=': '__icontains=', '>': '__gt=', '<': '__le='};

        // initialize a RequestManager
        var _manager = new RequestManager();

        /**
         * Get elements from the REST api via search specifier.
         *
         * A search specifier has the following structure:
         * {name: val, ...} or {name: [value, operator], ...}
         *
         * @param specifier {Array|Object}  A search specifier or an array of specifiers.
         * @param callback {Function}       A callback function.
         *
         * @public
         */
        this.get = function(specifier, callback) {
            var param = _parseSpecifier(specifier);
            _manager.doGET(param.urls, callback, param.depth);
        };

        /**
         * Fetch data as JSON for a given datafile with [slicing] and/or [downsampling].
         *
         * @param url {String}          A URL, like "/datafiles/1736/?start_time=15"
         * @param callback {Function}   A callback function.
         * @param [params] {Object}     Object of the form like
         *                                  {"max_points": <Number>, "start": <Number>,"end": <Number>}
         *
         * @public
         */
        this.getData = function(url, callback, params) {

            var obj_url     = strings.urlOmitHost( url), // URL with parameters
                obj_type    = strings.segmentId( obj_url).type,
                links       = {}, // links to the datafiles with arrays
                all_data    = {}, // collector of data-fields with data
                obj_response;

            var param_map = {
                'downsample':   params['max_points'] || null, // End (time) in SI units (no-prefix)
                'start_time':   params['start'] || null, // Maximum datapoints to return on (X-axis)
                'end_time':     params['end'] || null // Start (time) in SI units (no-prefix)
            };

            // add parameters to the URL
            var counter = 0;
            for (var i in param_map) {
                if (param_map.hasOwnProperty(i)) {

                    // add a ? character if some params are defined
                    if (counter == 0 && param_map[i]) {
                        obj_url += '?';
                        counter++
                    }

                    // concatenate parameters to the URL
                    if (param_map[i]) {
                        obj_url += encodeURIComponent(i) + '=' + encodeURIComponent(param_map[i]) + '&'
                    }
                }
            }

            // remove last & if any of the params were assigned
            if (counter > 0) { obj_url.substring(0, obj_url.length-1) }

            // an url is a url to fetch single plottable object
            // with slicing / downsampling parameters
            _manager.doGET([obj_url], main_handler, 0, true);

            // callback that will parse main response object and fetch
            // data from permalinks in data-fields
            function main_handler(response) {

                obj_response = response; // save response for other callbacks
                var data        = response.primary[0]['data'],
                    data_fields = model_helpers.data( obj_type),
                    obj         = data[0],
                    field_type,
                    reference;

                // validate response
                if (data['error']) {

                    callback( response );

                } else {
                    // iterate over all data fields and fetch arrays
                    for (var field_name in obj['fields']) {
                        if (obj['fields'].hasOwnProperty(field_name) && data_fields.hasOwnProperty(field_name)) {

                            field_type = data_fields[ field_name ]['type'];
                            reference = obj['fields'][ field_name ]['data'];
                            if (field_type === 'datafile' && !(reference === null)) {
                                links[ field_name ] = reference;
                            }

                        }
                    }

                    // fetch real [sliced] [downsampled] array-data
                    counter = 0;
                    for (var f in links) {
                        if (links.hasOwnProperty(f)) {
                            counter++;
                            _manager.doGETDATA( links[f], collect, f);
                        }
                    }

                    if (counter === 0) {
                        // all data fields are null, return main response
                        callback( obj_response );
                    }
                }
            }

            // closure that collects array-data results and
            // invokes callback when ready
            function collect(data_response) {

                if (data_response.primary[0].message == 'data fetched') {

                    // all OK
                    var field_name = data_response.primary[0]['field_name'];
                    all_data[ field_name ] =  data_response.primary[0].data;

                    if (Object.keys( all_data ).length === Object.keys( links ).length) {

                        // update array-data fields with fetched data
                        for (var f in all_data) {
                            if (all_data.hasOwnProperty(f)) {
                                obj_response.primary[0]['data'][0]['fields'][ f ]['data'] = all_data[ f ];
                            }
                        }
                        callback( obj_response );

                    }

                } else {

                    callback( data_response );

                }
            }
        };

        /**
         * Get elements from the REST api by URLs.
         *
         * @param urls {String|Array}       Single URL or an array of URLs.
         * @param callback {Function}       A callback function.
         * @param depth {Number}            The depth of the query.
         *
         * @public
         */

        this.getByURL = function(urls, callback, depth) {
            if (!(urls instanceof Array))
                urls = [urls];
            _manager.doGET(urls, callback, depth);
        };

        /**
         * Delete an element by URL
         *
         * @param url {String}              A URL
         * @param callback {Function}       A callback function.
         *
         * @public
         */
        this.delete = function(url, callback) {
            _manager.doDELETE(url, callback);
        };

        /**
         * Update or create an element.
         *
         * @param url {String}          A URL
         * @param data {Object}         A data object
         * @param callback {Function}       A callback function.
         *
         * @public
         */
        this.set =  function(url, data, callback) {
            _manager.doPOST(url, data, callback);
        };

        /**
         * Parse search specifier and create urls and depth parameter.
         *
         * @param specifier {Array|Object}
         *
         * @returns {{urls: Array, depth: Number}} urls and depth parameter
         *          from specifier.
         *
         * @private
         */
        function _parseSpecifier(specifier) {

            var result = {urls: [], depth: 0};

            if (!(specifier instanceof Array)) {
                specifier = [specifier];
            }

            for (var i = 0; i < specifier.length; i++) {

                var spec = specifier[i] ,
                    category ,
                    type ,
                    id;

                // check for depth parameter and remove it
                spec.depth = _normalizeParam(spec.depth);
                if (spec.depth[0] > 0 && result.depth === 0) {
                    result.depth = parseInt(spec.depth[0]);
                }
                delete spec.depth;

                // ensure type and check for id
                if (spec.id) {
                    spec.id = _normalizeParam(spec.id);
                    var part = strings.segmentId(spec.id[0].toString());
                    id = part.id;
                    type = part.type || spec.type;
                    category = part.category || model_helpers.category(type);
                } else {
                    spec.type = _normalizeParam(spec.type);
                    type = spec.type[0];
                    category = model_helpers.category(type);
                }

                if (!type) {
                    throw "Unable to infer a type from search specifiers: " + JSON.stringify(specifier);
                }

                // remove category, type and id from specifiers
                delete spec.id;
                delete spec.type;
                delete spec.category;

                var baseURLs = [strings.makeBaseURL(category, type, id)];

                if (!id) {
                    for (var key in spec) {
                        if (spec.hasOwnProperty(key)) {
                            var par = _normalizeParam(spec[key]) ,
                                val = par[0] ,
                                op  = par[1];

                            if (key === 'parent') {
                                baseURLs = _parentToURL(baseURLs, type, op, val);
                            } else {
                                baseURLs = _paramToURL(baseURLs, type, key, op, val);
                            }
                        }
                    }
                }

                result.urls = result.urls.concat(baseURLs);
            }

            return result;
        }

        /**
         * A parameter from a search specifier can either be a single value, an array
         * with only one element ([value]) or an array containing a value and a operator
         * ([value, op]).
         * This function ensures that a parameter is always represented as array that contains
         * a value and an operator.
         *
         * @param param {String|Array}      A parameter from a search specifier.
         * @returns {Array}                 An array ([value, op]}
         *
         * @private
         */
        function _normalizeParam(param) {

            if (!(param instanceof Array)) {
                param = [param];
            }
            if (param.length === 1) {
                param[1] = '=';
            }

            return param;
        }

        /**
         * Modifies the given urls and adds a query parameter that searches for a specific
         * parent.
         *
         * @param urls {Array}      Array of URLs.
         * @param type {String}     The type of the object to search for.
         * @param val {String}      The id of the parent object.
         *
         * @returns {Array} Array of modified URLs
         *
         * @private
         */
        function _parentToURL(urls, type, op, val) {

            var newurls = [],
                component ,
                parents = model_helpers.parents(type);

            for (var pname in parents) {
                if (parents.hasOwnProperty(pname)) {
                    if (val) {
                        var id = strings.urlToID(val);
                        if (op === '!=') {
                            component = 'n__' + encodeURIComponent(pname) + '=' + encodeURIComponent(id) + '&';
                        } else {
                            component = encodeURIComponent(pname) + '=' + encodeURIComponent(id) + '&';
                        }
                    } else {
                        component = encodeURIComponent(pname) + '__isnull=1&'
                    }
                }
                for (var i = 0; i < urls.length; i++) {
                    newurls.push(urls[i] + component);
                }
            }

            return newurls;
        }

        /**
         * Modifies the given URLs and adds query parameter according to the requested
         * type, key, operator and value.
         *
         * @param urls {Array}      Array of URLs.
         * @param type {String}     The type of the object to search for.
         * @param key {String}      The key of the search parameter.
         * @param op {String}       The operator of the search parameter.
         * @param val {String}      The value.
         *
         * @returns {Array} Array of modified URLs.
         *
         * @private
         */
        function _paramToURL(urls, type, key, op, val) {

            var operator,
                component = '',
                fields = model_helpers.fields(type);

            switch (key) {
                case 'safety_level':
                    var safety_level = parseInt(val);
                    if (!safety_level > 0) {
                        safety_level = SAFETY_LEVEL[val] || 3;
                    }
                    if (op === '!=') {
                        component = 'n__safety_level=' + safety_level + '&';
                    } else {
                        component = 'safety_level=' + safety_level + '&';
                    }
                    break;
                case 'owner':
                    if (val) {
                        if (op === '!=') {
                            component = 'n__owner=' + encodeURIComponent(val) + '&';
                        } else {
                            component = 'owner=' + encodeURIComponent(val) + '&';
                        }
                    } else {
                        component = 'owner__isnull=1&';
                    }
                    break;
                default:
                    if (fields[key]) {
                        var t = fields[key]['type'];
                        if ((op === '=' || op === '!=') && (t === 'int' || t === 'num' || t === 'date')) {
                            operator = '='
                        } else if (op === '!='){
                            operator = '__icontains=';
                        } else {
                            operator = OPERATOR[op] || '__icontains=';
                        }
                    } else {
                        operator = OPERATOR[op] || '__icontains=';
                    }
                    if (op === '!=') {
                        component = 'n__' + encodeURIComponent(key) + operator + encodeURIComponent(val) + '&';
                    } else {
                        component = encodeURIComponent(key) + operator + encodeURIComponent(val) + '&';
                    }
            }

            for (var i = 0; i < urls.length; i++) {
                urls[i] = urls[i] + component;
            }

            return urls;
        }

    } // End NetworkResource

    /**
     * Constructor for the class RequestManager.
     *
     * @constructor
     * @private
     */
    function RequestManager() {

        var _cache      = new Cache();

        /**
         * Performs a single post request.
         *
         * @param url {String}      The url for the request
         * @param data {Object}     The request data.
         * @param callback {Function} Callback that gets the result back.
         *
         * @public
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
         * @param urls {Array}          An array of urls to request.
         * @param callback {Function}   Callback that is invoked when done.
         * @param [depth] {Number}      The depth to which children should be fetched as secondary
         *                              results.
         * @param [nocache] {Boolean}   Set this to true in order to prevent caching.
         *
         * @public
         */
        this.doGET = function(urls, callback, depth, nocache) {

            var primary = [] ,
                secondary = [] ,
                currDepth = depth || 0 ,
                error = false;

            // perform GET for all urls and let the results be collected
            // by collectPrimary
            _doMultiGET(urls, collectPrimary, nocache);

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
                    } else {
                        callback({primary: primary, secondary: secondary});
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
                    } else {
                        callback({primary: primary, secondary: secondary});
                    }
                }
            }

        };

        /**
         * Requests array-type data from the server by URL.
         *
         * @param url        {String}       The data-url for the request. May contain GET params.
         *                                  Should be like "http://<host>/datafiles/2353/?start_index=198
         * @param callback   {Function}
         * @param field_name {String}       A name of the field of an object, holding this data.
         *
         * @public
         */
        this.doGETDATA = function(url, callback, field_name) {

            var xhr = new XMLHttpRequest();
            var obj_url = url; // add format parameter

            if (!(obj_url.search('\\?') > -1)) {
                obj_url += '?';
            }

            if (!(strings.endsWith(obj_url, '?')) && !(strings.endsWith(obj_url, '&'))) {
                obj_url += '&';
            }

            obj_url += encodeURIComponent('format') + '=' + encodeURIComponent('json')

            xhr.onreadystatechange = collect;
            xhr.open('GET', obj_url);
            xhr.setRequestHeader('If-None-Match', 'ed2876adff987613414abcged091875621823760');
            xhr.send(null);

            function collect() {
                if (xhr.readyState === 4) {

                    var response = _buildResponse(xhr, url, 'GET');
                    response['field_name'] = field_name; // proxy field name

                    callback({primary: [response], secondary: []});
                }
            }
        };

        /**
         * Performs a single DELETE request.
         *
         * @param url {String}      The url for the request
         * @param callback {Function} Callback that gets the result back.
         *
         * @public
         */
        this.doDELETE = function(url, callback) {

            var xhr = new XMLHttpRequest();

            url = strings.urlOmitHost(url);

            xhr.onreadystatechange = collect;
            xhr.open('DELETE', url);
            xhr.send(null);

            // collect the result and call callback function
            function collect() {
                if (xhr.readyState === 4) {

                    var response = _buildResponse(xhr, url, 'DELETE');

                    // store response and notify callback when all requests are done
                    callback({primary: [response], secondary: []});
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

                    selected = responses[i].data;

                    for (var j = 0; j < selected.length; j++) {
                        element = selected[j];
                        type = (type = element['model'].split('.'))[type.length - 1];

                        childfields = model_helpers.children(type);

                        for (var k in childfields) {
                            if (childfields.hasOwnProperty(k) && childfields[k].type !== type) {
                                children = element['fields'][k];
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
         * @param urls {Array}          An array of urls to request.
         * @param callback {Function}   Callback that is invoked when ready.
         * @param [nocache] {Boolean}   Set this to true in order to prevent caching.
         *
         * @private
         */
        function _doMultiGET(urls, callback, nocache) {

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
                if (tag && !nocache) {
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
         *     type: {Number},
         *     message: {String},
         * }
         *
         * @param xhr {XMLHttpRequest} Request object with ready state == 4.
         * @param url {String} The url of the request.
         * @param type {String} Either "GET" or "POST" (optional: default "GET").
         *
         * @returns {Object} A response object.
         *
         * @private
         */
        function _buildResponse(xhr, url, type) {

            var contentType = xhr.getResponseHeader('Content-Type') ,
                etag        = xhr.getResponseHeader('ETag') ,
                content     = xhr.responseText;

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
            if (response.status === 200 || response.status === 201) {
                // all OK

                if (contentType === 'application/json') {
                    content = JSON.parse(content);

                    if (url.search( '/data/' ) > -1) {
                        response.message = 'data fetched';
                        response.data    = content;
                        response.range   = [0, 0];

                    } else if (url.search( '/acl/' ) > -1) {
                        response.message = 'ACL processed';
                        response.acl    = {
                            "safety_level": content.safety_level,
                            "shared_with": content.shared_with
                        };
                        response.range   = [0, 0];

                    } else {

                        if (etag !== null) {
                            _cache.store(url, etag, content);
                        }
                        response.message = content['message'];
                        response.data    = content['selected'] || [];
                        response.range   = content['selected_range'] || [0, 0];
                    }

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
                    response.message = content['message'];
                    response.data    = content['selected'] || [];
                    response.range   = content['selected_range'] || [0, 0];
                }

            } else if (response.status >= 400 && response.status < 500) {
                // client errors

                response.error = true;
                if (contentType === 'application/json') {
                    content = JSON.parse(content);
                    response.message = content['message'];
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
     * @constructor @private
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
         *
         * @public
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
         *
         * @returns {String|undefined} The found etag or undefined if not found.
         *
         * @public
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
         *
         * @public
         */
        this.store = function(url, etag, content) {

            if (url && etag && content) {
                _lru[url] = {etag: etag, content: content, time: (new Date()).valueOf(), url: url};
            }

        };

        /**
         * Remove least recently used content from the cache if the maximum size
         * was reached.
         *
         * @public
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

    return NetworkResource;
});
