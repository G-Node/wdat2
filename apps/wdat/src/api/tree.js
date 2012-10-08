// ---------- file: tree.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* Constructor for the class VTree. VTree implements view to a dynamic tree. Each node of 
 * the tree can be expanded and collapsed. Further nodes can be appended and removed from
 * the tree.
 * 
 * Internally the tree is represented by nested div elements. Each div contains a span 
 * element as the textual representation of the node. 
 * 
 * <div id="1" class="tree-node [collapsed]">
 *     <span>Node Label Root</span>
 *     <div id="2" class="tree-node [tree-leaf]"><span>Node Label 2</span></div>
 *     ...
 * </div>
 * 
 * Parameters: 
 *  - name: String     Individual name/id for the list (optional). 
 *  
 *  - bus: EventBus   A bus handling events.
 * 
 *  - select: String   The event to fire if an element should be selected. If select is
 *            a falsy value, the list doesn't provide selection.
 * 
 * Depends on: 
 *  - jQuery, WDAT.util.EventBus
 */
WDAT.api.VTree = function(name, bus, events) {
  // initialize name and tree body (_tree)
  if (typeof name == 'string') { // name is a string
    this._tree = $('<div class="tree"></div>').attr('id', name);
    this.name = name;
  } else if (typeof name === 'object') { // name is a jQuery object
    this._tree = name;
    this._tree.addClass('tree');
    this.name = this._tree.attr('id');
  }
  this.bus = bus;
  // event IDs
  this.events = {}
  for (var i in events) {
    this.events[events[i]] = this.name + '-' + events[i].toString();
  }
  this.events['changed'] = this.name + '-changed';
};

