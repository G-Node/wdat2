// ---------- file: button.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

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
 *        Signature of subscribers: function(event, eventData);
 *
 *        Signature of subscribers for toggle functions:
 *            function(event, eventData);
 *            
 *            Here, eventData.state is a string.  Either 'more' or 'less'
 *            depending on which action the user intended.
 *            
 *      null:  Do nothing when clicked.
 *
 *      Additional notes:  A toggle button (label = 'more-small' or
 *      'less-small') should always have a string *click* value.
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
 *
 *  The table below defines the criteria for predefined buttons.
 *
 * +--------------+--------------+--------------+--------------+--------------+
 * |     Type     |  Label/Text  |    Image     |    Event     | CSS Classes  |
 * +==============+==============+==============+==============+==============+
 * | add          | New          | -            | click        | button-add   |
 * +--------------+--------------+--------------+--------------+--------------+
 * | add-small    | -            | button-      | click        | button-add-  |
 * |              |              | add.png      |              | small        |
 * +--------------+--------------+--------------+--------------+--------------+
 * | del          | Delete       | -            | click        | button-del   |
 * +--------------+--------------+--------------+--------------+--------------+
 * | del-small    | -            | button-      | click        | button-del-  |
 * |              |              | del.png      |              | small        |
 * +--------------+--------------+--------------+--------------+--------------+
 * | sel          | Select       | -            | click        | button-del-  |
 * |              |              |              |              | small        |
 * +--------------+--------------+--------------+--------------+--------------+
 * | sel-small    | -            | button-      | click        | button-sel-  |
 * |              |              | star.png     |              | small        |
 * +--------------+--------------+--------------+--------------+--------------+
 * | edit         | Edit         | -            | click        | button-edit  |
 * +--------------+--------------+--------------+--------------+--------------+
 * | edit-small   | -            | button-      | click        | button-edit- |
 * |              |              | edit.png     |              | small        |
 * +--------------+--------------+--------------+--------------+--------------+
 * | more/less-   | -            | button-(more | click        | button-      |
 * | small        |              | /less).png   |              | more/less    |
 * +--------------+--------------+--------------+--------------+--------------+
 * | ok           | OK           | -            | click        | button-ok    |
 * +--------------+--------------+--------------+--------------+--------------+
 * | quit         | Cancel       | -            | click        | button-quit  |
 * +--------------+--------------+--------------+--------------+--------------+
 * | more/less-   | -            | button-(more | click        | button-      |
 * | small        |              | /less).png   |              | more/less    |
 * +--------------+--------------+--------------+--------------+--------------+
 * | default      | label        | -            | click        | button-big   |
 * +--------------+--------------+--------------+--------------+--------------+
 *
 * 
 * Depends On:
 *  - jQuery, WDAT.api.EventBus
 */
WDAT.api.Button = function(label, bus, click, className, eventData) {
  this.button = $('<button></button>');

  // determine the type
  var typecmp = label.toLowerCase();

  // add a reference to current instance
  var that = this;

  // Add labels and classes based solely on the type
  if (typecmp === 'add') {
    this._type = 'add';
    this.button.addClass('button-add').text('New');
  } else if (typecmp === 'add-small') {
    this._type = 'add-small';
    this.button.addClass('button-add-small');
  } else if (typecmp === 'del') {
    this._type = 'del';
    this.button.addClass('button-del').text('Delete');
  } else if (typecmp === 'del-small') {
    this._type = 'del-small';
    this.button.addClass('button-del-small');
  } else if (typecmp === 'sel') {
    this._type = 'sel';
    this.button.addClass('button-sel').text('Select');
  } else if (typecmp === 'sel-small') {
    this._type = 'sel-small';
    this.button.addClass('button-sel-small');
  } else if (typecmp === 'edit') {
    this._type = 'edit';
    this.button.addClass('button-edit').text('Edit');
  } else if (typecmp === 'edit-small') {
    this._type = 'edit-small';
    this.button.addClass('button-edit-small');
  }
  else if (typecmp === 'more-small' || typecmp === 'less-small') {
    var state = typecmp.split('-')[0];

    // Flag to check whether currently in more condition or not.  This flag is
    // important since it is the only thing that separates a toggle button from
    // a normal button.  Used later in the event handlers to figure out the
    // state of the button.
    this.more_state = (state === 'more');

    this.button.addClass('button-' + state + '-small');
  }
  else if (typecmp === 'ok') {
    this._type = 'ok';
    this.button.addClass('button-ok')
      .text('OK');
  }
  else if (typecmp === 'quit') {
    this._type = 'quit';
    this.button.addClass('button-quit').text('Cancel');
  } else {
    // Default case
    this.button.text(label).addClass('button-big');
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
  this._eventData = eventData;

  if (bus) {
    if (typeof this._click === "function") {
      // This is a callback
      this.button.click(this._click);
    }
    else if ( typeof click === "string" ) {
      if (this.more_state !== undefined) {
        // This is a toggle button, append that information to eventData
        if (this._eventData === undefined) {
          this._eventData = {};
        }
      } 

      this.button.click(function() { 
        /* Within this function, 'that' represents a reference to the Button
         * object for this button */
        if (that.more_state !== undefined) {
          that._eventData.state = (that.more_state === true) ? 'more' : 'less';

          // Update the model
          that.more_state = !that.more_state;

          // Update the UI
          that.button.toggleClass('button-more-small', that.more_state);
          that.button.toggleClass('button-less-small', !that.more_state);

        }

        that._bus.publish(click, that._eventData);
      });
    }
  } 
};

// Implementing buttons methods in their own scope. 
(function() {
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
