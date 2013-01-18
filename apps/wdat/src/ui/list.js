// ---------- file: list.js ---------- //

(function() {
  "use strict";

  /* Constructor for the class List. List implements view to a dynamic list. Elements can
   * be added, removed and selected. The list expects all elements to have at least
   * the attribute 'name'.
   *
   * Minimal list element:
   *   { name: <name> }
   *
   * Elements can be grouped in different categories. Internally the list is represented by
   * a table structure. This structure is created by the list view itself.
   *
   * Parameters:
   *  - id: String, Obj.    The id of the list or a jQuery object.
   *
   *  - bus: EventBus       Bus handling events.
   *
   *  - events: Obj.        Set of actions with their respective events or callbacks.
   *
   *  - categories: Array   Array of all categories / groups of the list (optional).
   *
   * Depends on:
   *    jQuery, WDAT.api.EventBus, WDAT.ui.Button, WDAT.ui.Widget, WDAT.ui.Container
   */
  WDAT.ui.List = List;
  inherit(List, WDAT.ui.Widget);
  function List(id, bus, actions, categories) {
    List.parent.constructor.call(this, id, '<div>', 'wdat-list');
    this._bus = bus;
    // actions and events
    this._actions = {};
    for ( var i in actions) {
      this._actions[actions[i]] = this._id + '-' + actions[i];
    }
    this._buttonactions = {};
    for ( var i in actions) {
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
        var tab = $('<ul><lh class="category"><span class="category-name"></span></lh></ul>');
        tab.attr('id', this.toID(cat));
        tab.find('.category-name').text(cat);
        this._jq.append(tab);
        this._categories[cat] = tab;
        // create add button if add event is present
        if (this._actions.add) {
          var b = new WDAT.ui.Button2(null, 'add_small', this._bus, this._actions.add, {
            name : cat, id : cat});
          tab.find('.category').first().append(b.jq());
        }
      }
    }
    tab = $('<ul></ul>');
    tab.attr('id', this._id + '-default');
    this._jq.append(tab);
    this._categories['default'] = tab;
    // configure container attributes
    this._attrconf = {};
  }

  /* Add a new element to the list. If the element doesn't has id, a unique identifier
   * will be created.
   *
   * Parameter:
   *  - data: Object       The element to add to the list.
   *
   *  - category: String   The category (optional).
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
      var attr = {prim : _getPrimary(data), sec : _getSecondary(data)};
      var cont = new WDAT.ui.Container(id, this._bus, this._buttonactions, attr);
      cont.set(data);
      // add the container to the list
      var cat = this._categories[category] || this._categories['default'];
      cat.append(cont.jq());
    } else {
      this.update(data);
    }
    return data;
  };

  /* Add a new element to the list. 
   * TODO documentation
   *
   * Parameter:
   *  - cont: Container     The element to add to the list.
   *
   *  - category: String    The category (optional).
   *                        TODO implement inserts at a position.
   *
   * Return value:
   *    The inserted element.
   */
  List.prototype.addContainer = function(cont, category) {
    var data = cont.get();
    if (!this.has(data)) {
      // generate id if necessary
      if (!data.id) {
        data.id = this._bus.uid();
        cont.set();
      }
      cont.jq().attr('id', this.toID(data));
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
   *  - datasets: Array    The elements to add to the list.
   *
   *  - category: String   The category (optional).
   *                       TODO implement inserts at a position.
   *
   * Return value:
   *    The elements added to the list.
   */
  List.prototype.addAll = function(datasets, category) {
    // select category
    var cat = this._categories[category] || this._categories['default'];
    // iterate over elements
    var id;
    for ( var data in datasets) {
      data = datasets[data];
      if (!this.has(data)) {
        // crate an id if necessary
        if (!data.id)
          data.id = this._bus.uid();
        id = this.toID(data);
        var attr = {prim : _getPrimary(data), sec : _getSecondary(data)};
        var cont = new WDAT.ui.Container(id, this._bus, this._buttonactions, attr);
        cont.set(data);
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
   *  - data: Object    The element to update.
   *
   * Return value:
   *   The updated element or null if no such element was found.
   */
  List.prototype.update = function(data) {
    var elem = this._jq.find('#' + this.toID(data));
    if (elem.length > 0) {
      var cont = elem.data();
      cont.set(data);
      return data;
    }
  };

  /* Remove an element from the list.
   *
   * Parameter:
   *  - data: String, Obj.     The element to remove or the id of this
   *                           element.
   *
   * Return value:
   *   The removed element or null if no such element was found.
   */
  List.prototype.remove = function(data) {
    var elem = this._jq.find('#' + this.toID(data));
    if (elem.length > 0) {
      var d = elem.data().get();
      elem.remove();
      return d;
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
        this._jq.find('.wdat-container').removeClass('selected');
      }
      elem.toggleClass('selected', !selected);
      selected = !selected;
    }
    return selected;
  };

  /* Remove all elements from the list without removing the categories.
   *
   * Return value:
   *    None
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
    if (typeof e != 'function')
      return e;
  };

  /* Checks if an element is present
   *
   * Parameter:
   *  - data: String, Obj.     The element to check or its id.
   *
   * Return value:
   *   True if the element is present, false otherwise.
   */
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
      that.select(data, true);
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
   * a continer used as a list element. For internal use only.
   */
  function _getPrimary(data) {
    return ['name'];
  }

  /* Helper that determines the secondary attributes for
   * a continer used as a list element. For internal use only.
   */
  function _getSecondary(data) {
    var secondary = [];
    if (data.hasOwnProperty('fields')) {
      for ( var i in data.fields) {
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
