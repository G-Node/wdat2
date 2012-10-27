// ---------- file: data_api.js ---------- //

// Initialize modules
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};
if (!window.WDAT.api.data) window.WDAT.api.data = {};

/* DataAPI is a interface to access a data source.
 * 
 * Parameter:
 *  - resource: String  
 *      Class name of a network resource, the constructor must be 
 *      defined in the file 'network_resource.js' and has to be in the
 *      module WDAT.api.data. 
 *
 *  - adapter: String           
 *      Class name for a resource adapter, the constructor must be 
 *      defined in the file 'resource_adapter.js' and has to be in the
 *      module WDAT.api.data. 
 *
 *  - bus: EventBus             
 *      A bus used for event driven data access.
 *  
 * Depends On:
 *  - jQuery, WDAT.api.EventBus and the used resource and adapter class.
 */

WDAT.api.data.DataAPI = function(resource, adapter, bus) {
  this._bus = bus;

  // Suffix the javascript file name to this address
  var _js_directory = '../../src/api/data/',
      that = this; // reference to the current object

  // Create the worker if defined in the browser
  if (Worker) {
    w = new Worker(_js_directory + 'data_api.worker.js?no=cache' + Math.random());
    this._worker = w;

    var messageHandler = function (event) {
      // Since there is a wrapping event object
      var message = event.data;

      if (message.status === 200) {
        // Call the publish event on the DataAPI._bus object
        that._bus.publish(message.event, message.data);
      }
    }

    // Create an initialization message
    var init = {
      'resource' : resource,
      'adapter'  : adapter,
      'action'   : 'init',
      'event'    : 'init-event'
    }; 

    // Send the initialization message to the worker thread
    w.postMessage( JSON.stringify(init) );

    // Handle messages success and failure returned from the worker
    w.onmessage = w.onerror = messageHandler; 
  } else {
    // The browser doesn't support Workers, gracefully fallback to single
    // thread operations. TODO
    this._worker = false;

    // Instantiate resource and adapters from class names
    this._resource = WDAT.api.data[resource]();
    this._adapter  = WDAT.api.data[adapter]();
  }
};

// DataAPI methods
(function() {
  // Convenient reference to the prototype
  var proto = WDAT.api.data.DataAPI.prototype
    // Define NEO types
    , metadata_types  = ['section', 'property', 'value']
    , plotdata_types  = ['analogsignal', 'irsaanalogsignal', 'spike', 
                         'spiketrain', 'event' ,'epoch']
    , container_types = ['block', 'segment', 'eventarray', 'epocharray',
                         'analogsignalarray', 'unit', 'recordingchannel',
                         'recordingchannelgroup']
    // A set of all types
    , all_types = metadata_types.concat(plotdata_types, container_types)
    , mapping = {
        'property': 'properties',
        'section': 'sections',
        'value': 'values'
      };

  /* Builds a query string of a javscript object.  Works non-recursively and
   * only on string type objects. */
  var serializeToQueryString = function (dictionary) {
    var str = [];
    
    for(var p in dictionary) {
       str.push(encodeURIComponent(p) + "=" + encodeURIComponent(dictionary[p]));
    }
    return str.join("&");
  };

  /* Removes the object, type and parent attributes from a specifer and return
   * the result.
   */
  var clean = function (specifier) {
    var rtn = {}
      , filter_re = /(object|parent|type)/;
    
    for (name in specifier) {
      if ( !filter_re.test(name) ) {
        rtn[name] = specifier[name];
      }
    }

    return rtn;
  };
    

  /* This is the workhorse function in the data-api.  Would it make more sense
   * to push this to the woker thread?
   *
   * Parse a specifier object and return a specifier object with a URL built
   * up.  A URL is all that is, infact required to make a request.  There is no
   * POST data.
   */
  proto.parseSpecifier = function (specifier) {
    // Use window.location to create general URL skeleton
    var loc = window.location
      , url = loc.protocol + '//' + loc.host + '/electrophysiology/';

    // First, complete the specifier: with explicit inferred attributes
    if ( !specifier.hasOwnProperty('type') ) {
      // Well, the type attribute is necessary
      if ( specifier.hasOwnProperty('object') ) {
        // Infer type from object string
        var splits = specifier.object.split('_');

        if (splits.length > 1) {
          specifier.type = splits[0];
        }
      }
    }

    // Handle url generation for object requests
    if ( specifier.hasOwnProperty('object') ) {
      if ( plotdata_types.indexOf(specifier.type) > -1 ) {
        // Plottable object requests.  These are the only ones that need to be
        // handled for object requests.
        var id = specifier.object.split('_')[1]
          , query_string = serializeToQueryString( clean(specifier) );


        // Also respect the id of the object being requested
        url += specifier.type + '/' + id + '?' + query_string; 

        return url;
      }
    }

    // Handle url generation for children requests
    if ( specifier.type === 'children' ) {
      var parent_type = specifier.parent.split('_')[0];

      if ( container_types.indexOf(parent_type) > -1 ) {
        // A list of all container children has been requested.
        // TODO.  Discuss and figure out.
      }
    }

    return 'mock-url';
  };

  /* Requests for the data based on the __SPECIFIER__, adapts the data and
   * raises *event* when complete passing on the adapted object as a parameter.
   *
   * Returns:  nothing
   *
   * SideEffect:  When the object has been downloaded and adapted, the event is
   * published.  The object is appended to the list.
   */
  proto.get = function (event, specifier) {
    // event     : event to publish when data has been adapted.  
    // specifier : an object specifying which objects to fetch.
    var url = this.parseSpecifier(specifier);

    this.getByURL(event, url);
  };


  /* Requests for the data based on the __URL__, adapts the data and raises
   * *event* when complete passing on the adapted object as a parameter.
   *
   * Returns:  nothing
   *
   * SideEffect:  When the object has been downloaded and adapted, the event is
   * published.  The object is appended to the list.
   */
  proto.getByURL = function(event, url) {
    // event : event to publish when data has been adapted.
    // url   : the url to which to send requests.
    if (this._worker) {
      // Compose the message
      var message = {
        'event' : event,
        'action': 'get',
        'url'   : url
      };

      // Post the message to the worker thread
      this._worker.postMessage(message);
    }
    // XXX Non-worker environment
  };
})();


