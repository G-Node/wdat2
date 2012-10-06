// ------------ file: datepicker.js ----------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {} ;

/* A date-picker class.
 *
 * Usage: 
 *   var picker = WDAT.api.DatePicker(textbox);
 *
 * Parameters:
 *   textbox:  Since dates are usually bound to a textbox instance, this
 *   argument is a jQuery object representing a textbox.
 *
 * Depends : jQuery
 */
WDAT.api.DatePicker = function (textbox) {
  var that = this
    , lBus = WDAT.api.EventBus();
  
  this._textbox = textbox;
  this._panel = $('<div class="datepicker"></div>');
  this._common = $('<div class="common"></div>');
  this._specific = $('<div class="specific"></div>');

  // Fill up the common and specific options
  this.fillCommon();
  this.fillSpecific();

  $(this._textbox).toggleClass('datepicker-target', true);
  $(this._panel).append(this._common);
  $(this._panel).append(this._specific);
  $(this._textbox).after(this._panel);

  this._panel.hide();

  // Toggle widget display on focus and blur of textbox 
  $(this._textbox).focus(function() { 
      if(!that._prevent) that.toggle(true);

      // Reset flag
      that._prevent = false;
  });
};

(function () {
  /* Add prototypal methods */
  var _proto = WDAT.api.DatePicker.prototype;

  /* Toggle the displaying of the datepicker widget.  Usually triggered when
   * the textbox is clicked.
   *
   * :optional param: forceShow - If true, then widget is shown.  If false,
   * hidden.
   * */ 
  _proto.toggle = function (forceShow) {
    if (forceShow !== undefined) {
      // If forceShow parameter supplied.
      if (forceShow) {
        this._panel.fadeIn();
      } else { 
        this._panel.fadeOut();
      }
    } else {
      this._panel.fadeToggle();
    }
  };

  /* Fill up the common options */
  _proto.fillCommon = function () {
    var comdiv = this._common
      , ul = $('<ul></ul')
      , TEMPLATE = '<li class="option"><a></a></li>'
      , common_options = ['Today', 'Within this week', 'Within this month', 
                          'Within six months', 'Within the year', 
                          'Even earlier']
      , specific_pointer = $('<li class="specific_pointer">Or pick a date »</li>');

    for (var i=0; i<common_options.length; i++) {
      var li = $(TEMPLATE);
      $(li).find('a').first().text(common_options[i]);

      $(ul).append(li);
    }

    $(ul).append(specific_pointer);

    $(comdiv).append(ul);
  };

  /* Fill up the specific datepicker */
  _proto.fillSpecific = function () {
    var that = this 
      , spediv = this._specific
      , closebtn = $('<a href="#" class="close"></a>')
      , intdate  = $('<input type="hidden"></input>');

    $(spediv).append(closebtn);
    $(spediv).append(intdate);

    // Add the calendar widget
    $(intdate).jdPicker();

    // Add finalizing buttons
    var before = new WDAT.api.Button('Before', this.lBus, 'before', 'blue')
      , on     = new WDAT.api.Button('On', this.lBus, 'on', 'blue')
      , after  = new WDAT.api.Button('After', this.lBus, 'after', 'blue');

    $(spediv).append(before.toJQ());
    $(spediv).append(on.toJQ());
    $(spediv).append(after.toJQ());

    // Close button handling
    $(closebtn).click(function () {
       that.toggle(false);
       that._prevent = true;

       $(that._textbox).focus()
    });
  };
})();
