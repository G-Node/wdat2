// ---------- file: list.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) {
  window.WDAT = {};
}
if (!window.WDAT.api) {
  window.WDAT.api = {};
}

/*
 * Constructor for the class VList. VList implements view to a dynamic list.
 * Elements can be added, removed, edited and selected. The list expects all
 * elements to have at least the attribute 'name'.
 * 
 * Minimal list element: { name: <name> } Complete list element: { id: <id>, //
 * The elements id, must be unique in the whole list. name: <name>, // The name
 * of the element (string) info: <info>, // Some additional information (string)
 * data: <data> } // Data that is only visible on expanded elements (string or
 * jQuery)
 * 
 * Elements can be grouped in different categories. Internally the list is
 * represented by a table structure. This structure is created by the list view
 * itself.
 * 
 * Parameters: - name: String, Obj. The name of the list or a jQuery object.
 *  - bus: EventBus Bus handling events.
 *  - events: Array Array of event identifiers (optional).
 *  - categories: Array Array of all categories / groups of the list (optional).
 * 
 * Depends on: jQuery, WDAT.util.EventBus, WDAT.api.Button
 */
WDAT.api.VList = function(name, bus, events, categories) {
  if (typeof name === 'string') { // name is a string
    this._list = $('<div class="list"></div>').attr('id', name);
    this.name = name;
  } else if (typeof name === 'object') { // name is a jquery object
    this._list = name;
    this._list.addClass('list')
    this.name = name.attr('id');
  }
  this.bus = bus;
  // create event identifier
  this.events = {}
  for ( var i in events) {
    this.events[events[i]] = this.name + '-' + events[i];
  }
  // create list structure
  this.categories = {};
  if (categories) {
    for ( var i in categories) {
      var cat = categories[i];
      var tab = $('<table><tr class="list-cat"><th class="list-cat-name"></th>'
              + '<th class="list-cat-btn"></th></tr></table>');
      tab.attr('id', this.name + '-' + cat);
      tab.find('.list-cat-name').first().append(cat);
      this._list.append(tab);
      this.categories[cat] = tab;
      // create add button if add event is present
      if (this.events.add) {
        var b = new WDAT.api.Button('add', this.bus, this.events.add, {
          name : cat,
          id : cat
        });
        tab.find('.list-cat-btn').first().append(b.toJQ());
      }
    }
  }
  tab = $('<table></table>');
  tab.attr('id', this.name + '-default');
  this._list.append(tab);
  this.categories['default'] = tab;
};

