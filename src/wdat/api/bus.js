// ---------- file: bus.js ---------- //

var wdat; (function(wdat) {

  /****************************************************************************************
   * Class Bus. The event bus can be used to register and fire events.
   *
   * Logging:
   *    If wdat.debug = true the bus will write every event to the console.
   *
   * Error handling:
   *    If the event data object contains a field 'error' with a not falsy value
   *    the object will be passed to the method 'onerror(event, data)' and publishing of
   *    the event will be caceled if 'onerror' returns a falsy value.
   *
   * @returns {Bus}
   ***************************************************************************************/
  wdat.Bus = (function() {

    /**
     * Constructor for the class Bus.
     *
     * @constructor @this {Bus}
     */
    function Bus() {
      // used by the uid generator
      this._counter = 1;
      this.onerror = function(event, data) {
        if (data && data.error && console) {
          console.log('Bus (ERROR): event = ' + event.type + ' // error' + data.response || data.error);
          return false;
        }
        return true;
      };
    }

    /**
     * Subscribe a function to a specific event.
     *
     * @param event {string}    The event name.
     * @param fn {Function}     The function to call when events are published.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     *
     * @return The event name (with concatenated id)
     */
    Bus.prototype.subscribe = function(event, fn, uid) {
      var e = event;
      if (uid) e += uid;
      if (wdat.debug && console)
        console.log('Bus (DEBUG): subscribe event ' + e);
      $(this).bind(e, fn);
      return e;
    };

    /**
     * Unsubscribe a specific event.
     *
     * @param event {string}    The event name.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     */
    Bus.prototype.unsubscribe = function(event, uid) {
      var e = event;
      if (uid) e += uid;
      if (wdat.debug && console)
        console.log('Bus (DEBUG): unsubscribe event ' + e);
      $(this).unbind(e);
    };

    /**
     * Fire a specific event.
     *
     * @param event {string}    The event name.
     * @param data         The data that will be passed to the event handler function
     *                          along with the event.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     *
     * @return The event name (with concatenated id)
     */
    Bus.prototype.publish = function(event, data, uid) {
      var e = event;
      if (uid) e += uid;
      if (this.onerror(event, data)) {
        if (wdat.debug && console) {
          var d = data || 'none';
          console.log('Bus (DEBUG): publish event ' + e + ' // data = ' + JSON.stringify(d));
        }
        $(this).trigger(e, data);
      } else if (console) {
        var d = data || 'none';
        console.log('Bus (DEBUG): event not published due to errors // data = ' + JSON.stringify(d));
      }
      return e;
    };

    /**
     * Create a new unique id (uid).
     *
     * @return The new unique identifier {string}.
     */
    Bus.prototype.uid = function() {
      return (this._counter++).toString();
    };

    return Bus;
  })(); // end class Bus

}(wdat || (wdat = {}))); // end module wdat

