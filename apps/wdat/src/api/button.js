// ---------- file: button.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) {  window.WDAT = {}; }
if (!window.WDAT.api) { window.WDAT.api = {}; }

/* A button class. 
 * 
 * Parameter:
 *  - type: String
 *      The button type. If the type is add, del, remove or select
 *      a button with a suitable theme and label will be created. Otherwise
 *      the constructor creates a default button with type as label.
 *
 *  - bus: EventBus
 *      The bus to publish and subscribe events on.
 *
 *  - event: String
 *      The event to fire if the button is pressed.
 *
 *  - eventData: 
 *      Any  Additional Data to be passed to the event bus when the
 *      event is fired
 *
 *  - className: ['blue', 'green', 'red', 'default']
 *      If type is used as a label, you can theme it using this
 *      optional attribute.  It also overrides any defaults for
 *      the 'add', 'del' or similar types.  
 * 
 * Depends On:
 *  - jQuery, WDAT.api.EventBus
 */
WDAT.api.Button = function(type, bus, event, eventData, className) {
  
  this.button = $('<button></button>');

  // determine the type
  var typecmp = type.toLowerCase();
  if (typecmp === 'add') {
    type = 'add';
    this.button.addClass('green').text('Add');
  } else if (typecmp === 'rem' || typecmp === 'remove') {
    type = 'rem';
    this.button.addClass('red').text('Remove');
  } else if (typecmp === 'del' || typecmp === 'delete') {
    type = 'del';
    this.button.addClass('red').text('Delete');
  } else if (typecmp === 'sel' || typecmp === 'select') {
    type = 'sel';
    this.button.addClass('blue').text('Select');
  } else if (typecmp === 'edit') {
    type = 'edit';
    this.button.text('Edit');
  } else {
    this.button.text(type);
  }

  // If class specified, use it instead of anything else
  if (className) {
    var validation_re = /(red|blue|green|default)/;

    if (validation_re.test(className)) {
      this.button.removeClass();
      this.button.addClass(className);
      // Note, this may add a 'button-default' classname, but that
      // still doesn't hurt because this will make the button fallback
      // to the button style definition.
    }
  }

  // register events
  this._bus = bus;
  this._event = event;
  if (!eventData) {
    eventData = type;
  }
  if (bus && event) {
    this.button.click(function() { bus.publish(event, eventData); });
  }
};

// Implementing buttons methods in their own scope. 
(function(){
  // Just a shortcut for the prototype
  var _proto = WDAT.api.Button.prototype;
  
  /* Returns the button as a jQuery object.
   * 
   * Return value:
   *  - The button (jQuery)
   */
  _proto.toJQ = function() {
    return this.button;
  };
  
  /* Returns the button as a string.
   * 
   * Return value:
   *  - the button as a string.
   */
  _proto.toString = function() {
    return this.button.html();
  };
  
  /* Unregister the event used by the button from the event
   * bus.
   * 
   * Return value:
   *  - None
   */
  _proto.unsubscribe = function() {
    this._bus.unsubscribe(this._event);
  };
}());
