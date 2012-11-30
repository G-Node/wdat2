// ---------- file: bus.js ---------- //

(function() {

  /* Constructor for the class EventBus. The event bus can be used to register and
   * fire events.
   */
  WDAT.api.EventBus = EventBus
  function EventBus() {
    // used by the uid generator
    this._counter = 1;
  }

  // method definition

  /* Subscribe a function to a specific event.
   * 
   * Parameters:
   *  - event: String    The event name.
   *  - fn: Function    The function to call when events are published.
   *  - uid: String    A unique id that is concatenated to the event, in order
   *            to create unique event names.
   *  
   * Return value:
   *  - The event name (with concatenated id) 
   */
  EventBus.prototype.subscribe = function(event, fn, uid) {
    if (uid) {
      event += uid;
    }
    $(this).bind(event, fn);
    return event;
  };
  
  /* Unsubscribe a specific event.
   * 
   * Parameter:
   *  - event: String    The event name.
   *  - uid: String    A unique id that is concatenated to the event, in order
   *            to create unique event names.
   * 
   * Return value:
   *  - None
   */
  EventBus.prototype.unsubscribe = function(event, uid) {
    if (uid) {
      event += uid;
    }
    $(this).unbind(event);
  };

  /* Fire a specific event.
   * 
   * Parameters:
   *  - event: String    The event name.
   *  - fn: Function    The function to call when events are published.
   *  - uid: String    A unique id that is concatenated to the event, in order
   *            to create unique event names.
   *  
   * Return value:
   *  - The event name (with concatenated id) 
   */
  EventBus.prototype.publish = function(event, params, uid) {
    if (uid) {
      event += uid;
    }
    $(this).trigger(event, params);
    return event;
  };
  
  /* Create a new unique id (uid).
   * 
   * Return value:
   *  - The new unique identifier (String).
   */
  EventBus.prototype.uid = function() {
    return (this._counter++).toString();
  };

}());