// define trees methods in their own scope
(function() {

  ELEM_TMPL = '<div class="tree-node collapsed"><div class="node-content">'
            + '<div class="node-icon"></div><div class="node-btn"></div>'
            + '<div class="node-name"></div></div></div>';
  
  /* Add a new node to the tree.
   * 
   * Parameter:
   *  - parent_id: String    The id of the parent node, if this is a falsy value or the
   *              name of the tree the new node will be inserted at the root
   *              of the tree.
   *  
   *  - id: String      The id of the new node, if this is null a unique id will
   *              be created.
   *  
   *  - data: String      The textual representation of the node.
   *  
   *  - isleaf: Bool      Is the new node a leaf or a node (optional default true)?    
   * 
   */
  WDAT.api.VTree.prototype.add = function(element, parent, isLeaf) {
    // check for existence
    if (!this.has(element)) {
      // set element id and parent_id
      if (!element.id)
        element.id = this.bus.uid();
      element.parent_id = (parent != null && parent.id) ? parent.id : parent;
      // create new representation of the element
      var elem = $(ELEM_TMPL);
      elem.attr('id', this._toId(element));
      elem.find('.node-name').first().text(element.name);
      elem.find('.node-btn').first().append(this._buttons(element));
      // is a leaf
      if (isLeaf)
        elem.addClass('leaf-node');
      // fire expand events on click
      if (this.events.more) {
        var that = this;
        elem.find('.node-icon').click(function() {
          that.bus.publish(that.events.more, element);
        });
      }
      // fire select event when clicking on the node content
      if (this.events.sel) {
        var that = this;
        elem.find('.node-name').click(function() {
          that.bus.publish(that.events.sel, element);
        });
      }
      // add element to the tree
      if (this.has(parent)) {
        var p = this._tree.find('#' + this._toId(parent)).first(); 
        p.append(elem);
        p.removeClass('leaf-node');
      } else {
        this._tree.append(elem);
      }
    }
    return element;
  };

  /* Update the textual representation of a node.
   * 
   * Parameter:
   *  - id: String    The id of the node to update.
   *  
   *  - data: String    The new textual representation of the node.
   *  
   * Return value:
   *  - None
   */
  WDAT.api.VTree.prototype.update = function(element) {
    var elem = this._tree.find('#' + this._toId(element) + ' .node-name');
    elem.text(element.name);
  };
  
  /* Edit the name of an existing list element.
   * 
   * Parameter:
   *  - element: String, Obj.  The elements to edit or the id of this 
   *                           element.
   *
   *  - category: String       The category containing the element to edit.
   * 
   * Return value:
   *   None
   */
  WDAT.api.VTree.prototype.edit = function(element, category) {
    // find element by id
    if (this.has(element)) {
      var elem = $('#' + this._toId(element));
      elem = elem.children('.node-content');
      // save old element
      var namediv = elem.children('.node-name').first();
      var name = namediv.text();
      namediv.empty();
      var buttons = elem.children('.node-btn').first();
      buttons.detach();
      // create input and replace old content
      var input = $('<input />').attr('type', 'text').attr('value', name);
      namediv.append(input);
      input.focus().select();
      // listen on key events
      var that = this;
      input.keyup(function(e) {
        if (e.keyCode == 13) {
          // ENTER: submit changes
          var newname = input.val();
          namediv.empty().text(newname);
          elem.prepend(buttons);
          if (element.id)
            element.name = newname;
          else
            element = {id: element, name: newname};
          that.bus.publish(that.events.changed, element);
        }
        if (e.keyCode == 27) {
          // ESC: restore old text
          namediv.empty().text(name);
          elem.prepend(buttons);
        }
      });
    }
  };

  /* Remove a node and all his children from the tree.
   * 
   * Parameter:
   *  - id: String    The id of the node to remove.
   *  
   *  - setleaf: Bool    Should the parent be marked as a leaf node if it no longer 
   *            has any children? (optional, default false)
   *  
   * Return value:
   *  - None
   */
  WDAT.api.VTree.prototype.remove = function(element) {
    var elem = this._tree.find('#' + this._toId(element));
    elem.remove();
  };

  /* Select a specific leaf of the tree. Nodes that don't 
   * are marked as leafs can't be selected.
   * 
   * Parameter:
   *  - id: String    The id of the node to be selected.
   *  
   *  - single: Boolean  If true all other currently selected nodes are
   *            deselected.
   * 
   * Return value:
   *  - None
   */
  WDAT.api.VTree.prototype.select = function(element, single) {
    // get the element and its selection status
    var elem = this._tree.find('#' + this._toId(element));
    elem = elem.children('.node-content');
    var selected = elem.is('.selected');
    // if single, then unselect all
    if (single) {
      this._tree.find('.node-content').each(function() {
        $(this).removeClass('selected');
      });
    }
    elem.toggleClass('selected', !selected);
    return !selected;
  };


  /*
   * 
   */
  WDAT.api.VTree.prototype.expand = function(element, single) {
    // get the element and its selection status
    var elem = this._tree.find('#' + this._toId(element));
    if (!elem.is('leaf-node')) {
      var collapsed = elem.is('.collapsed');
      // if single, then unselect all
      if (single) {
        this._tree.find('.tree-node').each(function() {
          $(this).addClass('collapsed');
        });
      }
      elem.toggleClass('collapsed', !collapsed);
      return !collapsed;
    } else {
      return true;
    }
  };


  /* Returns true if the tree contains the given element or an element with
   * the same ID.
   * 
   * Parameter:
   *  - element: String, Obj.   The element or the id of an element.
   *  
   * Return value:
   *    True if the element or the id exists in that tree, false otherwise.
   */
  WDAT.api.VTree.prototype.has = function(element) {
    if (element != null && this._tree.find('#' + this._toId(element)).length > 0) {
      return true;
    } else {
      return false;
    }
  };
  
  /* Returns the element that contains the tree as a jQuery object.
   * 
   * Return value:
   *    The tree as a jQuery object.
   */
  WDAT.api.VTree.prototype.toJQ = function() {
    return this._tree;
  };
  
  /* Crates a default handler function for select events. 
   * 
   * Return value:
   *   A default handler.
   */
  WDAT.api.VTree.prototype.selectHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.select(data.id, true);
    };
  };

  /* Crates a default handler function for expand events. 
   * 
   * Return value:
   *   A default handler.
   */
  WDAT.api.VTree.prototype.expandHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.expand(data.id);
    };
  };

  /* Crates a default handler function for delete events. 
   * 
   * Return value:
   *   A default handler.
   */
  WDAT.api.VTree.prototype.removeHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.remove(data.id);
    };
  };

  /* Crates a default handler function for edit events. 
   * 
   * Return value:
   *   A default handler.
   */
  WDAT.api.VTree.prototype.editHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.edit(data.id);
    };
  };
  
  /* Helper function for the creation of buttons
   * matching the event list. For internal use only.
   */
  WDAT.api.VTree.prototype._buttons = function(element) {
    var btns = [];
    if (element.id) {
      for ( var i in this.events) {
        var label = i.toString();
        if ($.inArray(label, ['more', 'sel', 'changed']) < 0) {
          if ($.inArray(label, ['del', 'add', 'edit']) >= 0)
            label = label + '-small';
          var b = new WDAT.api.Button(label, this.bus, this.events[i], null, element);
          btns.push(b.toJQ());
        }
      }
    }
    return btns;
  };

  /* Helper function for the creation unique ids.
   * For internal use only.
   */
  WDAT.api.VTree.prototype._toId = function(id) {
    var result = null;
    if (id != null && id != undefined) {
      if (id['id'])
        result = this.name + '-' + id.id.toString();
      else
        result = this.name + '-' + id.toString();
    } 
    return result;
  };

}());
