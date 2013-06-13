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
            _worker                             ,
            _curr_user                          ,
            _all_users;

        if (Worker && !env.debug) {
            _worker = new Worker('/site_media/static/load-worker.js');
            _worker.onmessage = _workerHandler;
        }

        /**
         * Get data from the api via search specifiers.
         *
         * @param event {String}            The event under which the response will be published.
         * @param specifier {Object|Array}  Search specifiers.
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.get = function(event, specifier, info) {

            if (_worker) {
                var message = {
                    action:     'get' ,
                    event:      event ,
                    specifier:  specifier ,
                    info:       info
                };

                _worker.postMessage(message);
            } else {
                _resource.get(specifier, handler);
            }

            // callback
            function handler(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'get';
                result.info   = info;

                _bus.publish(event, result);
            }
        };

        /**
         * Requests data (slice) from the REST api for a certain object. Returns always array(s)
         *  in pure SI-units.
         *
         * @param event {String}        A name of the event to publish in the bus.
         * @param url {String}          An url of an object to fetch the data (like /neo/eventarray/13/)
         * @param [params] {Object}     Object that looks like:
         *                                  {"max_points": <Number>, "start": <Number>,"end": <Number>}
         * @param [info] {*}            Some additional information that will be included in the
         *                              response.
         *
         * @public
         */
        this.getData = function(event, url, params, info) {

            if (_worker) {
                var message = {
                    action:     'get_data' ,
                    event:      event ,
                    url:        url,
                    info:       info,
                    params:     params
                };

                _worker.postMessage(message);
            } else {
                _resource.getData(url, handler, params);
            }

            // callback
            function handler(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'get_data';
                result.info   = info;

                _bus.publish(event, result);
            }
        };

        /**
         * Get data from the api via urls.
         *
         * @param event {String}            The event under which the response will be published.
         * @param urls  {String|Array}      The URLs to request.
         * @param depth {Number}            The depth of the request.
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.getByURL = function(event, urls, depth, info) {

            if (_worker) {
                var message = {
                    action:     'get_by_url' ,
                    event:      event ,
                    urls:       urls ,
                    depth:      depth ,
                    info:       info
                };

                _worker.postMessage(message);
            } else {
                _resource.getByURL(urls, handler, depth);
            }

            // callback
            function handler(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'get';
                result.info   = info;

                _bus.publish(event, result);
            }
        };

        /**
         * Update or create objects.
         *
         * @param event {String}            The event under which the response will be published.
         * @param data {Object}             The data of the element to update or create.
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.set = function(event, data, info) {

            if (_worker) {
                var message = {
                    action:     'set' ,
                    event:      event ,
                    data:       data ,
                    info:       info
                };

                _worker.postMessage(message);
            } else {
                var request = _adapter.adaptFromApplication(data);
                _resource.set(request.url, request.data, handler);
            }

            function handler(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'set';
                result.info   = info;

                _bus.publish(event, result);
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
         * @param event {String}            The event under which the response will be published.
         * @param url {String}              The URL of the object to delete.
         * @param [info] {*}                Some additional information that will be included in the
         *                                  response.
         *
         * @public
         */
        this.del = function(event, url, info) {

            if (_worker) {
                var message = {
                    action:     'del' ,
                    url:        url ,
                    event:      event ,
                    info:       info
                };

                _worker.postMessage(message);
            } else {
                _resource.delete(url, handler);
            }

            function handler(response) {
                var result = _adapter.adaptFromResource(response);

                result.action = 'del';
                result.info   = info;

                _bus.publish(event, result);
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
                        u_nice = {name: null, id: null, permalink: null};
                    u_nice.name  = objects.deepGet(u_ugly, 'username');
                    u_nice.permalink = objects.deepGet(u_ugly, 'permalink');
                    u_nice.id = strings.urlToID(u_nice['permalink']);
                    _all_users[i] = u_nice;
                }

            }

            return _all_users;
        };

        /**
         * Handles responses from the worker
         *
         * @param msg {Object} The message from the worker.
         *
         * @private
         */
        function _workerHandler(msg) {

            // unwrap message
            var result  = msg.data ,
                event   = msg.data.event;

            if (event === 'debug') {
                console.log("WORKER DEBUG\n" + JSON.stringify(result.data, null, 2));
            } else {
                _bus.publish(event, result);
            }
        }

    }

    return DataAPI;
});
