// ---------- file: data_api.js ---------- //

// Initialize modules
if (!WDAT) {
  var WDAT = {};
}
if (!WDAT.api) {
  WDAT.api = {};
}

//define in anonymous namespace
(function() {

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
  WDAT.api.DataAPI = DataAPI;
  function DataAPI(resource, adapter, bus) {
    // set message bus
    this._bus = bus;
    // create a worker
    if (Worker) { // if worker is defined in the browser
      w = new Worker('/site_media/static/data_api.js.worker');
      this._worker = w;
      // send worker init message
      var init = {'resource' : resource, 'adapter' : adapter, 'action' : 'init',
        'event' : 'init-event'};
      w.postMessage(init);
      // callback for messages from the worker
      var that = this;
      w.onmessage = function(msg) {
        // the original message from the worker is wrapped in a message 
        // object and contained in msg.data
        that._notifyRequest(msg.data.event, msg.data.data);
      };
      // callback for errors inside the worker
      w.onerror = function(err) {
        console.log("Error at " + err.filename + ": " + err.lineno + ": " + err.message + ".");
      };
    } else { // if not defined set to false 
      this._worker = false;
      // create resource and adapter from class names
      this._resource = new WDAT.api[resource]();
      this._adapter = new WDAT.api[adapter]();
    }
  }

  /*
   * 
   */
  DataAPI.prototype.get = function(event, searchparam) {
    if (this._worker) { // if Worker is available just notify it
      this._notifyWorker(event, 'get', searchparam);
    } else { // if Worker is not available we have to do this here 
      var result = this._resource.get(searchparam);
      result = this._adapter.adapt(result);
      this._notifyRequest(event, result);
    }
  };

  /*
   * 
   */
  DataAPI.prototype.getByURL = function(event, url) {
    if (this._worker) { // if Worker is available just notify it
      this._notifyWorker(event, 'get_by_url', url);
    } else { // if Worker is not available we have to do this here 
      var result = this._resource.getByURL(url);
      result = this._adapter.adapt(result);
      this._notifyRequest(event, result);
    }
  };

  /*
   * 
   */
  DataAPI.prototype.test = function(event) {
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
  DataAPI.prototype._notifyWorker = function(event, action, data) {
    var worker_msg = {};
    worker_msg.event = event;
    worker_msg.action = action;
    worker_msg.data = data;
    this._worker.postMessage(worker_msg);
  };

  /* Publish an event with event data to the message bus.
   * 
   */
  DataAPI.prototype._notifyRequest = function(event, data) {
    this._bus.publish(event, data);
  };

}());
