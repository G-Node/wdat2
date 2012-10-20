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
  var _js_directory = '../../src/api/data/';

  // Create the worker if defined in the browser
  if (Worker) {
    w = new Worker(_js_directory + 'data_api.worker.js');
    this._worker = w;

    // Create an initialization message
    var init = {
      'resource' : resource,
      'adapter'  : adapter,
      'action'   : 'init',
      'event'    : 'init-event'
    }, 
        that = this; // reference to the current object

    // Send the initialization message to the worker thread
    w.postMessage(init);

    // Handle messages returned from the worker
    w.onmessage = that.messageHandler;

    // Handle error messages from the worker
    w.onerror = that.errorHandler;
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
    , all_types = metadata_types.concat(plotdata_types, container_types);

  /* Parse a specifier object and return a specifier object with a URL built
   * up.  A URL is all that is, infact required to make a request.  There is no
   * POST data.
   */
  proto.parseSpecifier = function (specifier) {
    // Use window.location to create general URL skeleton
    var loc = window.location
      , url = loc.protocol + '//' + loc.host + '/electrophysiology/';

    // If 'type' specified
    if ( specifier.hasOwnProperty('type') ) {
      if ( metadata_types.indexOf(specifier.type) != -1) {
        // A metadata type has been specified
        url = url + 'metadata/' + specifier.type;
      }
    }

    return url;
  };

  /* Sends out a request to either the worker thread or using the
   * NetworkResource object to fetch the object.  The object is then converted
   * suitably by the worker thread itself or in its absence, by this function
   * itself into an adapted object.
   *
   * Returns:  nothing
   *
   * SideEffect:  When the object has been downloaded and adapted, the event is
   * published.  The object is appended to the list.
   */
  proto.get = function (event, specifier) {
    // event     : event to publish when data has been adapted.  
    // specifier : an object specifying which objects to fetch.
  };

})();