// Define the methods of in their own scope
(function() {
  // Private template for new list elements
  ELEM_TMPL = '<tr class="list-elem">'
          + '<td><span class="list-elem-name"></span><span class="list-elem-info"></span>'
          + '<div class="list-elem-data hidden"></div></td>'
          + '<td class="list-elem-btn"></td></tr>';

  // method definition

  /*
   * Add a new element to the list. If the element doesn't has id, a unique
   * identifier will be created.
   * 
   * Parameter: - element: Object The element to add to the list. TODO handle id
   * conflicts.
   *  - category: String The category (optional).
   *  - position: Number The elements position (optional). If a category is
   * given this is the position inside this category. TODO implement inserts at
   * a position.
   * 
   * Return value: The inserted element.
   */
  WDAT.api.VList.prototype.add = function(element, category, position) {
    // crate an id if necessary
    if (!element.id)
      element.id = this.bus.uid();
    var id = this._toId(element);
    // Create a new representation of the element e
    var elem = $(ELEM_TMPL);
    elem.attr('id', id);
    elem.find('.list-elem-name').first().text(element.name);
    if (element.info)
      elem.find('.list-elem-info').first().text(element.info);
    if (element.data)
      elem.find('.list-elem-data').first().append(element.data);
    // add buttons
    elem.find('.list-elem-btn').first().append(this._buttons(element))
    // Add element e to the list
    if (category && this.categories[category]) {
      this.categories[category].append(elem);
    } else {
      this.categories['default'].append(elem);
    }
    return element;
  };

  /*
   * Add new items to the list.
   * 
   * Parameter: - elements: Array The elements to add to the list.
   *  - category: String The category (optional).
   *  - position: Number The elements position (optional). If a category is
   * given this is the position inside this category. TODO implement inserts at
   * a position.
   * 
   * Return value: The elements added to the list.
   */
  WDAT.api.VList.prototype.addAll = function(elements, category, position) {
    // select category
    if (category && this.categories[category])
      category = this.categories[category];
    else
      category = categories['default'];
    // iterate over elements
    for ( var i in elements) {
      var element = elements[i];
      // crate an id if necessary
      if (!element.id)
        element.id = this.bus.uid();
      var id = this._toId(element);
      // Create a new representation of the element e
      var elem = $(ELEM_TMPL);
      elem.attr('id', id);
      elem.find('.list-elem-name').first().text(element.name);
      if (element.info)
        elem.find('.list-elem-info').first().text(element.info);
      if (element.data)
        elem.find('.list-elem-data').first().append(element.data);
      // add buttons
      elem.find('.list-elem-btn').first().append(this._buttons(element))
      // Add element e to the category
      category.append(elem)
    }
    return elements;
  };

  /*
   * Update the content of an existing list element.
   * 
   * Parameter: - element: Object The element to update.
   *  - category: String The category containing the element to update.
   * 
   * Return value: None
   */
  WDAT.api.VList.prototype.update = function(element, category) {
    var tab;
    // get category if present
    if (category && this.categories[category])
      tab = this.categories[category];
    else
      tab = this._list;
    // get the element and do update
    var e = tab.find('#' + this._toId(element)).first();
    if (element.name)
      e.find('.list-elem-name').first().text(element.name);
    if (element.info)
      e.find('.list-elem-info').first().text(element.info);
    if (element.data)
      e.find('.list-elem-data').empty().append(element.data);
  };

  /*
   * Edit the name of an existing list element.
   * 
   * Parameter: - element: String, Obj. The elements to edit or the id of this
   * element.
   *  - category: String The category containing the element to edit.
   * 
   * Return value: None
   */
  WDAT.api.VList.prototype.edit = function(element, category) {
    // find element by id
    var elem = $('#' + this._toId(element));
    // save old element
    var oldelem = elem.find('td').first();
    var oldname = elem.find('.list-elem-name').first();
    oldelem.detach();
    var buttons = elem.find('td').last();
    buttons.detach();
    // create input and replace old content
    var input = $('<input />').attr('type', 'text').attr('value', oldname.text());
    elem.append($('<td />').append(input)).append($('<td />'));
    input.focus().select();
    // listen on key events
    input.keyup(function(e) {
      if (e.keyCode == 13) {
        // ENTER: submit changes
        var newname = input.val();
        oldname.text(newname);
        elem.empty().append(oldelem);
        elem.append(buttons);
      }
      if (e.keyCode == 27) {
        // ESC: restore old text
        elem.empty().append(oldelem);
        elem.append(buttons);
      }
    });
  };

  /*
   * Remove an element from the list.
   * 
   * Parameter: - element: String, Obj. The elements to remove or the id of this
   * element.
   *  - category: String The category containing the element to remove.
   * 
   * Return value: None
   */
  WDAT.api.VList.prototype.remove = function(element, category) {
    var tab;
    // get category if present
    if (category && this.categories[category])
      tab = this.categories[category];
    else
      tab = this._list;
    // get the element to remove
    tab.find('#' + this._toId(element)).first().remove();
  };

  /*
   * Select an element in the list. If the element is already selected the
   * selection will be removed (toggle).
   * 
   * Parameter: - element: String, Obj. The elements to select or the id of this
   * element.
   *  - category: String The category containing the element to select.
   *  - single: Bool Set to true if the selected element should be the only
   * selected element in the whole list.
   * 
   * Return value: True if the element is now selected false otherwise.
   */
  WDAT.api.VList.prototype.select = function(element, category, single) {
    var tab = this._list;
    // set tab category if present
    if (category && this.categories[category])
      tab = this.categories[category];
    // get element and toggle selected
    var elem = tab.find('#' + this._toId(element));
    var selected = elem.is('.selected');
    if (single) {
      this._list.find('.list-elem').each(function() {
        $(this).removeClass('selected');
      });
    }
    elem.toggleClass('selected', !selected);
    return !selected;
  };

  /*
   * Expand an element in the list. If the element is already expanded it will
   * be collapsed again.
   * 
   * Parameter: - element: String, Obj. The elements to expand or the id of this
   * element.
   *  - category: String The category containing the element to expand.
   *  - single: Bool Set to true if the expanded element should be the only
   * expanded element in the whole list.
   * 
   * Return value: True if the element is now expanded false otherwise.
   */
  WDAT.api.VList.prototype.expand = function(element, category, single) {
    var tab = this._list;
    // set tab category if present
    if (category && this.categories[category])
      tab = this.categories[category];
    // get element and toggle hidden
    var elem = tab.find('#' + this._toId(element) + ' .list-elem-data');
    var hidden = elem.is('.hidden');
    if (single) {
      this._list.find('.list-elem-data').each(function() {
        $(this).addClass('hidden');
      });
    }
    elem.toggleClass('hidden', !hidden);
    return hidden;
  };

  /*
   * Remove all elements from the list without removing the categories.
   */
  WDAT.api.VList.prototype.clear = function() {
    this._list.find('.list-elem').each(function() {
      $(this).remove();
    });
  };

  /*
   * Returns the list as a jQuery object. Use this method to include the list
   * into your document.
   * 
   * Return value: The list (jQuery)
   */
  WDAT.api.VList.prototype.toJQ = function() {
    return this._list;
  };

  /*
   * Crates a default handler function for select events.
   * 
   * Return value: A default handler.
   */
  WDAT.api.VList.prototype.selectHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.select(data.id);
    };
  };

  /*
   * Crates a default handler function for expand events.
   * 
   * Return value: A default handler.
   */
  WDAT.api.VList.prototype.expandHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.expand(data.id, null, true);
    };
  };

  /*
   * Crates a default handler function for delete events.
   * 
   * Return value: A default handler.
   */
  WDAT.api.VList.prototype.removeHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.remove(data.id);
    };
  };

  /*
   * Crates a default handler function for edit events.
   * 
   * Return value: A default handler.
   */
  WDAT.api.VList.prototype.editHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.edit(data.id);
    };
  };

  /*
   * Helper function for the creation of buttons matching the event list. For
   * internal use only.
   */
  WDAT.api.VList.prototype._buttons = function(element) {
    var btns = [];
    if (element.id) {
      for ( var i in this.events) {
        if (i != 'add') {
          var b = new WDAT.api.Button(i, this.bus, this.events[i], element);
          btns.push(b.toJQ());
        }
      }
    }
    return btns;
  };

  /*
   * Helper function for the creation unique ids. For internal use only.
   */
  WDAT.api.VList.prototype._toId = function(id) {
    if (id.id)
      return this.name + '-' + id.id;
    else
      return this.name + '-' + id;
  };

}());
