// ---------- file: tree.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the class Tree. Tree implements view to a dynamic tree. Each node of
   * the tree can be expanded and collapsed. Further nodes can be appended and removed from
   * the tree.
   *
   * Minimal list element:
   *   { name: <name> }
   *
   * @param id (String, Obj)      The id of the list or a jQuery object.
   * @param bus (Bus)             Bus handling events.
   * @param actions (Obj, Array)  Set of actions with their respective events or callbacks.
   *                              Common events are 'del', 'add', 'edit' and 'sel'.
   *                              An action 'expand' will be created automatically.
   *
   * Depends on: jQuery, WDAT.Bus, WDAT.Button, WDAT.MultiContainer, WDAT.Container
   */
  WDAT.Tree = Tree;
  inherit(Tree, WDAT.MultiContainer);
  function Tree(id, bus, actions) {
    Tree.parent.constructor.call(this, id, bus, actions, 'wdat-tree', '<div>');
    // actions for container elements
    this._contActions = {};
    for ( var i in actions) {
      var act = actions[i];
      if (WDAT.Container.ACTIONS.indexOf(act) >= 0 && act != 'sel') {
        this._contActions[act] = this._id + '-' + act;
      }
    }
    // add mandatory events
    this._actions.expand = this.toID('expand');
  }

  /**
   * Add a new node to the tree. Elements of the tree are represented as a
   * object that must at least contain a property 'name'. If this object has
   * also a property 'id' this will be used as an identifier. Otherwise a unique
   * id will be chosen.
   *
   * @param data (Obj)            The element to add to the tree.
   * @param parent (String, Obj)  The is of the parent or the parent object. When
   *                              null the new element will be added to the root of
   *                              the tree (optional).
   * @param Boolean               Indicates if the element should be displayed as a leaf
   *                              node. Leaf nodes don't fire expand/collapse events.
   *
   * @return The data of the element added to the tree.
   */
  Tree.prototype.add = function(data, parent, isLeaf) {
    var parent_id = null;
    if (this.has(parent)) {
      if (typeof parent ==  'object')
        parent_id = parent.id;
      else
        parent_id = parent;
    }
    var elem = Tree.parent.add.call(this, data, parent_id);
    if (elem) {
      var id = this.toID(data);
      var html = $(Tree.NODE_TEMPLATE).attr('id', id);
      var cont = new WDAT.Container(null, this._bus, this._contActions, null, null, null, {prim: ['name'], sec: []});
      cont.set(elem);
      html.append(cont.jq());
      if (isLeaf)
        html.addClass('leaf-node');
      // fire expand events on click
      var that = this;
      html.children('.node-icon').click(function() {
        that._bus.publish(that._actions.expand, cont.get());
      });
      // fire select event when clicking on the node content
      if (this._actions.sel) {
        var that = this;
        cont.jq().children('.primary').click(function() {
          that._bus.publish(that._actions.sel, cont.get());
        });
      }
      // add data to the tree
      if (parent_id) {
        var p = this._jq.find('#' + this.toID(parent_id));
        p.append(html).removeClass('leaf-node');
      } else {
        this._jq.append(html);
      }
      // return element
      return elem;
    }
  };

  /**
   * Update the textual representation of a node.
   *
   * @param data (Obj)            The element to update.
   * @param parent (String, Obj)  The is of the parent or the parent object (optional).
   *                              This can be used to move a node/subtree.
   *
   * @return The updated data object or undefined if no such object was found.
   */
  Tree.prototype.set = function(data, parent) {
    var oldparent = this._data[data.id].position;
    var parent_id = null;
    if (this.has(parent)) {
      if (typeof parent ==  'object')
        parent_id = parent.id;
      else
        parent_id = parent;
    }
    var elem = Tree.parent.set.call(this, data, parent_id);
    if (elem) {
      var newparent = this._data[data.id].position;
      var node = this._jq.find('#' + this.toID(data));
      var cont = node.children('.wdat-container').data();
      cont.set(data);
      if (parent && oldparent != newparent) {
        node.detach();
        var parentnode = this._jq.find('#' + this.toID(newparent));
        parentnode.append(node).removeClass('leaf-node');
      }
      return elem;
    }
  };

  /**
   * Remove a node and all his children from the tree.
   *
   * @param data (Obj., String)   The element to delete or the id of this element.
   *
   * @returns True if the element was deleted, false otherwise.
   */
  Tree.prototype.del = function(data) {
    if (this.has(data)) {
      var removed = this.get(data);
      var node = this._jq.find('#' + this.toID(removed));
      var subtree = this._subtree(removed);
      for (var i in subtree) {
        delete this._data[subtree[i].id];
      }
      node.remove();
      return removed;
    }
  };

  /**
   * Remove all children of a node from the tree.
   *
   * @param data (Obj., String)   The element to delete or the id of this element.
   *
   * @returns The number of removed children.
   */
  Tree.prototype.delChildren = function(data) {
    var children = [];
    if (this.has(data)) {
      var elem = this.get(data);
      for (var i in this._data) {
        if (this._data[i].position == elem.id) {
          children.push(this._data[i].data);
        }
      }
      for (var i in children) {
        this.del(children[i]);
      }
    }
    return children.length;
  };

  /**
   * Select a specific leaf of the tree. If the element is already selected
   * it will be deselected.
   *
   * @param data (String, Obj)      The elements to select or the id of this
   *                                element.
   * @param single (Boolean)        If true all other currently selected nodes are
   *                                deselected.
   *
   * @return True if now selected, false otherwise.
   */
  Tree.prototype.select = function(data, single) {
    if (this.has(data)) {
      var node = this._jq.find('#' + this.toID(data));
      var cont = node.children('.wdat-container');
      var selected = cont.is('.selected');
      if (single) {
        this._jq.find('.tree-node').each(function() {
          var other = $(this).children('.wdat-container');
          other.removeClass('selected');
        });
      }
      cont.toggleClass('selected', !selected);
      return !selected;
    }
  };

  /**
   * Expand a specific leaf of the tree. If the element is already expanded it will
   * be collapsed.
   *
   * @param data (String, Obj)  The elements to expand or the id of this
   *                            element.
   * @param single (Boolean)    If true all other currently expanded nodes are
   *                            collapsed.
   *
   * @return True if now expanded false otherwise.
   */
  Tree.prototype.expand = function(data, single) {
    // get the data and its selection status
    var node = this._jq.find('#' + this.toID(data));
    if (!node.is('.leaf-node')) {
      var collapsed = node.is('.collapsed');
      // if single, then unselect all
      if (single) {
        this._tree.find('.tree-node').each(function() {
          $(this).addClass('collapsed');
        });
      }
      node.toggleClass('collapsed', !collapsed);
      return !collapsed;
    }
  };

  /**
   * Checks if a node is expanded.
   *
   * @param data String, Obj.   The element to check or the id of the element.
   *
   * @return True if the element is expanded, false otherwise.
   */
  Tree.prototype.isExpanded = function(data) {
    // get the data and its selection status
    var node = this._jq.find('#' + this.toID(data));
    if (!node.is('.leaf-node')) {
      return !node.is('.collapsed');
    }
  };

  /**
   * Get a list of data objects/nodes that are in the subtree of another
   * data object/node (for internal use only).
   *
   * @param data (String, Obj)    The root elements of the subtree or the id of this
   *                              element.
   *
   * @return An array of data objects.
   */
  Tree.prototype._subtree = function(data) {
    var subtree = [];
    if (this.has(data)) {
      var root_id = data.id || data;
      var elem = this._data[root_id].data;
      var stack = [elem];
      while (stack.length > 0) {
        elem = stack.pop();
        for (var i in this._data) {
          if (this._data[i].position == elem.id) {
            stack.push(this._data[i].data);
          }
        }
        subtree.push(elem);
      }
    }
    return subtree;
  };

  /**
   * Crates a default handler function for select events.
   *
   * @return A default handler.
   */
  Tree.prototype.selHandler = function() {
    var that = this;
    return function(event, data) {
      that.select(data, true);
    };
  };

  /**
   * Crates a default handler function for expand events.
   *
   * @return A default handler.
   */
  Tree.prototype.expandHandler = function() {
    var that = this;
    return function(event, data) {
      that.expand(data);
    };
  };

  /**
   * Crates a default handler function for delete events.
   *
   * @remove A default handler.
   */
  Tree.prototype.delHandler = function() {
    var that = this;
    return function(event, data) {
      that.del(data);
    };
  };

  Tree.NODE_TEMPLATE = '<div class="tree-node collapsed">' +
                       '<div class="node-icon"></div></div>';

}());
