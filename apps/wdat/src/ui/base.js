// ---------- file: base.js ---------- //

/* IMPORTANT!
 * This file contains some base classes for other UI dataents. Please make sure that
 * this file is included in all tests and production files before the definition of
 * other classes in the WDAT.ui name space.
 */

(function() {
  'use strict';

  //-------------------------------------------------------------------------------------
  // Class: Widget
  //-------------------------------------------------------------------------------------

  /* A base class for all kinds of UI dataents. Each widget has a private property
   * _jq representing a jQuery object and a property _id, that is also used as
   * the id of the HTML dataent (_jq.attr('id')).
   * A key feature of a Widget is the facht that it adds itself to ists own jQuery
   * object (widget.jq().data() === widget).
   *
   * Parameters:
   *  - id: String, jQuery        A id or and jQuery object, that defines the widget.
   *
   *  - template: String          HTML code that is used to instantiate the structure
   *                              of the widget (optional). If unsed the template is '<div>'
   *
   *  - class: String             The class that should be added to HTML representation of
   *                              the widget.
   */
  WDAT.ui.Widget = Widget;
  function Widget(id, template, clazz) {
    var tmpl = template || '<div>';
    if (id) {
      if (typeof id == 'string') { // id is a string
        this._jq = $(tmpl);
        this._jq.attr('id', id);
        this._id = id;
      } else if (typeof id === 'object') { // id is a jQuery object
        this._jq = id;
        this._id = this._jq.attr('id');
        this._jq.empty().append($(tmpl).html());
      }
    } else {
      this._id = '';
      this._jq = $(tmpl);
    }
    if (clazz)
      this._jq.addClass(clazz);
    this._jq.data(this);
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

  /* Generates an ID within the name space of the widget. This ID should be used 
   * in order to avoid multiple identical IDs in one HTML document.
   *
   * Parameter:
   *  - id: String, Obj.      ID string or an object with the property 'id'.
   *
   *  - suffix: String        Suffix, that will be appended to the id.
   *
   * Return value:
   *    The generated id string
   */
  Widget.prototype.toID = function(data, suffix) {
    var id = null;
    if (data) {
      if (typeof data === 'object') {
        if (data.id)
          id = this._id + '-' + data.id.toString().replace(/[\.\\\/_]+/g, '-');
      } else {
        id = this._id + '-' + data.toString().replace(/[\.\\\/_]+/g, '-');
      }
    }
    if (id && suffix)
      id += '-' + suffix;
    return id;
  };

  /* Remove the widget from the DOM tree (side effect).
   * Don't reatach the wiget after calling this method.
   * FIXME name collides with method in Tree and List!!
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

  /* A container element, that displays objects returned by the DataAPI. The container
   * distinguishes between primary and secondary attributes. Primary attributes of
   * the presented object are shown permanently whereas secondary attributes are only visible
   * when the container is expanded.
   * Primary and secondary attributes can be configured using the setAttr() method or the
   * attrconf parameter of the constructor.
   * 
   * Parameters:
   *  - id: String, Obj         String or jQuery object that represents the container.
   * 
   *  - bus: EventBus           Bus for handling events.
   * 
   *  - actions: Obj            Definitions of all actions.
   *  
   *  - attrconf: Obj           Definition of primary and secondary attributes.
   *  
   *  - clazz: String           Class used for the containers HTML representation.
   *  
   *  - template: String        Template for the container. If a custom template is used
   *                            the refresh method has to be overridden.
   *
   * Depends on: 
   *    WDAT.api.EventBus, WDAT.ui.Widget, WDAT.ui.Button2, jQuery, jQuery-UI button
   */
  WDAT.ui.Container = Container;
  inherit(Container, WDAT.ui.Widget);
  function Container(id, bus, actions, attrconf, clazz, template) {
    var tmpl = template || Container.TEMPLATE;
    Container.parent.constructor.call(this, id, tmpl, 'wdat-container');
    if (clazz)
      this._jq.addClass(clazz);
    this._bus = bus;
    this._actions = actions || {};
    if (attrconf) {
      this._attrconf = {};
      this._attrconf.prim = attrconf.prim || ['name'];
      this._attrconf.sec = attrconf.sec || [];
      this._attrconf.child_prim = attrconf.child_prim || [];
      this._attrconf.child_sec = attrconf.child_sec || [];
    } else {
      this._attrconf = {prim : ['name'], sec : [], child_prim : [], child_sec : []};
    }
    this._data = {};
    this._children = [];
    this._jq.data(this);
  }

  /* Set the data object of the container.
   * 
   * Parameters:
   *  - data: Obj       The data object of the container.
   *
   * Return value:
   *    The data object
   */
  Container.prototype.set = function(data) {
    var d = data || {};
    if (d.id && d.id == this._data.id) {
      this._data = d;
    } else {
      this._data = d;
      this._children.splice(0, this._children.length);
    }
    this.refresh();
  };

  /* Set child objects for the data object represented by the container.
   * If the data parameter is an Array, all children will be replaced by 
   * the objects contained in data. If data is an Object the object will 
   * be added to the list of existing children.
   * 
   * Parameters:
   *  - data: Array, Obj     Child objects of the main data object represented by 
   *                         the container.
   *
   * Return value:
   *    None
   */
  Container.prototype.setChildren = function(data) {
    if (data instanceof Array) {
      this._children = data;
    } else {
      var index = -1;
      for ( var i in this._children) {
        if (this._children[i].id == data.id) {
          index = i;
          break;
        }
      }
      if (index >= 0) {
        this._children[index] = data;
      } else {
        this._children.push(data);
      }
    }
    this.refreshChildren();
  };

  /* Get the main data object of the container.
   * 
   * Parameter:
   *    None
   *
   * Return value:
   *    The main data object of the container.
   */
  Container.prototype.get = function() {
    return this._data;
  };

  /* Get the child objects of the main data object of the container.
   * 
   * Parameter:
   *  - data: String, Obj   The object to fetch or the id of this object.
   *  
   * Return value:
   *    The selected child object or all children if no child was specified.
   */
  Container.prototype.getChildren = function(data) {
    var result = this._children;
    if (data) {
      var id = data.id || data;
      var index = -1;
      for ( var i in this._children) {
        if (this._children[i].id == id) {
          index = i;
          break;
        }
      }
      if (index >= 0) {
        result = this._children[i];
      }
    }
    return result;
  };

  /* Configure the primary or secondary attributes for the main data object or 
   * its children. 
   * 
   * Parameters:
   *  - type: String      The type of attributes ('prim', 'sec', 'child_prim' 
   *                      or 'child_sec').
   *
   *  - attrlist: Array   Array with attributes that replaces the existing list
   *                      of attributes.
   *
   * Return value:
   *    None
   */
  Container.prototype.attrconf = function(type, attrlist) {
    if (this._attrconf.hasOwnProperty(type)) {
      this._attrconf[type] = attrlist;
    }
  };

  /* Refresh or create the whole content of the container.
   * In the default implementation children and their attribute configurations
   * are ignored.
   *
   * Return value:
   *    None
   */
  Container.prototype.refresh = function() {
    // create primary content
    var html = this._jq.children('.primary').empty();
    var count = 0;
    for ( var i in this._attrconf.prim) {
      var val = objGetRecursive(this._data, this._attrconf.prim[i]);
      if (val) {
        switch (count) {
          case 0:
            html.append($('<span class="head">').text(val));
            break;
          case 1:
            html.append($('<span class="head-add">').text(val));
            break;
          default:
            html.children('.head-add').append(', ' + val);
            break;
        }
      }
    }
    // create secondary content
    html = this._jq.children('.secondary').empty();
    for ( var i in this._attrconf.sec) {
      var key = this._attrconf.sec[i];
      var val = objGetRecursive(this._data, key) || 'n.a.';
      key = strCapitalizeWords(key, /[_\-\ \.:]/) + ':';
      html.append($('<dt>').text(key)).append($('<dd>').text(val));
    }
    // create buttons
    html = this._jq.children('.buttons').empty();
    var btn;
    if (this._attrconf.sec.length > 0) {
      btn = new WDAT.ui.Button2(null, 'more', this._bus, this._expandHandler());
      html.append(btn.jq());
    }
    for ( var i in Container.ACTIONS) {
      var act = Container.ACTIONS[i];
      if (this._actions.hasOwnProperty(act)) {
        var click = this._actions[act];
        btn = new WDAT.ui.Button2(null, act + '_small', this._bus, click, this._data);
        html.append(btn.jq());
      }
    }
  };

  /* Refresh only the part of the container, that displays the children. In this 
   * implementation this is just an alias for refresh().
   * 
   * Return value:
   *    None
   */
  Container.prototype.refreshChildren = function() {
    this.refresh();
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
  Container.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>'
          + '<dl class="secondary hidden"></dl></div>';

  /* Possible actions */
  Container.ACTIONS = ['add', 'del', 'sel', 'edit'];

}());
