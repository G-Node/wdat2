// ---------- file: base.js ---------- //

/* IMPORTANT!
 * This file contains some base classes for other UI elements. Please make sure that
 * this file is included in all tests and production files before the definition of
 * other classes in the WDAT name space.
 */

(function() {
  'use strict';

  //-------------------------------------------------------------------------------------
  // Class: Widget
  //-------------------------------------------------------------------------------------

  /**
   * This is a base class for all kinds of UI elements. Each widget has a property _jq
   * that represents a jQuery object that refers to the HTML element that represents the
   * widget. Further more a widget has an id that can be used to select the widget.
   * A key feature of a Widget is the facht that it adds itself to ists own jQuery
   * object (widget.jq().data() === widget).
   *
   * @param id (String, jQuery)     An id or and jQuery object, that defines the widget.
   * @param template (String)       HTML code that is used to instantiate the structure
   *                                of the widget (optional).
   * @param clazz (String)          The class that is added to HTML representation of
   *                                the widget (optional).
   *
   * Depends on: jQuery
   */
  WDAT.Widget = Widget;
  WDAT.ui.Widget = Widget; // FIXME remove this after refactoring
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

  /**
   * Get the id of the widget.
   *
   * @returns The id of the widget.
   */
  Widget.prototype.id = function() {
    return this._id;
  };

  /**
   * Returns the jQuery object that represents the widget.
   * Use this method to add the widget to the DOM tree.
   *
   * @returns The jQuery object that represents the widget
   */
  Widget.prototype.jq = function() {
    return this._jq;
  };

  /**
   * Generates an ID within the name space of the widget. This ID should be used
   * in order to avoid multiple identical IDs in one HTML document.
   *
   * @param data (String, Obj)    Id string or an object with the property 'id'.
   * @param suffix (String)       Suffix, that will be appended to the id.
   *
   * @returns The generated id string
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

  /**
   * Remove the widget from the DOM tree (side effect).
   * Don't reatach the wiget after calling this method.
   *
   * FIXME name collides with method in Tree and List!!
   */
  Widget.prototype.remove = function() {
    this._jq.remove();
  };

  /**
   * Detach the widget from the DOM tree (side effect).
   */
  Widget.prototype.detach = function() {
    this._jq.detach();
  };

  //-------------------------------------------------------------------------------------
  // Class: Container
  //-------------------------------------------------------------------------------------

  // TODO refresh methods: provide a more generic way to display elements using WDAT.model

  /**
   * A container element, that displays objects returned by the DataAPI. The container
   * distinguishes between primary and secondary attributes. Primary attributes of
   * the presented object are shown permanently whereas secondary attributes are only visible
   * when the container is expanded.
   * Primary and secondary attributes can be configured using the setAttr() method or the
   * attrconf parameter of the constructor.
   *
   * @param id (String, Obj)        String or jQuery object that represents the container.
   * @param bus (Bus)               Bus for handling events.
   * @param actions (Obj, Array)    Definitions of all actions.
   * @param clazz (String)          Class used for the containers HTML representation.
   * @param template (String)       Template for the container. If a custom template is used
   *                                the refresh method has to be overridden.
   * @param empty (String)          Content displayed in empty containers.
   * @param attrconf (Obj)          Definition of primary and secondary attributes.
   *
   * Depends on: WDAT.Bus, WDAT.Widget, WDAT.Button, jQuery, jQuery-UI button
   */
  WDAT.Container = Container;
  inherit(Container, WDAT.Widget);
  function Container(id, bus, actions, clazz, template, empty, attrconf) {
    // prepare container structure
    var tmpl = template || Container.TEMPLATE;
    Container.parent.constructor.call(this, id, tmpl, 'wdat-container');
    if (clazz)
      this._jq.addClass(clazz);
    this._empty = empty || "No data selected";
    // set attributes
    this._bus = bus;
    this._data = null;
    // prepare actions
    this._actions = {};
    if (actions) {
      if (actions instanceof Array) {
        for ( var i in actions) {
          var act = actions[i];
          this._actions[act] = this.toID(act);
        }
      } else if (typeof actions === 'object') {
        for ( var i in actions) {
          this._actions[i] = actions[i];
        }
      }
    }
    // prepare attrconf
    this._attrconf = {};
    if (attrconf) {
      for ( var i in attrconf) {
        if (i === 'prim')
          this._attrconf[i] = attrconf[i] || ['name'];
        else
          this._attrconf[i] = attrconf[i];
      }
    } else {
      this._attrconf = {prim : ['name']};
    }
    // add this to html container
    this._jq.data(this);
  }

  /**
   * Set the data object of the container.
   *
   * @param data (Obj)       The data object of the container.
   *
   * @returns The data object
   */
  Container.prototype.set = function(data) {
    this._data = data;
    this.refresh();
  };

  /**
   * Get the main data object of the container.
   *
   * @returns The main data object of the container.
   */
  Container.prototype.get = function() {
    return this._data;
  };

  /**
   * Clear the container content and refresh it.
   */
  Container.prototype.clear = function() {
    this._data = null;
    this.refresh();
  };

  /**
   * Get the event for a specific action.
   *
   * @param action (String)    The action name.
   *
   * @returns The event for the specific action or undefined.
   */
  Container.prototype.event = function(action) {
    var act = this._actions[action];
    if (act && typeof action !== 'function')
      return act;
  };

  /**
   * Configure the primary or secondary attributes for the main data object or
   * its children.
   *
   * @param type (String)     The type of attributes ('prim', 'sec', 'child_prim'
   *                          or 'child_sec').
   * @param attrlist (Array)  Array with attributes that replaces the existing list
   *                          of attributes.
   */
  Container.prototype.attrconf = function(type, attrlist) {
    if (attrlist)
      this._attrconf[type] = attrlist;
    return this._attrconf[type] || [];
  };

  /**
   * Refresh or create the whole content of the container.
   */
  Container.prototype.refresh = function() {
    // create primary content
    var html = this._jq.children('.primary').empty();
    var count = 0;
    var attrconf = this._genAttrconf();
    for ( var i in attrconf.prim) {
      var val = objGetRecursive(this._data, attrconf.prim[i]);
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
    for ( var i in attrconf.sec) {
      var key = attrconf.sec[i];
      var val = objGetRecursive(this._data, key) || 'n.a.';
      key = strCapitalizeWords(key, /[_\-\ \.:]/) + ':';
      html.append($('<dt>').text(key)).append($('<dd>').text(val));
    }
    // create buttons
    html = this._jq.children('.buttons').empty();
    var btn;
    if (attrconf.sec.length > 0) {
      btn = new WDAT.Button(null, 'more', this._bus, this._expandHandler());
      html.append(btn.jq());
    }
    for ( var i in Container.ACTIONS) {
      var act = Container.ACTIONS[i];
      if (this._actions.hasOwnProperty(act)) {
        var click = this._actions[act];
        btn = new WDAT.Button(null, act + '_small', this._bus, click, this._data);
        html.append(btn.jq());
      }
    }
  };

  /**
   * Generates a attrconf.
   */
  Container.prototype._genAttrconf = function() {
    var data = this._data;
    var attrconf = {};
    if (this._attrconf.prim && this._attrconf.prim.length > 0) {
      attrconf.prim = this._attrconf.prim;
    } else {
      attrconf.prim = ['name'];
    }
    if (this._attrconf.sec) {
      attrconf.sec = this._attrconf.sec;
    } else {
      attrconf.sec = [];
      var fields = modFields(data.type);
      if (fields) {
        for (var i in fields) {
          attrconf.sec.push(i);
        }
      } else {
        for (var i in data) {
          attrconf.sec.push(i);
        }
      }
    }
    return attrconf;
  };

  /**
   * Returns a handler for expand events (for internal use only)
   */
  Container.prototype._expandHandler = function() {
    var that = this;
    return function() {
      var sec = that._jq.children('.secondary');
      sec.toggleClass('hidden');
    };
  };

  /**
   * HTML template for container
   */
  Container.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                       '<dl class="secondary hidden"></dl></div>';

  /**
   * Possible container actions.
   */
  Container.ACTIONS = ['add', 'del', 'sel', 'edit'];

  //-------------------------------------------------------------------------------------
  // Class: ParentContainer
  //-------------------------------------------------------------------------------------

  /**
   * A container element, that displays objects returned by the DataAPI. The container
   * stores a main data object (parent) as well as a set of children.
   *
   * @param id (String, Obj)        String or jQuery object that represents the container.
   * @param bus (Bus)               Bus for handling events.
   * @param actions (Obj, Array)    Definitions of all actions.
   * @param clazz (String)          Class used for the containers HTML representation.
   * @param template (String)       Template for the container. If a custom template is used
   *                                the refresh method has to be overridden.
   * @param empty (String)          Content displayed in empty containers.
   * @param attrconf (Obj)          Definition of primary and secondary attributes.
   *
   * Depends on: WDAT.Bus, WDAT.Container, WDAT.Button, jQuery, jQuery-UI button
   */
  WDAT.ParentContainer = ParentContainer;
  inherit(ParentContainer, WDAT.Container);
  function ParentContainer(id, bus, actions, clazz, template, empty, attrconf) {
    // prepare container structure
    var tmpl = template || ParentContainer.TEMPLATE;
    ParentContainer.parent.constructor.call(id, bus, actions, clazz, tmpl, empty, attrconf);
    // array with children
    this._children = [];
    // add this to html container
    this._jq.data(this);
  }

  /**
   * Set child objects for the data object represented by the container.
   * If the data parameter is an Array, all children will be replaced by
   * the objects contained in data. If data is an Object the object repaces
   * all existing children.
   *
   * @params data (Array, Obj)     Child objects of the main data object represented by
   *                               the container.
   */
  ParentContainer.prototype.setChildren = function(data) {
    delete this._children;
    if (data instanceof Array) {
      this._children = data;
    } else {
      this._children = [data];
    }
    this.refreshChildren();
  };

  /**
   * Get the child objects of the main data object of the container.
   *
   * @return All children of the main data object.
   */
  ParentContainer.prototype.getChildren = function(data) {
    return this._children;
  };

  /**
   * Get a specific child.
   *
   * @param data (String, Obj)    The id of the child or an object with an attribut 'id'.
   *
   * @return The found child or undefined if nothig was found.
   */
  ParentContainer.prototype.getChild = function(data) {
    var id = data.id || data;
    var result = undefined;
    for (var i in this._children) {
      var child = this._children[i];
      if (child.id == id) {
        result = child;
        break;
      }
    }
    return result;
  };

  /**
   * Update an existing child.
   *
   * @param data (Obj)    The child element to set.
   *
   * @return True if an element was updated, false otherwise.
   */
  ParentContainer.prototype.setChild = function(data) {
    if (data.id) {
      for (var i in this._children) {
        var child = this._children[i];
        if (child.id == data.id) {
          this._children[i] = data;
          return true;
        }
      }
    }
  };

  /**
   * Add a new child to the list of existing children.
   *
   * @param data (Obj)
   *
   * @returns The added child or udefined if nothing was added.
   */
  ParentContainer.prototype.addChild = function(data) {
    if (!data.id) data.id = this._bus.uid();
    var exists = false;
    for (var i in this._children) {
      var child = this._children[i];
      if (child.id == data.id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      this._children.push(data);
      return true;
    }
  };

  /**
   * Refresh or create the whole content of the container.
   */
  ParentContainer.prototype.refresh = function() {
    ParentContainer.parent.refresh.call(this);
    this.refreshChildren();
  };

  /**
   * Refresh only the part of the container, that displays the children. In this
   * implementation it just does noting.
   */
  ParentContainer.prototype.refreshChildren = function() {
    // nothing to do
  };

  ParentContainer.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                             '<dl class="secondary hidden"></dl></div>';

  //-------------------------------------------------------------------------------------
  // Class: MultiContainer
  //-------------------------------------------------------------------------------------

  /**
   * A container that holds multiple elements.
   *
   * @param id (String, Obj)      String or jQuery object that represents the container.
   * @param bus (Bus)             Bus for handling events.
   * @param actions (Obj., Array) Definitions of all actions.
   * @param clazz (String)        Class used for the containers HTML representation.
   * @param template (String)     Template for the container. If a custom template is used
   *                             the refresh method has to be overridden.
   *
   * Depends on: WDAT.Bus, WDAT.Widget
   */
  WDAT.MultiContainer = MultiContainer;
  inherit(MultiContainer, WDAT.Widget);
  function MultiContainer(id, bus, actions, clazz, template) {
    // prepare container structure
    var tmpl = template || Container.TEMPLATE;
    MultiContainer.parent.constructor.call(this, id, tmpl, 'wdat-container');
    if (clazz)
      this._jq.addClass(clazz);
    // set attributes
    this._bus = bus;
    this._data = {};
    // prepare actions
    this._actions = {};
    if (actions) {
      if (actions instanceof Array) {
        for ( var i in actions) {
          var act = actions[i];
          this._actions[act] = this.toID(act);
        }
      } else if (typeof actions === 'object') {
        for ( var i in actions) {
          this._actions[i] = actions[i];
        }
      }
    }
    // add this to html container
    this._jq.data(this);
  }

  /**
   * Add a new element to the container.
   *
   * @param data (Obj.)     The data object to add.
   * @param position        The position where to add the element.
   *
   * @returns The added object or null if nothing was added.
   */
  MultiContainer.prototype.add = function(data, position) {
    if (!data.id)
      data.id = this._bus.uid();
    if (!this.has(data)) {
      this._data[data.id] = {data : data, position : position};
      return data;
    }
  };

  /**
   * Update an existing element of the container.
   *
   * @param data (Obj.)     The data object to update.
   * @param position        The position of the element (optional).
   *
   * @returns The updated element or null if no such element was found.
   */
  MultiContainer.prototype.set = function(data, position) {
    if (this.has(data)) {
      var pos = position || this._data[data.id].position;
      this._data[data.id] = {data : data, position : pos};
      return data;
    }
  };

  /**
   * Get an existing element by its id.
   *
   * @param data (String)     The id of the element to get.
   *
   * @returns The element matching the id or undefined.
   */
  MultiContainer.prototype.get = function(data) {
    if (data) {
      var id = data.id || data;
      if (this._data.hasOwnProperty(id)) {
        return this._data[id].data;
      }
    }
  };

  /**
   * Check if an element is in the container.
   *
   * @param data (Obj., String) The element to check or the id of this element.
   *
   * @returns True if the element exists, false otherwise.
   */
  MultiContainer.prototype.has = function(data) {
    if (data) {
      var id = data.id || data;
      return (id && this._data.hasOwnProperty(id));
    }
  };

  /**
   * Clear the container and refresh its content.
   */
  MultiContainer.prototype.clear = function() {
    delete this._data;
    this._data = {};
    this.refresh();
  };

  /**
   * Delete an element from the container.
   *
   * @param data (Obj., String) The element to delete or the id of this element.
   *
   * @returns True if the element was deleted, false otherwise.
   */
  MultiContainer.prototype.del = function(data) {
    var id = data.id || data;
    if (this.has(id)) {
      delete this._data[id];
      return true;
    }
  };

  /**
   * Get the event for a specific action.
   *
   * @param action (String)    The action name.
   *
   * @returns The event for the specific action or undefined.
   */
  MultiContainer.prototype.event = function(action) {
    var act = this._actions[action];
    if (act && typeof action !== 'function')
      return act;
  };

  /**
   * Refresh the representation of the content. In this case the implementation is
   * empty.
   */
  MultiContainer.prototype.refresh = function() {
    // nothing to do
  };

}());
