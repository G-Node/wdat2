// ---------- file: tree.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* Constructor for the class VTree. VTree implements view to a dynamic tree. Each node of 
 * the tree can be expanded and collapsed. Further nodes can be appended and removed from
 * the tree.
 * 
 * Internally the tree is represented by nested div elements. 
 * 
 * <div class="tree-node [collapsed]">
 *    <div class="node-content [selected]">'
 *        <div class="node-icon"></div>
 *        <div class="node-btn"></div>
 *        <div class="node-name"></div>
 *    </div>
 *    [children]
 * </div>
 * 
 * Parameters: 
 *  - name: String/Obj    Name/ID for this individual tree or a jQuery object representing
 *                        an empty div that will be used as the container for the tree.
 *  
 *  - bus: EventBus       A bus handling events.
 * 
 *  - select: Array       Array with event names that the tree will provide.
 *                        Common events are 'del', 'add', 'edit' and 'sel'.
 *                        Events for changes ('changed') and expand/collapse ('more')
 *                        will be added if not present in the event array.
 * 
 * Depends on: 
 *  - jQuery, WDAT.api.EventBus, WDAT.api.Button
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
  // add mandatory events
  if (!events['changed'])
    this.events['changed'] = this.name + '-changed';
  if (!events['more'])
    this.events['more'] = this.name + '-more';
};

// define trees methods in their own scope
(function() {

  ELEM_TMPL = '<div class="tree-node collapsed"><div class="node-content">'
            + '<div class="node-icon"></div><div class="node-btn"></div>'
            + '<div class="node-name"></div></div></div>';
  
  /* Add a new node to the tree. Elements of the tree are represented as a
   * object that must at least contain a property 'name'. If this object has 
   * also a property 'id' this will be used as an identifier. Otherwise a unique
   * id will be chosen.   
   * 
   * Parameter:
   *  - element: Obj        The element to add to the tree.
   *  
   *  - parent: String/Obj  The is of the parent or the parent object. When null the
   *                        new element will be added to the root of the tree (optional).
   *                        
   *  - isLeaf: Boolean     Indicates if the element should be displayed as a leaf node.
   *                        Leaf nodes don't fire expand/collapse events.
   * 
   * Return value:
   *    The element added to the tree.
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
          if (!elem.is('.leaf-node'))
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
        console.log('VTree.add(): has.parent(' + parent + ') = true');
        var p = this._tree.find('#' + this._toId(parent)).first(); 
        p.append(elem);
        p.removeClass('leaf-node');
      } else {
        console.log('VTree.add(): has.parent(' + parent + ') = false');
        this._tree.append(elem);
      }
    }
    return element;
  };

  /* Update the textual representation of a node.
   * 
   * Parameter:
   *  - element: Obj      The element to update.
   *  
   * Return value:
   *    None
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
   * Return value:
   *    None
   */
  WDAT.api.VTree.prototype.edit = function(element) {
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
   *  - element: String, Obj.  The elements to edit or the id of this 
   *                           element.
   * 
   * Return value:
   *    None
   */
  WDAT.api.VTree.prototype.remove = function(element) {
    var elem = this._tree.find('#' + this._toId(element));
    elem.remove();
  };

  /* Select a specific leaf of the tree. If the element is already selected
   * it will be deselected.
   * 
   * Parameter:
   *  - element: String, Obj.  The elements to select or the id of this 
   *                           element.
   *
   *  - single: Boolean        If true all other currently selected nodes are
   *                           deselected.
   * 
   * Return value:
   *    True if now selected, false otherwise.
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


  /* Expand a specific leaf of the tree. If the element is already expanded it will
   * be collapsed.
   * 
   * Parameter:
   *  - element: String, Obj.  The elements to expand or the id of this 
   *                           element.
   *
   *  - single: Boolean        If true all other currently expanded nodes are
   *                           collapsed.
   * 
   * Return value:
   *    True if now expanded false otherwise.
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
      return false;
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
        result = this.name + '-' + id.id.toString().replace(/\//g, '-');
      else
        result = this.name + '-' + id.toString().replace(/\//g, '-');
    } 
    return result;
  };

}());
