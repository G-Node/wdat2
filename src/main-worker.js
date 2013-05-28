//--------- main-worker.js ---------//

define(['api/resource_adapter', 'api/network_resource', 'api/model_helpers'],
    function (ResourceAdapter, NetworkResource, model_helpers) {

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
            case 'get_data':
                getData(message.event, message.url);
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

    function getData(event, url) {

        // an url is a url to fetch single plottable object
        // with slicing / downsampling parameters
        _resource.getByURL([url], main_handler, 0);

        // callback that will parse the response object and fetch
        // data from permalinks in data-fields
        function main_handler(response) {
            var all_data = []; // resulting array of all data-fields
            var result = _adapter.adaptFromResource(response);
            var obj = result.primary[0];

            if (!obj['plotable']) {
                throw "Requested object is not plotable, data can't be fetched.";
            }

            // iterate over all data fields and fetch arrays
            var links = []; // links to the datafiles with arrays
            for (var field_name in obj['data']) {
                if (obj['data'].hasOwnProperty(field_name)) {
                    // permalink http:// is the criteria.. ?
                    if (field_name['data'].toString().search( 'http://' ) > -1) {
                        links.push( field_name['data'] );
                    }

                }
            }

            // fetch real [sliced] [downsampled] array-data
            for (var i = 0; i < links.length; i++) {
                _resource.getData( links[i], collect);
            }

            // closure that collects results and
            // invokes callback when ready.
            function collect( data ) {
                all_data.push( data );
                if (all_data.length === links.length) {
                    result.action = 'get_data';
                    result.event  = event;
                    result.data  = all_data;

                    postMessage(result);
                }
            }
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
