// ---------- file: list.js ---------- //

(function() {
  "use strict";

  /* Constructor for the class VList. VList implements view to a dynamic list. Elements can
   * be added, removed, edited and selected. The list expects all elements to have at least
   * the attribute 'name'.
   *
   * Minimal list element:
   *   { name: <name> }
   * Complete list element:
   *   { id: <id>,       // The elements id, must be unique in the whole list.
   *     name: <name>,   // The name of the element (string)
   *     info: <info>,   // Some additional information (string)
   *     data: <data> }  // Data that is only visible on expanded elements (string or jQuery)
   *
   * Elements can be grouped in different categories. Internally the list is represented by
   * a table structure. This structure is created by the list view itself.
   *
   * Parameters:
   *  - name: String, Obj.  The name of the list or a jQuery object.
   *
   *  - bus: EventBus       Bus handling events.
   *
   *  - events: Array       Array of event identifiers (optional).
   *
   *  - categories: Array   Array of all categories / groups of the list (optional).
   *
   * Depends on:
   *    jQuery, WDAT.api.EventBus, WDAT.ui.Button
   *
   * TODO Make list a Widget and remove unused Methods
   * TODO Use Container for list elements
   * TODO Make interface more similar to tree
   * TODO Update code documentation
   * TODO Cleanup CSS code
   */
  WDAT.ui.List = List;
  inherit(List, WDAT.ui.Widget);
  function List(id, bus, actions, categories) {
    List.parent.constructor.call(this, id, '<div>', 'wdat-list');
    this._bus = bus;
    // actions and events
    this._actions = {}
    for ( var i in actions) {
      this._actions[actions[i]] = this._id + '-' + actions[i];
    }
    this._buttonactions = {}
    for (var i in actions) {
      var act = actions[i];
      if (WDAT.ui.Container.ACTIONS.indexOf(act) >= 0 && act != 'add') {
        this._buttonactions[act] = this._id + '-' + act;
      }
    }
    // create list structure
    this._categories = {};
    if (categories) {
      for ( var i in categories) {
        var cat = categories[i];
        var tab = $('<ul><lh class="list-cat"><span class="list-cat-name"></span>'
                  + '<span class="list-cat-btn"></span></lh></ul>');
        tab.attr('id', this.toID(cat));
        tab.find('.list-cat-name').first().append(cat);
        this._jq.append(tab);
        this._categories[cat] = tab;
        // create add button if add event is present
        if (this._actions.add) {
          // TODO use jquery ui button here
          var b = new WDAT.ui.Button('add-small', this._bus,
                  this._actions.add, null, {name : cat,id : cat});
          tab.find('.list-cat-btn').first().append(b.toJQ());
        }
      }
    }
    tab = $('<ul></ul>');
    tab.attr('id', this._id + '-default');
    this._jq.append(tab);
    this._categories['default'] = tab;
  }

  /* Add a new element to the list. If the element doesn't has id, a unique identifier
   * will be created.
   *
   * Parameter:
   *  - element: Object    The element to add to the list.
   *
   *  - category: String   The category (optional).
   *
   *  - position: Number   The elements position (optional). If a category is given
   *                       this is the position inside this category.
   *                       TODO implement inserts at a position.
   *
   * Return value:
   *    The inserted element.
   */
  List.prototype.add = function(data, category) {
    if (!this.has(data)) {
      // crate an id if necessary
      if (!data.id)
        data.id = this._bus.uid();
      var id = this.toID(data);
      // Create a new Container
      var prim = _getPrimary(data);     // primary container attributes
      var sec  = _getSecondary(data);   // secondary container attributes
      var cont = new WDAT.ui.Container(id, this._bus, data, prim, sec, this._buttonactions);
      // add the container to the list
      var cat = this._categories[category] || this._categories['default'];
      cat.append(cont.jq());
    } else {
      this.update(data);
    }
    return data;
  };

  /* Add new items to the list.
   *
   * Parameter:
   *  - elements: Array    The elements to add to the list.
   *
   *  - category: String   The category (optional).
   *
   *  - position: Number   The elements position (optional). If a category is given
   *                       this is the position inside this category.
   *                       TODO implement inserts at a position.
   *
   * Return value:
   *    The elements added to the list.
   */
  List.prototype.addAll = function(datasets, category) {
    // select category
    var cat = this._categories[category] || this._categories['default'];
    // iterate over elements
    var id, prim, sec, cont;
    for (var data in datasets) {
      if (!this.has(data)) {
        // crate an id if necessary
        if (!data.id)
          data.id = this._bus.uid();
        id = this.toID(data);
        // Create a new Container
        prim = _getPrimary(data);     // primary container attributes
        sec  = _getSecondary(data);   // secondary container attributes
        cont = new WDAT.ui.Container(id, this._bus, data, prim, sec, this._buttonactions);
        // add the container to the list
        cat.append(cont.jq());
      } else {
        this.update(data);
      }
    }
    return datasets;
  };

  /* Update the content of an existing list element.
   *
   * Parameter:
   *  - element: Object    The element to update.
   *
   * Return value:
   *   None
   */
  List.prototype.update = function(data) {
    var elem = this._jq.find('#' + this.toID(data));
    if (elem.length > 0) {
      var cont = elem.data();
      cont.data(data);
      return data;
    } else {
      return null;
    }
  };

  /* Remove an element from the list.
   *
   * Parameter:
   *  - element: String, Obj.  The elements to remove or the id of this
   *                           element.
   *
   *  - category: String       The category containing the element to remove.
   *
   * Return value:
   *   None
   */
  List.prototype.remove = function(data) {
    var elem = this._jq.find('#' + this.toID(data));
    if (elem.length > 0) {
      data = elem.data().data();
      elem.remove();
      return data;
    } else {
      return null;
    }
  };

  /* Select an element in the list. If the element is already selected
   * the selection will be removed (toggle).
   *
   * Parameter:
   *  - data: String, Obj.     The elements to select or the id of this
   *                           element.
   *
   *  - single: Bool           Set to true if the selected element should be the
   *                           only selected element in the whole list.
   *
   * Return value:
   *    True if the element is now selected false otherwise.
   */
  List.prototype.select = function(data, single) {
    var selected = false;
    var elem = this._jq.find('#' + this.toID(data));
    if (elem.length > 0) {
      selected = elem.is('.selected');
      if (single) {
        this._jq.children('.wdat-container').removeClass('selected');
      }
      elem.toggleClass('selected', !selected);
      selected = !selected;
    }
    return selected;
  };

  /* Remove all elements from the list without removing the categories.
   */
  List.prototype.clear = function() {
    this._jq.children('.wdat-container').remove();
  };

  /* Returns the event used for a specific action.
   *
   * Parameter:
   *  - action: String      The action.
   *
   * Return value:
   *    The event name, that is used for a specific action or null if no event
   *    was specified.
   */
  List.prototype.event = function(action) {
    var e = this._actions[action];
    if (typeof e === 'function')
      return null;
    else
      return e;
  };

  /* Checks if a ´n element is present */
  List.prototype.has = function(data) {
    return (data.id && this._jq.find('#' + this.toID(data.id)).length > 0);
  };

  /* Crates a default handler function for select events.
   *
   * Return value:
   *   A default handler.
   */
  List.prototype.selectHandler = function() {
    var that = this;
    return function(event, data) {
        that.select(data);
    };
  };

  /* Crates a default handler function for delete events.
   *
   * Return value:
   *   A default handler.
   */
  List.prototype.removeHandler = function() {
    var that = this;
    return function(event, data) {
        that.remove(data);
    };
  };

  /* Helper that determines the primary attributes for
   * a continer used as a list element.
   */
  function _getPrimary(data) {
    return ['name'];
  }

  /* Helper that determines the secondary attributes for
   * a continer used as a list element.
   */
  function _getSecondary(data) {
    var secondary = [];
    if (data.hasOwnProperty('fields')) {
      for (var i in data.fields) {
        if (i !== 'name' && data.fields.hasOwnProperty(i)) {
          secondary.push(i);
        }
      }
    }
    if (data.hasOwnProperty('date_created')) {
      secondary.push('date_created');
    }
    if (data.hasOwnProperty('safety_level')) {
      secondary.push('safety_level');
    }
    return secondary;
  }

}());

