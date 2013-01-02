// ---------- file: button2.js ---------- //

// TODO Replace: replace Button by Button2 project wide
// TODO Refactoring: rename Button2 to Button and replace names project wide

(function(){

  /* A button widget. This is basically a wrapper for a jQuery UI button
   * object.
   * 
   * Parameter:
   *  - id: String, Obj     Id or jQuery object that represents the button (optional).
   *
   *  - label: String       The label for the button. This might also be a name of a
   *                        predefined button class (see PREDEF_BUTTONS).
   *
   *  - bus: EventBus       Bus for events.
   *
   *  - click: Sting, Func  Event string or function that is propagated by clicks.
   *                        If click is an event the whole button object is passed to the event.
   *
   *  - data: Any           Some data that is passed along with events.
   *
   * Depends on:
   *    WDAT.ui.Widget, WDAT.api.EventBus, jQuery, jQuery UI
   */
  WDAT.ui.Button2 = Button;
  inherit(Button, WDAT.ui.Widget);
  function Button(id, label, bus, click, data) {
    Button.parent.constructor.call(this, id, '<button>', 'wdat-button');
    this._bus = bus;
    this._data = data;
    if (Button.PREDEF_BUTTONS.hasOwnProperty(label)) {
      var pre = Button.PREDEF_BUTTONS[label];
      this._jq.button(pre.def);
      click = click || this._id;
      if (pre.click) this._jq.click(pre.click);
    } else {
      this._jq.button({text: true, label: label});
    }
    this.click(click);
  }

  /* Getter and setter for data, that is associated with the button.
   *
   * Parameter:
   *  - data:         New data (optional).
   *
   * Return value:
   *    The data associated with the button
   */
  Button.prototype.data = function(data) {
    var tmp = this._data;
    if (data !== undefined)
      this._data = data;
    return tmp;
  };

  /* Getter or setter for click events.
   *
   * Parameter:
   *  - click: Sting, Func  Event string or function that is propagated by 
   *                        clicks. If click is an event the whole button 
   *                        object is passed to the event.
   *
   * Return value:
   *    The function that handles the click event.
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

  /* Toggle images. For internal use only */
  function _toggleimg(first, second) {
    return function() {
      var b = $(this);
      if (b.button("option", "icons").primary == first)
        b.button("option", "icons", { primary: second});
      else
        b.button("option", "icons", { primary: first});
    };
  }
}());

