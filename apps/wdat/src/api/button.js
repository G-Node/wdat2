// ---------- file: button.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) {  window.WDAT = {}; }
if (!window.WDAT.api) { window.WDAT.api = {}; }

var IMAGE_ROOT = "/static/images/";

/* A button class. 
 *
 * Signature:
 *   var button = WDAT.api.Button(label, bus, click [, className, eventData]); 
 * 
 * Parameters:
 *  - label: String  (required)
 *      The label for the button element.  If this label matches criteria
 *      outlined below, a pre-defined button is created and you only need
 *      provide the bus, and the click parameter.
 *
 *  - bus: WDAT.api.EventBus  (required)
 *      The bus to publish and subscribe events on.  Can also be null.
 *
 *  - click: Function/String/null    (required)
 *      Function : A callback for the click event on this button.  No events
 *      are published if this callback is defined.  You can however easily
 *      circumvent that by publishing an event in your callback function.
 *        
 *        Signature of callback: function(){}
 *
 *      String : Name of the event to publish when clicked. 
 *
 *      null:  Do nothing when clicked.
 *
 *  - className: String  (optional)
 *      red/blue/green/default
 *      CSS class name to use.  Overrides any values interpreted through the
 *      label criterion.
 *
 *  - eventData: Object  (optional)
 *      Additional data to be passed when the events are fired.  If not
 *      specified, no additional data is passed.
 * 
 * Depends On:
 *  - jQuery, WDAT.api.EventBus
 */
WDAT.api.Button = function(label, bus, click, className, eventData) {
  this.button = $('<button></button>');

  // determine the type
  var typecmp = label.toLowerCase();

  // Add labels and classes based solely on the type
  if (typecmp === 'add') {
    this._type = 'add';
    this.button.addClass('button-add')
      .text('New');
  }
  else if (typecmp === 'add-small') {
    this._type = 'add-small';
    this.button.addClass('button-add-small')
      .html('<img src="' + IMAGE_ROOT + 'button-add.png">');
  }
  else if (typecmp === 'del') {
    this._type = 'del';
    this.button.addClass('button-del')
      .text('Delete');
  }
  else if (typecmp === 'del-small') {
    this._type = 'del-small';
    this.button.addClass('button-del-small')
      .html('<img src="' + IMAGE_ROOT + 'button-del.png">');
  }
  else if (typecmp === 'sel') {
    this._type = 'sel';
    this.button.addClass('button-sel')
      .text('Select');
  }
  else if (typecmp === 'sel-small') {
    this._type = 'sel-small';
    this.button.addClass('button-sel-small')
      .html('<img src="' + IMAGE_ROOT + 'button-star.png">');
  }
  else if (typecmp === 'edit') {
    this._type = 'edit';
    this.button.addClass('button-edit')
      .text('Edit');
  }
  else if (typecmp === 'edit-small') {
    this._type = 'edit-small';
    this.button.addClass('button-edit-small')
      .html('<img src="' + IMAGE_ROOT + 'button-edit.png">');
  }
  else if (typecmp === 'more-small') {
    // TODO implement toggle button
    this._type = 'more-small';
    this.button.addClass('button-more-small')
      .html('<img src="' + IMAGE_ROOT + 'button-more.png">');
  }
  else if (typecmp === 'ok') {
    this._type = 'ok';
    this.button.addClass('button-ok')
      .text('Edit');
  }
  else if (typecmp === 'quit') {
    this._type = 'quit';
    this.button.addClass('button-quit')
      .text('Cancel');
  }
  else {
    // Default case
    this.button.text(label);
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
  this._click = click;

  if (bus) {
    if ( typeof this._click === "function" ) {
      // This is a callback
      this.button.click(this._click);
    }
    else if ( typeof click === "string" ) {
      evbus = this._bus;

      // Publish an event 
      this.button.click(function() {
          evbus.publish(click, eventData);
      });
    }
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
