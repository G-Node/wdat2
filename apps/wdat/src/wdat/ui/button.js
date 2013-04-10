// ---------- file: button2.js ---------- //


var wdat; (function(wdat, $){


  /****************************************************************************************
   * A button widget. This is basically a wrapper for a jQuery UI button
   * object.
   *
   * Depends on: WDAT.Widget, WDAT.Bus, jQuery, jQuery UI
   *
   * @returns {Button}
   ***************************************************************************************/
  wdat.Button = (function() {

    Button.inherits(wdat.Widget);
    /**
     * Constructor for the class Button.
     *
     * @param id (String, Obj)          Id or jQuery object that represents the button (optional).
     * @param label (String)            The label for the button. This might also be a name of a
     *                                  predefined button class (see PREDEF_BUTTONS).
     * @param bus (Bus)                 Bus for events.
     * @param click (String, Function)  Event string or function that is propagated by clicks.
     *                                  If click is an event the whole button object is passed
     *                                  to the event.
     * @param data (Any)                Some data that is passed along with events.
     *
     * @constructor @this {Button}
     */
    function Button(id, label, bus, click, data) {
      Button.parent.constructor.call(this, id, '<button>', 'wdat-button');
      this._bus = bus;
      this._data = data;
      if (Button.PREDEF_BUTTONS.hasOwnProperty(label)) {
        var pre = Button.PREDEF_BUTTONS[label];
        this._jq.button(pre.def);
        if (pre.click) this._jq.click(pre.click);
      } else {
        this._jq.button({text: true, label: label});
      }
      this.click(click || this._id);
    }

    /**
     * Getter and setter for data, that is associated with the button.
     *
     * @param data (Any)    New data (optional).
     *
     * @return The data associated with the button.
     */
    Button.prototype.data = function(data) {
      var tmp = this._data;
      if (data !== undefined)
        this._data = data;
      return tmp;
    };

    /**
     * Getter or setter for click events.
     *
     * @param click (String, Function)    Event string or function that is propagated by
     *                                    clicks. If click is an event the whole button
     *                                    object is passed to the event.
     *
     * @return The function that handles the click event.
     */
    Button.prototype.click = function(click) {
      if (click) {
        // remove old handler
        if (this._click) this._jq.unbind('click', this._click);
        // add new one
        if (typeof click === 'function') {
          this._click = click;
          this._jq.click(click);
        } else {
          var that = this;
          this._click = function() { that._bus.publish(click.toString(), that.data()); };
          this._jq.click(this._click);
        }
      }
      return this._click;
    };

    Button.prototype.disable = function(disabled) {
      this._jq.button("option", "disabled", disabled);
    };

    /* Some predefined buttons */
    Button.PREDEF_BUTTONS = {
      add:        {def: {text: true, label: "Add", icons: { primary: "ui-icon-plusthick"}}},
      add_small:  {def: {text: false, icons: { primary: "ui-icon-plusthick"}}},
      del:        {def: {text: true, label: "Remove", icons: { primary: "ui-icon-minusthick"}}},
      del_small:  {def: {text: false, icons: { primary: "ui-icon-minusthick"}}},
      sel:        {def: {text: true, label: "Select", icons: { primary: "ui-icon-check"}}},
      sel_small:  {def: {text: false, icons: { primary: "ui-icon-check"}}},
      edit:       {def: {text: true, label: "Edit", icons: { primary: "ui-icon-wrench"}}},
      edit_small: {def: {text: false, icons: { primary: "ui-icon-wrench"}}},
      ok:         {def: {text: true, label: "OK"}},
      save:       {def: {text: true, label: "Save"}},
      quit:       {def: {text: true, label: "Cancel"}},
      more:       {def: {text: false, icons: { primary: "ui-icon-triangle-1-s"}},
                   click: _toggleimg("ui-icon-triangle-1-s", "ui-icon-triangle-1-n")}
    };

    /**
     * Toggle images. For internal use only
     *
     * @param first (String)     CSS identifier (jQuery UI button) for the first image.
     * @param second (String)   CSS identifier (jQuery UI button) for the second image.
     *
     * @returns {Function}
     */
    function _toggleimg(first, second) {
      return function() {
        var b = $(this);
        if (b.button("option", "icons").primary == first)
          b.button("option", "icons", { primary: second});
        else
          b.button("option", "icons", { primary: first});
      };
    }

    return Button;
  })(); // end class Button

})(wdat || (wdat = {}), jQuery); // end module wdat

