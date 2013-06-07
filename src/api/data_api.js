//--------- file: data_api.js ---------//

/*
 * Defines the class DataAPI.
 */
define(['env', 'util/strings', 'util/objects', 'api/bus', 'api/resource_adapter', 'api/network_resource'],
    function (env, strings, objects, Bus, ResourceAdapter, NetworkResource) {
    "use strict";

    /**
     * Constructor for the class DataAPI
     *
     * @param bus {Bus} A message bus.
     *
     * @constructor
     * @public
     */
    function DataAPI(bus) {

        var _bus        = bus ,
            _resource   = new NetworkResource() ,
            _adapter    = new ResourceAdapter() ,
            _worker, _callback_cache, _curr_user, _all_users;

        this._init = function() {
            _callback_cache = {};
            if (Worker && !env.debug) {
                _worker = new Worker('/site_media/static/load-worker.js');
                _worker.onmessage = this._workerHandler();
            }
        };

        /**
         * Get data from the api via search specifiers.
         *
         * @param callback {String|Function} The callback under which the response will be published.
         * @param specifier {Object|Array}   Search specifiers.
         * @param [info] {*}                 Some additional information that will be included in the
         *                                   response.
         *
         * @public
         */
        this.get = function(callback, specifier, info) {

            if (_worker) {
                var message = {
                    action:     'get' ,
                    event:      callback ,
                    specifier:  specifier ,
                    info:       info
                };

                this._notifyWorker(message);
            } else {
                _resource.get(specifier, this._localHandler(callback, 'get', info));
            }
        };

        /**
         * Requests data (slice) from the REST api for a certain object. Returns always array(s)
         *  in pure SI-units.
         *
         * @param callback {String|Function} The callback under which the response will be published.
         * @param url {String}               An url of an object to fetch the data (like /neo/eventarray/13/)
         * @param [params] {Object}          Object of the form
         *                                   {"max_points": <Number>, "start": <Number>,"end": <Number>}
         * @param [info] {*}                 Some additional information that will be included in the
         *                                   response.
         *
         * @public
         */
        this.getData = function(callback, url, params, info) {

            if (_worker) {
                var message = {
                    action:     'get_data' ,
                    event:      callback ,
                    url:        url,
                    info:       info,
                    params:     params
                };

                this._notifyWorker(message);
            } else {
                _resource.getData(url, this._localHandler(callback, 'get_data', info), params);
            }

        };

        /**
         * Get data from the api via urls.
         *
         * @param callback {String|Function} The callback under which the response will be published.
         * @param urls  {String|Array}      The URLs to request.
         * @param depth {Number}            The depth of the request.
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.getByURL = function(callback, urls, depth, info) {

            if (_worker) {
                var message = {
                    action:     'get_by_url' ,
                    event:      callback ,
                    urls:       urls ,
                    depth:      depth ,
                    info:       info
                };

                this._notifyWorker(message);
            } else {
                _resource.getByURL(urls, this._localHandler(callback, 'get_by_url', info), depth);
            }

        };

        /**
         * Update or create objects.
         *
         * @param callback {String|Function} The callback under which the response will be published.
         * @param data {Object}              The data of the element to update or create.
         * @param [info] {*}                 Some additional information that will be included in the
         *                                   response.
         *
         * @public
         */
        this.set = function(callback, data, info) {

            if (_worker) {
                var message = {
                    action:     'set' ,
                    event:      callback ,
                    data:       data ,
                    info:       info
                };

                this._notifyWorker(message);
            } else {
                var request = _adapter.adaptFromApplication(data);
                _resource.set(request.url, request.data, this._localHandler(callback, 'set', info));
            }

        };

        /**
         * Update ACL for a certain object.
         *
         * @param event {String}            The event under which the response will be published.
         * @param data {Object}             The ACL data with object ID. Can look like
         *                              data = {
         *                                  "id": "/metadata/section/39487",
         *                                  "safety_level": 3,
         *                                  "shared_with": {
         *                                      "bob": 1, "anita": 2
         *                                  }
         *                              }
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.setACL = function(event, data, info) {

            if (_worker) {
                var message = {
                    action:     'set_acl' ,
                    event:      event ,
                    data:       data ,
                    info:       info
                };

                _worker.postMessage(message);
            } else {
                var request = _adapter.adaptFromACL(data);
                _resource.set(request.url, request.data, handler);
            }

            function handler(response) {
                response.action = 'set_acl';
                response.info   = info;

                _bus.publish(event, response);
            }

        };

        /**
         * Delete an object.
         *
         * @param callback {String|Function} The callback under which the response will be published.
         * @param url {String}               The URL of the object to delete.
         * @param [info] {*}                 Some additional information that will be included in the
         *                                   response.
         *
         * @public
         */
        this.del = function(callback, url, info) {

            if (_worker) {
                var message = {
                    action:     'del' ,
                    url:        url ,
                    event:      callback ,
                    info:       info
                };

                this._notifyWorker(message);
            } else {
                _resource.delete(url, this._localHandler(callback, 'del', info));
            }

        };

        /**
         * Returns the current user.
         *
         * @returns {Object} The current user
         * @public
         */
        this.currentUser = function() {
            if (!_curr_user) {
                this.allUsers();
            }
            return _curr_user;
        };

        /**
         * Fetches current user / all users, saves in local variables.
         *
         * @returns {Array} Array with all users.
         * @public
         */
        this.allUsers = function() {
            if (!_all_users) {
                var xhr = new XMLHttpRequest(),
                    url = '/user/',
                    contentType, content;

                xhr.open('GET', url, false);
                xhr.send(null);

                contentType = xhr.getResponseHeader('Content-Type');
                if (contentType !== 'application/json') {
                    throw "Severe Error: wrong content type or no content ("+xhr.status+")";
                }

                content = JSON.parse(xhr.responseText);
                if (xhr.status !== 200) {
                    throw "Severe Error: "+ content.message +" ("+xhr.status+")";
                }

                // update current user
                _curr_user = content['logged_in_as'];
                _curr_user['id'] = strings.urlToID(_curr_user['permalink']);

                // update user list
                _all_users = [];
                for (var i = 0; i < content['selected'].length; i++) {
                    var u_ugly = content['selected'][i],
                        u_nice = {username: null, id: null, permalink: null};
                    u_nice.username  = objects.deepGet(u_ugly, 'username');
                    u_nice.permalink = objects.deepGet(u_ugly, 'permalink');
                    u_nice.id = strings.urlToID(u_nice['permalink']);
                    _all_users[i] = u_nice;
                }

            }

            return _all_users;
        };


        /**
         * Send a message to the worker.
         *
         * @param message {{action: *, event: *, info: *}} The message object.
         *
         * @private
         */
        this._notifyWorker = function(message) {
            if (message.action && message.event) {

                if (typeof(message.event) === 'function') {
                    var callback_id = 'callback_' + _bus.uid();
                    _callback_cache[callback_id] = message.event;
                    message.event = callback_id;
                }

                _worker.postMessage(message);
            }
        };

        /**
         * Returns a handler function that processes messages from the
         * worker.
         *
         * @returns {Function} The handler function.
         * @private
         */
        this._workerHandler = function() {
            return function(msg) {
                // unwrap message
                var result  = msg.data ,
                    event   = msg.data.event;

                if (event === 'debug') {
                    console.log("WORKER DEBUG\n" + JSON.stringify(result.data, null, 2));
                } else {
                    if (_callback_cache.hasOwnProperty(event)) {
                        var callback = _callback_cache[event];
                        delete _callback_cache[event];
                        delete msg.data.event;
                        callback(result);
                    } else {
                        _bus.publish(event, result);
                    }
                }
            };
        };

        /**
         * Returns a handler function, that processes results from the network resource.
         *
         * @param callback {String|Function}  A callback.
         * @param action {String}             The performed action.
         * @param info {*}                    Some additional information.
         *
         * @returns {Function} A handler function.
         * @private
         */
        this._localHandler = function(callback, action, info) {
            return function(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'del';
                result.info   = info;

                if (typeof(callback) === 'function') {
                    callback(result);
                } else {
                    _bus.publish(callback, result);
                }
            };
        };

        this._init();
    } // end DataAPI

    return DataAPI;
});
