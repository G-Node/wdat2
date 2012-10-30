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
    };

    // Create an initialization message
    var init = {
      'resource' : resource,
      'adapter'  : adapter,
      'action'   : 'init',
      'event'    : 'init-event'
    }; 

    // Send the initialization message to the worker thread
    w.postMessage( JSON.stringify(init) );

    // Handle messages success returned from the worker
    w.onmessage = messageHandler; 

    // TODO
    w.onerror = undefined; 
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
  var proto = WDAT.api.data.DataAPI.prototype;

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
    if (this._worker) {
      // Compose the message
      var message = {
        'event'     : event,
        'action'    : 'get',
        'specifier' : specifier
      }

      // Post the message to the worker thread.
      this._worker.postMessage(message);
    }
    // XXX Non-worker environment
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


