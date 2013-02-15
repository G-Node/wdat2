// ---------- file: list.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the class List. List implements view to a dynamic list. Elements can
   * be added, removed and selected. The list expects all elements to have at least
   * the attribute 'name'.
   *
   * Minimal list element:
   *   { name: <name> }
   *
   * Elements can be grouped in different categories. Internally the list is represented by
   * a table structure. This structure is created by the list view itself.
   *
   * @param id (String, Obj)      The id of the list or a jQuery object.
   * @param bus (Bus)             Bus handling events.
   * @param actions (Obj, Array)  Set of actions with their respective events or callbacks.
   * @param categories (Array)    Array of all categories / groups of the list (optional).
   *
   * Depends on: jQuery, WDAT.Bus, WDAT.Button, WDAT.MultiContainer, WDAT.Container
   */
  WDAT.List = List;
  inherit(List, WDAT.MultiContainer);
  function List(id, bus, actions, categories) {
    List.parent.constructor.call(this, id, bus, actions, 'wdat-list', '<div>');
    // categories
    this._categories = {};
    for (var i in categories) {
      var cat = categories[i].toLowerCase();
      this._categories[cat] = strCapitalizeWords(cat, /[_\-\ \.:]/);
    }
    // actions for container elements
    this._contActions = {};
    for ( var i in actions) {
      var act = actions[i];
      if (WDAT.Container.ACTIONS.indexOf(act) >= 0 && act != 'add') {
        this._contActions[act] = this._id + '-' + act;
      }
    }
    // apend self to dom
    this._jq.data(this);
    // refresh layout
    this.refresh();
  }

  /**
   * Add a new element to the list. If the element doesn't has id, a unique identifier
   * will be created.
   *
   * @param data (Obj)          The element to add to the list.
   * @param category (String)   The category (optional).
   *
   * @return The inserted element.
   */
  List.prototype.add = function(data, category) {
    var elem = List.parent.add.call(this, data, category);
    if (elem) {
      // create a container
      var id = this.toID(elem.id);
      var cont = new WDAT.Container($('<li>').attr('id', id), this._bus, this._contActions);
      cont.set(elem);
      // get the right category
      var cat = category || 'default';
      cat = cat.toLowerCase();
      if (this._categories[cat]) {
        // found a matching category
        cat = this._jq.find('#' + this.toID(category));
      } else {
        // no category found, create a new one
        var label = strCapitalizeWords(cat, /[_\-\ \.:]/);
        this._categories[cat] = label;
        var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
        html.attr('id', this.toID(cat));
        html.find('.category-name').text(label);
        // create add button if add event is present
        if (this._actions.add) {
          var b = new WDAT.Button(null, 'add_small', this._bus, this._actions.add, {
            name : label, id : cat});
          html.find('.category-name').before(b.jq());
        }
        // append everything
        this._jq.find('#' + this.toID('default')).before(html);
        cat = html;
      }
      // append container to the right category
      cat.append(cont.jq());
    }
    return elem;
  };

  /**
   * Add a new element to the list that is already wrapped into a container
   * TODO check call of parent add!
   *
   * @param cont (Container)   The element to add to the list.
   * @param category (String)  The category (optional).
   *
   * @return The inserted element.
   */
  List.prototype.addContainer = function(cont, category) {
    var data = cont.get();
    data = List.parent.add.call(this, data, category);
    if (data) {
      cont.jq().attr('id', this.toID(data));
      // get the right category
      var cat = undefined;
      if (category && category != 'default') {
        if (this._categories[category]) {
          // found a matching category
          cat = this._jq.find('#' + this.toID(category));
        } else {
          // no category found, create a new one
          cat = category.toLowerCase();
          var label = strCapitalizeWords(cat, /[_\-\ \.:]/);
          this._categories[cat] = label;
          var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
          html.attr('id', this.toID(cat));
          html.find('.category-name').text(label);
          // create add button if add event is present
          if (this._actions.add) {
            var b = new WDAT.Button(null, 'add_small', this._bus, this._actions.add, {
              name : label, id : cat});
            html.find('.category-name').before(b.jq());
          }
          // append everything
          this._jq.find('#' + this.toID('default')).before(html);
          cat = html;
        }
      } else {
        // no category specified, get default category
        cat = this._jq.find('#' + this.toID('default'));
      }
      // append container and return data object
      cat.append(cont.jq());
      return data;
    }
  };

  /**
   * Add new items to the list.
   *
   * @param datasets (Array)  The elements to add to the list.
   * @param category (String) The category (optional).
   *
   * @return The elements added to the list.
   */
  List.prototype.addAll = function(datasets, category) {
    var added = [];
    for ( var i in datasets) {
      var data = this.add(datasets[i], category);
      if (data) added.push(data);
    }
    return added;
  };

  /**
   * Update the content of an existing list element.
   *
   * @param data (Object)    The element to update.
   *
   * @return The updated element or null if no such element was found.
   */
  List.prototype.set = function(data, category) {
    if (this._data[data.id]) {
      var oldcat = this._data[data.id].position;
      var elem = List.parent.set.call(this, data, category);
      var newcat = this._data[data.id].position;
      if (elem) {
        var html = this._jq.find('#' + this.toID(elem));
        var cont = html.data();
        cont.set(elem);
        if (oldcat != newcat) {
          cont.detach();
          var cat;
          if (newcat && newcat != 'default') {
            cat = this._jq.find('#' + this.toID(newcat));
          } else {
            cat = this._jq.find('#' + this.toID('default'));
          }
          cat.append(cont.jq());
        }
      }
    }
  };

  /**
   * Remove an element from the list.
   *
   * @param data (String, Obj)    The element to remove or the id of this
   *                              element.
   *
   * @return The removed element or null if no such element was found.
   */
  List.prototype.del = function(data) {
    var deleted = List.parent.del.call(this, data);
    if (deleted) {
      var elem = this._jq.find('#' + this.toID(data));
      elem.remove();
      return true;
    }
  };

  /**
   * Select an element in the list. If the element is already selected
   * the selection will be removed (toggle).
   *
   * @param data (String, Obj)    The elements to select or the id of this
   *                              element.
   * @param single (Boolean)      Set to true if the selected element should be the
   *                              only selected element in the whole list.
   *
   * @return True if the element is now selected false otherwise.
   */
  List.prototype.select = function(data, single) {
    var selected = false;
    if (this.has(data)) {
      var html = this._jq.find('#' + this.toID(data));
      selected = html.is('.selected');
      if (single) {
        this._jq.find('.wdat-container').removeClass('selected');
      }
      html.toggleClass('selected', !selected);
      selected = !selected;
    }
    return selected;
  };


  /**
   * Refresh or create the whole content of the container.
   */
  List.prototype.refresh = function() {
    // remove all content
    this._jq.empty();
    // crate category representation
    for ( var i in this._categories) {
      var cat = i;
      var label = this._categories[i];
      var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
      html.attr('id', this.toID(cat));
      html.find('.category-name').text(label);
      // create add button if add event is present
      if (this._actions.add) {
        var b = new WDAT.Button(null, 'add_small', this._bus, this._actions.add, {name : label, id : cat});
        html.find('.category-name').before(b.jq());
      }
      // append everything
      this._jq.append(html);
    }
//    html = $('<ul><lh class="category"></lh></ul>');
//    html.attr('id', this.toID('default'));
//    if (this._actions.add) {
//      var b = new WDAT.Button(null, 'add_small', this._bus, this._actions.add, {name : 'Default', id : 'default'});
//      html.find('.category').append(b.jq());
//    }
//    this._jq.append(html);
    // add elements to list
    for (var i in this._data) {
      var elem = this._data[i].data;
      var category = this._data[i].position;
      // create a container
      var id = this.toID(elem.id);
      var cont = new WDAT.Container($('<li>').attr('id', id), this._bus, this._contActions);
      cont.set(elem);
      // get the right category
      if (category && category != 'default') {
        html = this._jq.find('#' + this.toID(category));
      } else {
        html = this._jq.find('#' + this.toID('default'));
      }
      // append container to the right category
      html.append(cont.jq());
    }
  };

  /**
   * Crates a default handler function for select events.
   *
   * @return A default handler.
   */
  List.prototype.selHandler = function() {
    var that = this;
    return function(event, data) {
      that.select(data, true);
    };
  };

  /**
   * Crates a default handler function for delete events.
   *
   * @return A default handler.
   */
  List.prototype.delHandler = function() {
    var that = this;
    return function(event, data) {
      that.del(data);
    };
  };

}());
