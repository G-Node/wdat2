//--------- main-worker.js ---------//

define(['api/resource_adapter', 'api/network_resource'], function (ResourceAdapter, NetworkResource) {

    var _resource, _adapter;

    function init() {

        _resource   = new NetworkResource();
        _adapter    = new ResourceAdapter();

        onmessage = main;

    }

    function main(msg) {

        /** @type {{ action: *, event: *, specifier: *, urls: *, url: *, info: *, depth: *, data: *}} */
        var message = msg.data;

        switch(message.action) {
            case 'get':
                get(message.event, message.specifier, message.info);
                break;
            case 'get_by_url':
                getByURL(message.event, message.urls, message.depth, message.info);
                break;
            case 'set':
                set(message.event, message.data, message.info);
                break;
            case 'del':
                del(message.event, message.url, message.info);
                break;
            default:
                log(message);
        }
    }

    function get(event, specifier, info) {

        _resource.get(specifier, handler);

        // callback
        function handler(response) {
            var result = _adapter.adaptFromResource(response);

            result.action = 'get';
            result.info   = info;
            result.event  = event;

            postMessage(result);
        }
    }

    function getByURL(event, urls, depth, info) {

        _resource.getByURL(urls, handler, depth);

        // callback
        function handler(response) {
            var result = _adapter.adaptFromResource(response);

            result.action = 'get';
            result.info   = info;
            result.event  = event;

            postMessage(result);
        }
    }

    function set(event, data, info) {

        var request = _adapter.adaptFromApplication(data);
        _resource.set(request.url, request.data, handler);

        function handler(response) {
            var result = _adapter.adaptFromResource(response);

            result.action = 'set';
            result.info   = info;
            result.event  = event;

            postMessage(result);
        }

    }

    function del(event, url, info) {

        _resource.delete(url, handler);

        function handler(response) {
            var result = _adapter.adaptFromResource(response);

            result.action = 'del';
            result.info   = info;
            result.event  = event;

            postMessage(result);
        }
    }

    function log(data) {
        postMessage({event: 'debug', data: data, action: 'log'});
    }

    return init;
});
