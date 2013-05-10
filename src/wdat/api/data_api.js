// ---------- file: data_api.js ---------- //

var wdat; (function(wdat) {

  /****************************************************************************************
   * Class DataAPI.
   * DataAPI is a interface to access a web data source. The basic concept of DataAPI is
   * to provide a uniform interface e.g. to a RESTfull API. To access the source the
   * DataAPI needs a NetworkResource. A ResurceAdapter is needed in order to convert data
   * from a resource specific format into a format used by the application and vice versa.
   *
   * Response: every method of the DataAPI delivers an asynchronous response by publishing
   * the data to an event that is specified by the first parameter of each method. A
   * response data object has always the following structure:
   *  {
   *    url: string,          // The url that was requested internally (debugging)
   *    status: number,       // The HTTP request status
   *    response: response,   // Array with results or Message string
   *    error: bool,          // true if an error has occurred, undefined otherwise
   *    param: object,        // All parameter from the original request
   *    action: string        // The action from the original request
   *  }
   *
   * Depends on: wdat.Bus and the used resource and adapter class.
   *
   * @returns {DataAPI}
   ***************************************************************************************/
  wdat.DataAPI = (function() {

    /**
     * Constructor for the class DataAPI.
     *
     * @param resource {string}   Class name of a network resource, the constructor must be
     *                            defined in the file 'network_resource.js' and has to be in the
     *                            module wdat.
     * @param adapter {string}    Class name for a resource adapter, the constructor must be
     *                            defined in the file 'network_resource.js' and has to be in the
     *                            module wdat.
     * @param bus {Bus}           A bus used for event driven data access.
     */
    function DataAPI(resource, adapter, bus) {
      this._bus = bus;
      // create a worker
      if (Worker) { // if worker is defined in the browser
        this._worker = new Worker('/site_media/static/data_api.js.worker');
        // send worker init message
        var init = {'resource' : resource, 'adapter' : adapter, 'action' : 'init',
                    'event' : 'init-event'};
        this._worker.postMessage(init);
        // callback for messages from the worker
        var that = this;
        this._worker.onmessage = function(msg) {
          that._bus.publish(msg.data.event, msg.data.data);
        };
        // callback for errors inside the worker
        this._worker.onerror = function(err) {
          console.log("Error in Worker at: " + err.filename + ": " + err.lineno + ": " +
                      err.message + ".");
        };
      } else { // if web workers are not available
        this._worker = false;
      }
      // create resource and adapter from class names
      this._resource = new wdat[resource]();
      this._adapter = new wdat[adapter]();
    }

    /**
     * Get get data by search specifiers.
     *
     * Supported search specifiers:
     *  - permalink:  category/type/number
     *  - id:         permalink or number
     *  - type:       'section', 'value', 'analogsignal' etc.
     *  - category:   'data' or 'metadata'
     *  - parent:     permalink or ''
     *  - name:       string
     *
     * @param event {string}      Event id for published data.
     * @param specifiers {Object} Object containing all specifiers.
     * @param info                Additional information that might be evaluated
     *                            when the request returns.
     */
    DataAPI.prototype.get = function(event, specifiers, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'get', specifiers, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.get(specifiers);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'get';
        result.param = specifiers;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Get get data by url.
     *
     * @param event {string}    Event id for published data.
     * @param url {string}      The URL to request.
     * @param info         Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.getByURL = function(event, url, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'get_by_url', url, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.getByURL(url);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'get_by_url';
        result.param = url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Update or create an object.
     *
     * @param event {string}    Event id for published data.
     * @param data {Object}     The object data for the update.
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.set = function(event, data, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'set', data, info);
      } else { // if Worker is not available we have to do this here
        var tmp = this._adapter.adaptUpdate(data);
        var result = this._resource.setByURL(tmp.url, tmp.data);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'set';
        result.param = tmp.url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Delete an object.
     * TODO Maybe prevent bulk deletes.
     *
     * @param event {string}    Event id for published data.
     * @param url {string}      The URL to the object to delete (see RESTful API doc for info).
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.del = function(event, url, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'del', url, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.delByURL(url);
        result.action = 'del';
        result.param = url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Send a message to the worker. This method is for internal use only. Messages sent
     * to the worker have always the following structure:
     *  {
     *    event: string,   // the event that recieves the result
     *    action: string,  // 'get', 'update', 'delete', 'save' or 'test'
     *    data: object     // data like search parameter or data of the object to save
     *    info: any        // Additional information
     *  }
     *
     * @param event {string}    The event that is used by the worker to return data.
     * @param action {string}   The requested action.
     * @param param {Object}    Object containing all data for this request.
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     *
     * @return The message object sent to the worker.
     */
    DataAPI.prototype._notifyWorker = function(event, action, param, info) {
      var worker_msg = {};
      worker_msg.event = event;
      worker_msg.action = action;
      worker_msg.param = param;
      worker_msg.info = info;
      this._worker.postMessage(worker_msg);
      return worker_msg;
    };

    return DataAPI;
  })();

})(wdat || (wdat = {}));