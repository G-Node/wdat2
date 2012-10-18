// ---------- file: data_api.js ---------- //

// Initialize modules
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};
if (!window.WDAT.api.data) window.WDAT.api.data = {};

/* DataAPI is a interface to access a data source.
 * 
 * Parameter:
 *  - resource: NetworkResource     A class name connector to a network resource that 
 *                                  allows standardized access to data and metadata.
 *
 *  - adapter: ResourceAdapter      A data converter, that allows the conversion
 *                                  of data provided by the resource into a format
 *                                  usable for WDAT.
 *
 *  - bus: EventBus                 A bus used for event driven data access.
 *  
 * Depends On:
 *  - jQuery, WDAT.api.EventBus, WDAT.api.data.NetworkResource
 *    WDAT.api.data.ResourceAdapter
 */
WDAT.api.data.DataAPI = function(resource, adapter, bus) {
  this._resource = resource;
  this._adapter = adapter;
  this._bus = bus;
  // create a worker
  if (Worker) {    // if worker is defined in the browser
    w = new Worker('../data/data_api.js.worker');
    this._worker = w;
    // callback for messages from the worker
    var that = this;
    w.onmessage = function(msg) {
      // the original message from the worker is wrapped in a message 
      // object and contained in msg.data
      that._notifyRequest(msg.data.event, msg.data.data);
    };
    // callback for errors inside the worker
    w.onerror = function(err) {
      console.log("Error at " + err.filename + ": "
                  + err.lineno + ": " + err.message  + ".");  
    };
  } else {         // if not defined set to false 
    this._worker = false;
  }
};

// define methods of DataAPI
(function() {
  
  /*
   * 
   */
  WDAT.api.data.DataAPI.prototype.get = function(event, type, searchparam) {
    if (this._worker) { // if Worker is available just notify it
      this._notifyWorker(event, 'get', type, searchparam);
    } else { // if Worker is not available we have to do this here 
      var result = this._resource.get(type, searchparam);
      result = this._adapter.adapt(result);
      this._notifyRequest(event, result);
    }
  };
  
  /*
   * 
   */
  WDAT.api.data.DataAPI.prototype.test = function(event) {
    if (this._worker) { // if Worker is available just notify it
      this._notifyWorker(event, 'test');
    } else { // if Worker is not available we have to do this here 
      this._notifyRequest(event, 'Worker are not available in your browser!');
    }
  };
  
  /* Notifies the worker.
   * 
   * Wraps parameter in one object:
   * {
   *    event: <event>,   // the event that recieves the result
   *    action: <action>, // 'get', 'update', 'delete', 'save' or 'test'
   *    type: <type>,     // 'analogsignal', 'section' etc.
   *    data: <data>      // data like search parameter or data of the object to save
   * }
   */
  WDAT.api.data.DataAPI.prototype._notifyWorker = function(event, action, type, data) {
    var worker_msg = {};
    worker_msg['event'] = event;
    worker_msg['action'] = action;
    worker_msg['type'] = type;
    worker_msg['data'] = data;
    this._worker.postMessage(worker_msg);
  };
  
  /* Publish an event with event data to the message bus.
   * 
   */
  WDAT.api.data.DataAPI.prototype._notifyRequest = function(event, data) {
    this._bus.publish(event, data);
  };
  
}());