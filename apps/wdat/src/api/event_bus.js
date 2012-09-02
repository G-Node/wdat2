// ---------- file: bus.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) {	window.WDAT = {}; }
if (!window.WDAT.api) { window.WDAT.api = {}; }

/*
 * Constructor for the class EventBus. The event bus can be used to register and
 * fire events.
 */
WDAT.api.EventBus = function() {
	// used by the uid generator
	this._counter = 1;
};

(function() {
	// Just a shortcut for the prototype
	var _proto = WDAT.api.EventBus.prototype;

	// method definition

	/* Subscribe a function to a specific event.
	 * 
	 * Parameters:
	 *  - event: String		The event name.
	 *  - fn: Function		The function to call when events are published.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 *  
	 * Return value:
	 *  - The event name (with concatenated id) 
	 */
	_proto.subscribe = function(event, fn, uid) {
		if (uid) {
			event += uid;
		}
		$(this).bind(event, fn);
		return event;
	};
	
	/* Unsubscribe a specific event.
	 * 
	 * Parameter:
	 *  - event: String		The event name.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 * 
	 * Return value:
	 *  - None
	 */
	_proto.unsubscribe = function(event, uid) {
		if (uid) {
			event += uid;
		}
		$(this).unbind(event);
	};

	/* Fire a specific event.
	 * 
	 * Parameters:
	 *  - event: String		The event name.
	 *  - fn: Function		The function to call when events are published.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 *  
	 * Return value:
	 *  - The event name (with concatenated id) 
	 */
	_proto.publish = function(event, params, uid) {
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
	_proto.uid = function() {
		return (this._counter++).toString();
	};

}());


