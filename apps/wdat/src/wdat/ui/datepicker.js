// ------------ file: datepicker.js ----------- //

(function () {
  'use strict';

  /* A date-picker class.
   *
   * Usage:
   *   var picker = WDAT.ui.DatePicker(textbox);
   *
   *
   * Parameters: All are required
   *   textbox:  Since dates are usually bound to a textbox instance, this
   *   argument is a jQuery object representing a textbox.
   *
   * Note
   *  This class doesn't expose a toJQ() method because it is intended to be used
   *  directly on a textbox.
   *
   * Depends : jQuery, jquery.jdpicker.js, button.js, event_bus.js
   */
  WDAT.ui.DatePicker = DatePicker;
  function DatePicker(textbox) {
    var that = this;

    this.lBus = new WDAT.api.EventBus();

    this._textbox = textbox;
    this._panel = $('<div class="datepicker"></div>');
    this._container = $('<div class="datepicker-container"/>');
    this._handle = $('<a class="calendar"></a>');
    this._common = $('<div class="common"></div>');
    this._specific = $('<div class="specific"></div>');

    // Wrap the handle around the textbox
    $(this._textbox).wrap(this._container);
    $(this._textbox).after(this._handle);

    // Fill up the common and specific options
    this.fillCommon();
    this.fillSpecific();

    $(this._textbox).toggleClass('datepicker-target', true);
    $(this._panel).append(this._common);
    $(this._panel).append(this._specific);
    $(this._textbox).after(this._panel);

    this._panel.hide();

    // Toggle widget display on clicking handle
    $(this._handle).click(function() {
        that.toggle();
    });
  }

  /* Toggle the displaying of the datepicker widget.  Usually triggered when
   * the textbox is clicked.
   *
   * :optional param: forceShow - If true, then widget is shown.  If false,
   * hidden.
   * */
  DatePicker.prototype.toggle = function (forceShow) {
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

  /* Update the textbox and close the datepicker.
   *
   * date is a Date() object, operator 'string' is either '<', '>' or '='
   */
  DatePicker.prototype.update = function (date, operator) {
    var normalize = function (num) {
      /* Return '08', if 8, '09' if 9 and '10' if 10 */
      if (num > 9) {
        return num.toString();
      } else {
        return '0' + num.toString();
      }
    };

    var dd = normalize(date.getDate())
      , mm = normalize(date.getMonth() + 1) // months are zero indexed
      , yyyy = date.getFullYear().toString();

    var datestring = operator + '' + dd + '-' + mm + '-' + yyyy;

    $(this._textbox).val(datestring);
    this.toggle(false);
    $(this._textbox).keyup(); // To detect changes on the values
    $(this._textbox).focus();
  };

  /* Fill up the common options */
  DatePicker.prototype.fillCommon = function () {
    /* First prepare the dates */
    var today = new Date()
      , nextdate = new Date() // the date object on which to perform operations
      , offset = 24*60*60*1000;

    var week  = new Date(today.getTime() - offset*7);
    var month = new Date(today.getTime() - offset*30);
    var half  = new Date(today.getTime() - offset*182);
    var year  = new Date(today.getTime() - offset*365);

    var that = this
      , comdiv = this._common
      , ul = $('<ul></ul')
      , TEMPLATE = '<li class="option"><a></a></li>'
      , common_options = [
              ['Today', today, '='],
              ['Last seven days', week, '>'],
              ['Last thirty days', month, '>'],
              ['Last six months', half, '>'],
              ['Last year', year, '>'],
              ['Even earlier', year, '<']
            ]
      , specific_pointer = $('<li class="specific_pointer">Or pick a date »</li>');

    for (var i=0; i<common_options.length; i++) {
      var li = $(TEMPLATE);
      $(li).find('a').first().text(common_options[i][0]);
      $(li).click((function (j) {
        // Closure to ensure that the correct i value is used.
        // http://stackoverflow.com/questions/2568966/how-do-i-pass-the-value-not-the-reference-of-a-js-variable-to-a-function
        // for details
        return function () {
          that.update(common_options[j][1], common_options[j][2]);
        };
      })(i));
      $(ul).append(li);
    }

    $(ul).append(specific_pointer);

    $(comdiv).append(ul);
  };

  /* Fill up the specific datepicker */
  DatePicker.prototype.fillSpecific = function () {
    var that = this
      , spediv = this._specific
      , closebtn = $('<a class="close"></a>')
      , intdate  = $('<input type="hidden"></input>');

    $(spediv).append(closebtn);
    $(spediv).append(intdate);

    // Add the calendar widget
    $(intdate).jdPicker();

    // Add finalizing buttons
    var before = new WDAT.ui.Button('Before', this.lBus, 'before', 'blue')
      , on     = new WDAT.ui.Button('On', this.lBus, 'on', 'blue')
      , after  = new WDAT.ui.Button('After', this.lBus, 'after', 'blue');

    $(spediv).append(before.toJQ());
    $(spediv).append(on.toJQ());
    $(spediv).append(after.toJQ());

    $(before.toJQ()).click(function () {
      var date;
      if ($(intdate).val() !== '') {
        var parts = $(intdate).val().split('/');
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        // If no date has been selected, assume today
        date = new Date();
      }
      that.update(date, '<');
    });

    $(on.toJQ()).click(function () {
      var date;
      if ($(intdate).val() !== '') {
        var parts = $(intdate).val().split('/');
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        // If no date has been selected, assume today
        date = new Date();
      }
      that.update(date, '=');
    });

    $(after.toJQ()).click(function () {
      var date;
      if ($(intdate).val() !== '') {
        var parts = $(intdate).val().split('/');
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        // If no date has been selected, assume today
        date = new Date();
      }
      that.update(date, '>');
    });

    // Close button handling
    $(closebtn).click(function () {
       that.toggle(false);
       $(that._textbox).focus()

    });
  };

}());

