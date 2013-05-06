//--------- file: data_api.js ---------//

/*
 * Defines the class DataAPI.
 */
define(['env', 'api/bus', 'api/resource_adapter', 'api/network_resource'],
    function (env, Bus, ResourceAdapter, NetworkResource) {
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
            _worker;

        if (Worker) {
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
