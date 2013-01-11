// ---------- file: bread_crumb.js ---------- //

(function() {
  'use strict';

  /* Constructor for the class BreadCrumb. BreadCrumb implements a bread crumb
   * navigation bar. Elements can be added to the navigation bar. Each element
   * is represented by a button which sends a selection event when clicked.
   *
   * Elements are Objects with the following properties:
   *
   *  - Minimal element: {id: <id>, name: <name>}
   *
   * Parameters:
   *  - id: String, Obj.        The id of the list or a jQuery object.
   *
   *  - bus: EventBus           Bus for handling events.
   *
   *  - action: Sting, Func.    Event name or callback function for selection events (click)
   *
   * Depends on:
   *  - jQuery, jQuery-UI, WDAT.api.EventBus, WDAT.ui.Widget
   */
  WDAT.ui.BreadCrumb = BreadCrumb;
  inherit(BreadCrumb, WDAT.ui.Widget);
  function BreadCrumb(id, bus, action) {
    BreadCrumb.parent.constructor.call(this, id, '<div>', 'wdat-bread-crumb');
    this._bus = bus;
    this.action = action || this._id + '-select';
    this._datasets  = [];
    this._jq.data(this);
    this._jq.buttonset();
    var that = this;
    this._selectHandler = function() {
      var d = that.selected();
      if (typeof that.action  === 'function') {
        that.action(d);
      } else {
        that._bus.publish(that.action, d);
      }
    };
  };



  /* Add a new element to the navigation bar. If pos is not set the element will
   * be appended after the currentlx selected element. If the position is specified
   * all elements beginning at this position will be removed and the element
   * will be appended to the end of the navigation bar.
   *
   * Parameter:
   *  - data: Object      Object representing the navigation bar element.
   *
   *  - pos: Number       The position where to add the new element. All elements after the
   *                      specified position will be deleted (optional).
   *
   * Return value:
   *    The inserted element or null if nothing has been inserted.
   */
  BreadCrumb.prototype.add = function(data, pos) {
    pos = pos || this.selectedPos() + 1;
    if (!data.id) data.id = this._bus.uid();
    // prepare datasets
    this._datasets.splice(pos, this._datasets.length);
    this._datasets.push(data);
    // remove old radio buttons
    this._jq.empty();
    // create new ratio buttons
    for (var i in this._datasets) {
      var d = this._datasets[i];
      var input = $('<input type="radio">').attr('name', this._id).attr('id', this.toID(d));
      var label = $('<label>').attr('for', this.toID(d)).text(d.name);
      if (i == (this._datasets.length - 1))
        label.addClass('ui-state-active');
      this._jq.append(input).append(label);
    }
    this._jq.buttonset('refresh');
    this._jq.children('input').click(this._selectHandler);
    return data;
  }

  /* Remove all elements from the bread crumb bar beginning at the given position.
   *
   * Parameter:
   *  - pos: Number        The position from where to delete all elements.
   *
   * Return value:
   *    None
   */
  BreadCrumb.prototype.remove = function(pos) {
    pos = pos || 0;
    // prepare datasets
    this._datasets.splice(pos, this._datasets.length);
    // remove old radio buttons
    this._jq.empty();
    // create new ratio buttons
    for (var i in this._datasets) {
      var d = this._datasets[i];
      var input = $('<input type="radio">').attr('name', this._id).attr('id', this.toID(d));
      var label = $('<label>').attr('for', this.toID(d)).text(d.name);
      if (i == (this._datasets.length - 1))
        label.addClass('ui-state-active');
      this._jq.append(input).append(label);
    }
    this._jq.buttonset('refresh');
    this._jq.children('input').click(this._selectHandler);
  };

  /* Checks if an element is in the bread crumb bar.
   *
   * Parameter:
   *  - data: String, Obj.    The id of an element or the element itself.
   *
   * Return value:
   *    True if the element is in the bread crumb bar, false otherwise.
   */
  BreadCrumb.prototype.has = function(data) {
    return (data && this._navi.children('#' + this._toId(data)).length > 0);
  };

  /* Get the position of an element inside the bread crumb bar.
   *
   * Parameter:
   *  - data: String, Obj     The id of an element or the element itself.
   *
   * Return value:
   *    The position of the element inside the bar or -1 if not found.
   */
  BreadCrumb.prototype.pos = function(data) {
    var pos = -1;
    if (data) {
      var id = this.toID(data);
      this._jq.children('input').each(function(i) {
        if (pos < 0 && $(this).attr('id') == id) pos = i;
      });
    }
    return pos;
  };

  /* Get the position of the selected element.
   *
   * Return value:
   *    The position of the element inside the bar or -1 if not found.
   */
  BreadCrumb.prototype.selectedPos = function() {
    var pos = (this._datasets.length - 1);
    this._jq.children('label').each(function(i) {
      if (pos > i && $(this).is('.ui-state-active')) pos = i;
    });
    return pos;
  };

  /* Get the currently selected element.
   *
   * Return value:
   *    The currently selected element.
   */
  BreadCrumb.prototype.selected = function() {
    return this._datasets[this.selectedPos()];
  };

}());


