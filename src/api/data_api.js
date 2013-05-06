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

                if (typeof(event) === 'function') {
                    event(result);
                } else {
                    _bus.publish(event, result);
                }
            }
        };

        this.getByURL = function(event, urls, depth, info) {

            if (_worker) {
                var message = {
                    action:     'get_by_url' ,
                    event:      event ,
                    ulrs:       urls ,
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

                if (typeof(event) === 'function') {
                    event(result);
                } else {
                    _bus.publish(event, result);
                }
            }
        };

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

                if (typeof(event) === 'function') {
                    event(result);
                } else {
                    _bus.publish(event, result);
                }
            }

        };

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

                if (typeof(event) === 'function') {
                    event(result);
                } else {
                    _bus.publish(event, result);
                }
            }
        };

        function _workerHandler(msg) {

            // unwrap message
            var result  = msg.data ,
                event   = msg.data.event;

            if (typeof(event) === 'function') {
                event(result); // TODO needs to be tested
            } else {
                _bus.publish(event, result);
            }
        }

    }

    return DataAPI;
});
