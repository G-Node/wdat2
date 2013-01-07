// ---------- file: tree.js ---------- //

(function() {
  "use strict";

  /* Constructor for the class Tree. Tree implements view to a dynamic tree. Each node of
   * the tree can be expanded and collapsed. Further nodes can be appended and removed from
   * the tree.
   *
   * Parameters:
   *  - id: String/Obj      Name/ID for this individual tree or a jQuery object representing
   *                        an empty div that will be used as the container for the tree.
   *
   *  - bus: EventBus       A bus handling events.
   *
   *  - actions: Array      Array with event names that the tree will provide.
   *                        Common events are 'del', 'add', 'edit' and 'sel'.
   *                        An action 'expand' will be created automatically.
   *
   * Depends on:
   *  - jQuery, WDAT.api.EventBus, WDAT.ui.Button, WDAT.ui.Container
   *
   * TODO Replace buttons with jQuery-UI buttons
   */
  WDAT.ui.Tree = Tree;
  inherit(Tree, WDAT.ui.Widget);
  function Tree(id, bus, actions) {
    Tree.parent.constructor.call(this, id, '<div>', 'wdat-tree');
    this._bus = bus;
    // create events
    this._actions = {}
    for (var i in actions) {
      var act = actions[i];
      if (WDAT.ui.Container.ACTIONS.indexOf(act) >= 0) {
        this._actions[act] = this._id + '-' + act;
      }
    }
    this._buttonactions = {}
    for (var i in actions) {
      var act = actions[i];
      if (WDAT.ui.Container.ACTIONS.indexOf(act) >= 0 && act != 'sel') {
        this._buttonactions[act] = this._id + '-' + act;
      }
    }
    // add mandatory events
    this._actions.expand = this._id + '-expand';
  }

  // TODO change and use this template var
  var ELEM_TMPL = '<div class="tree-node collapsed"><div class="node-content">'
                + '<div class="node-icon"></div><div class="node-btn"></div>'
                + '<div class="node-name"></div></div></div>';

  /* Add a new node to the tree. Elements of the tree are represented as a
   * object that must at least contain a property 'name'. If this object has
   * also a property 'id' this will be used as an identifier. Otherwise a unique
   * id will be chosen.
   *
   * Parameter:
   *  - data: Obj           The element to add to the tree.
   *
   *  - parent: String/Obj  The is of the parent or the parent object. When null the
   *                        new element will be added to the root of the tree (optional).
   *
   *  - isLeaf: Boolean     Indicates if the element should be displayed as a leaf node.
   *                        Leaf nodes don't fire expand/collapse events.
   *
   * Return value:
   *    The data of the element added to the tree.
   */
  Tree.prototype.add = function(data, parent, isLeaf) {
    // check for existence
    if (!this.has(data)) {
      // set data id
      if (!data.id) data.id = this._bus.uid();
      var id = this.toID(data);
      // create a node and a container
      var node = $('<div class="tree-node collapsed"><div class="node-icon"></div></div>)').attr('id', id);
      var cont = new WDAT.ui.Container(null, this._bus, data, ['name'], null, this._buttonactions);
      node.append(cont.jq());
      // TODO hmpf?? if (isLeaf) node.addClass()
      // fire expand events on click
      if (this._actions.expand) {
        var that = this;
        node.children('.node-icon').click(function() {
            that._bus.publish(that._actions.expand, cont.data());
        });
      }
      // fire select event when clicking on the node content
      if (this._actions.sel) {
        var that = this;
        cont.jq().children('.primary').click(function() {
          that._bus.publish(that._actions.sel, cont.data());
        });
      }
      // add data to the tree
      if (this.has(parent)) {
        var p = this._jq.find('#' + this.toID(parent));
        p.append(node).removeClass('leaf-node');
      } else {
        this._jq.append(node);
      }
    } else {
      this.update(data);
    }
    return data;
  };

  /* Update the textual representation of a node.
   *
   * Parameter:
   *  - data: Obj      The element to update.
   *
   * Return value:
   *    None
   */
  Tree.prototype.update = function(data) {
    var cont = this._jq.find('#'+this.toID(data)).children('.wdat-container');
    if (cont.length > 0) {
      cont = cont.data();
      cont.data(data);
    }
  };

  /* Remove a node and all his children from the tree.
   *
   * Parameter:
   *  - element: String, Obj.  The elements to remove or the id of this
   *                           element.
   *
   * Return value:
   *    None
   */
  Tree.prototype.remove = function(element) {
    var elem = this._jq.find('#' + this.toID(element));
    elem.remove();
  };

  /* Remove all childs from a node.
   *
   * Parameter:
   *  - element: String, Obj.  The parent node of all nodes to delete or the id of this
   *                           node.
   *
   * Return value:
   *    None
   */
  Tree.prototype.removeChildren = function(element) {
    var elem = this._jq.find('#' + this.toID(element));
    elem.children('.tree-node').remove();
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
  Tree.prototype.select = function(element, single) {
    // get the element and its selection status
    var elem = this._jq.find('#' + this.toID(element));
    elem = elem.children('.wdat-container');
    var selected = elem.is('.selected');
    // if single, then unselect all
    if (single) {
      this._jq.find('.tree-node').each(function() {
        var other = $(this).children('.wdat-container');
        other.removeClass('selected');
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
  Tree.prototype.expand = function(element, single) {
    // get the element and its selection status
    var elem = this._jq.find('#' + this.toID(element));
    if (!elem.is('.leaf-node')) {
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

  /* Checks if a node is expanded.
   *
   * Parameter:
   *  - element: String, Obj.   The element to check or the id of the element.
   *
   * Return value:
   *    True if the element is expanded, false otherwise.
   */
  Tree.prototype.isExpanded = function(element) {
    // get the element and its selection status
    var elem = this._jq.find('#' + this.toID(element));
    if (elem.is('.leaf-node')) {
      return false;
    } else {
      return !elem.is('.collapsed');
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
  Tree.prototype.has = function(data) {
    if (data != null && this._jq.find('#' + this.toID(data)).length > 0) {
      return true;
    } else {
      return false;
    }
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
  Tree.prototype.event = function(action) {
    var e = this._actions[action];
    if (typeof e === 'function')
      return null;
    else
      return e;
  };

  /* Crates a default handler function for select events.
   *
   * Return value:
   *   A default handler.
   */
  Tree.prototype.selectHandler = function() {
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
  Tree.prototype.expandHandler = function() {
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
  Tree.prototype.removeHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.remove(data);
    };
  };

  /* Crates a default handler function for edit events.
   *
   * Return value:
   *   A default handler.
   */
  Tree.prototype.editHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that.edit(data.id);
    };
  };

}());

