// ---------- file: base.js ---------- //

/* IMPORTANT!
 * This file contains some base classes for other UI dataents. Please make sure that
 * this file is included in all tests and production files before the definition of
 * other classes in the WDAT.ui name space.
 */

(function(){
  'use strict';

  //-------------------------------------------------------------------------------------
  // Class: Widget
  //-------------------------------------------------------------------------------------

  /* A base class for all kinds of UI dataents. Each widget has a private property
   * _jq representing a jQuery object and a property _id, that is also used as
   * the id of the HTML dataent (_jq.attr('id')).
   *
   * Parameters:
   *  - id: String, jQuery      A id or and jQuery object, that defines the widget.
   *
   *  - template: String          HTML code that is used to instantiate the structure
   *                              of the widget (optional). If unsed the template is '<div>'
   *
   *  - class: String             The class that should be added to HTML representation of
   *                              the widget.
   */
  WDAT.ui.Widget = Widget;
  function Widget(id, template, clazz) {
    if (id) {
      if (typeof id == 'string') {        // id is a string
        this._jq = template ? $(template) : $('<div>');
        this._jq.attr('id', id);
        this._id = id;
      } else if (typeof id === 'object') { // id is a jQuery object
        this._jq = id;
        this._id = this._jq.attr('id');
      }
      if (clazz)
        this._jq.addClass(clazz);
    } else {
      this._id = '';
      this._jq = template ? $(template) : $('<div>');
    }
  }

  /* Returns the id of the widget.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    The id of the widget
   */
  Widget.prototype.id = function() {
    return this._id;
  };

  /* Returns the jQuery object that represents the widget.
   * Use this method to add the widget to the DOM tree.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    The jQuery object that represents the widget
   */
  Widget.prototype.jq = function() {
    return this._jq;
  };

  Widget.prototype.toID = function(data, suffix) {
    var id = null;
    if (data) {
      if (typeof data === 'object' && data.id) {
        id = this._id + '-' + data.id.toString().replace(/[\.\\\/_]+/g, '-');
      } else {
        id = this._id + '-' + data.toString().replace(/[\.\\\/_]+/g, '-');
      }
    }
    if (id && suffix)
      id += '-'+suffix;
    return id;
  };

  /* Remove the widget from the DOM tree (side effect).
   * Don't reatach the wiget after calling this method.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    None
   */
  Widget.prototype.remove = function() {
    this._jq.remove();
  };

  /* Detach the widget from the DOM tree (side effect).
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    None
   */
  Widget.prototype.detach = function() {
    this._jq.detach();
  };

  //-------------------------------------------------------------------------------------
  // Class: Container
  //-------------------------------------------------------------------------------------

  /* A container that displays an object returned by the DataAPI.
   * A container has primary attributes that are allwasy visible. The visibility of secondary 
   * attributes can be toggled on and of. Primary and secondary attributes are defined by
   * simple arrays of names.
   * Further more each container can have multiple actions (see Container.ACTIONS). For each 
   * action passed to the constructor, a button will be created, that fires the given action
   * when clicked. Actions are defined by an object with the actions name as attribute name and
   * the event name or callback function as its value.
   *
   * Parameters:
   *  - id: String, Obj         String or jQuery object that represents the container.
   * 
   *  - bus: EventBus           Bus for handling events.
   * 
   *  - data: Obj               The data object to show inside the container.
   *
   *  - primary: Array          Definition of primary attributes.
   * 
   *  - secondary: Array        Definition of secondary attributes.
   *
   *  - actions: Obj            Definitions of all actions.
   *
   * Depends on:
   *    WDAT.api.EventBus, WDAT.ui.Widget, WDAT.ui.Button2, jQuery, jQuery-UI button
   */
  WDAT.ui.Container = Container;
  inherit(Container, WDAT.ui.Widget);
  function Container(id, bus, data, primary, secondary, actions) {
    Container.parent.constructor.call(this, id, Container.TEMPLATE, 'wdat-container');
    this._bus = bus;
    this._primary = primary || ['name'];
    this._secondary = secondary;
    this._actions = actions;
    if (data) this.data(data);
  }

  /* Getter and setter for the data object shown by the container.
   *
   * Parameter:
   *  - data: Obj       The data object to show inside the container.
   *
   * Return value:
   *    The data object shown by the container.
   */
  Container.prototype.data = function(data) {
    if (data) {
      this._data = data;
      this._jq.children('div').empty();
      var prim = this._jq.children('.primary');
      for (var i in this._primary) {
        var val = objGetRecursive(data, this._primary[i]);
        if (i == 0)
          prim.append($('<span class="head">').text(val));
        else if (i == 1)
          prim.append($('<span class="head-add">').text(' '+val));
        else if (i > 1)
          prim.children('.head-add').append(', '+val);
      }
      var buttons = this._jq.children('.buttons');
      if (this._secondary) {
        var sec = this._jq.children('.secondary');
        for (var i in this._secondary) {
          var key = this._secondary[i];
          var val = objGetRecursive(data, key);
          sec.append($('<span class="key">').text(strCapitalizeWords(key, /[\ \-_]/) + ':'));
          sec.append($('<span class="val">').text(val)).append('<br>');
        }
        var btn = new WDAT.ui.Button2(null, 'more', this._bus, this._expandHandler());
        buttons.append(btn.jq());
      }
      if (this._actions) {
        for (var i in Container.ACTIONS) {
          i = Container.ACTIONS[i];
          if (this._actions.hasOwnProperty(i)) {
            var btn = new WDAT.ui.Button2(null, i + '_small', this._bus, this._actions[i], data);
            buttons.append(btn.jq());
          }
        }
      }
    }
    return this._data;
  };

  /* Returns a handler for expand events (for internal use only) */
  Container.prototype._expandHandler = function() {
    var that = this;
    return function() {
      var sec = that._jq.children('.secondary');
      sec.toggleClass('hidden');
    };
  };

  /* HTML template for container */
  Container.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                       '<div class="secondary hidden"></div></div>';

  /* Possible actions */
  Container.ACTIONS = ['add', 'del', 'sel', 'edit'];

}());

