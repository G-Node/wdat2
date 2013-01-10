// ---------- file: metadata_tree.js ---------- //


(function(){
  'use strict';
  /* Constructor for the presenter MetadataTree. The presenter is the link
   * between the DataAPI and the view Tree and populates the view and manages
   * updates on the model.
   *
   * Parameter:
   *  - name: String, Obj     String (id) or jQuery object that represents the container
   *                          that should contain the tree view.
   *
   *  - api: DataAPI          An initialized DataAPI object.
   *
   *  - bus: EventBus         Bus for broadcasting events.
   *
   *  - selEvent: String      Event name for publishing selection events over the
   *                          event bus.
   *
   *  - cacheSize: Number     Size of the cache that holds hidden subtrees,
   *                          optional, default 10.
   *
   * Depends on:
   *    WDAT.api.EventBus, WDAT.ui.Tree, WDAT.api.DataAPI
   */
  WDAT.app.MetadataTree = MetadataTree;
  function MetadataTree(name, api, bus, selEvent, cacheSize) {
    this._tree = new WDAT.ui.Tree(name, bus, ['sel', 'del', 'edit', 'add']);
    // define names for internal and external events
    this._events = {
      sel:    selEvent,                     // selection events to notify external comonents
      save:   this._tree.name + '-save',    // save events from forms
      load:   this._tree.name + '-load',    // DataAPI response to load events
      update: this._tree.name + '-update'   // DataAPI response to update events
    };
    // event used internally to react on DataAPI resonses
    this._api = api;
    this._bus = bus;
    // a form for section editing and creation
    this._updateEvent = this._tree.name + '-update';
    this._form = new WDAT.ui.SectionForm(this._tree.name + '-section-form', bus, this._events.save, true);
    // subscribe handlers for internal events
    this._bus.subscribe(this._events.save, this._saveHandler());
    this._bus.subscribe(this._events.update, this._updateHandler());
    this._bus.subscribe(this._events.load, this._loadHandler());
    // subscribe handlers for tree events
    this._bus.subscribe(this._tree.event('del'), this._deleteHandler());
    this._bus.subscribe(this._tree.event('edit'), this._editHandler());
    this._bus.subscribe(this._tree.event('add'), this._editHandler());
    this._bus.subscribe(this._tree.event('expand'), this._expandHandler());
    // publish tree selections as external event
    this._bus.subscribe(this._tree.event('sel'), this._selectHandler());
  }

  /* This method fetches initial data from DataAPI and initializes all
   * events and event handlers. Call this method once on start of the
   * Application.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    None
   */
  MetadataTree.prototype.load = function() {
    for (var node in _PREDEF_NODES) {
      node = _PREDEF_NODES[node];
      this._tree.add(node, node.parent_id, node.isleaf);
    }
  };

  /* Creates a handler for select events.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles select events.
   */
  MetadataTree.prototype._selectHandler = function() {
    var that = this;
    return function(event, data) {
      that._tree.select(data.id, true);
      that._bus.publish(that._events.sel, data);
    };
  };

  /* Crates a handler for expand events.
   * It requests missing children of a node from the DataAPI, the response of
   * the DataAPI will trigger a load event.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles expand events.
   */
  MetadataTree.prototype._expandHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id;
      var search, info;
      if (id === 'own-metadata') {
        search = {type: 'section', parent: ''};
        info = 'own-metadata';
      } else if (_isPredefNode(id)) {
        ;
      } else {
        if (that._tree.isExpanded(data.id))
          that._tree.removeChildren(data.id);
        else
          search = {type: 'section', parent: id};
      }
      if (search) {
        that._api.get(that._events.load, search, info);
      }
      that._tree.expand(data.id, false);
    };
  };

  /*
   *
   */
  MetadataTree.prototype._editHandler = function() {
    var that = this;
    return function(event, data) {
      var f = that._form;
      if (event.type == that._tree.event('add')) {
        var parent = data.id.split('/');
        f.set({parent_section: parent[parent.length - 1]});
      } else if (event.type == that._tree.event('edit')) {
        f.set(data);
      }
      f.open();
    };
  };

  /* Creates a handler for save events from the form.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles save events.
   */
  MetadataTree.prototype._saveHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.set(that._events.update, data);
      else
        that._api.set(that._events.update, data);
    };
  }

  /* Creates a handler for delete events from the tree.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles delete events.
   */
  MetadataTree.prototype._deleteHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.del(that._events.update, data.id, data.id)
    };
  }

  /* Creates a handler for delete events from the DataAPI.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles update events.
   */
  MetadataTree.prototype._updateHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.action === 'del') {
        that._tree.remove(data.info);
      } else if (data.action === 'set') {
        var elem = data.response[0];
        that._tree.add(elem, elem.parents.parent_section);
      }
    };
  };

  /* Creates a handler for load events fired by the DataAPI.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles load events.
   */
  MetadataTree.prototype._loadHandler = function() {
    var that = this;
    return function(event, data) {
      if (!data.error) {
        for (var i in data.response) {
          i = data.response[i];
          if (data.info && _isPredefNode(data.info)) {
            that._tree.add(i, data.info);
          } else if (i.parents.parent_section) {
            that._tree.add(i, i.parents.parent_section);
          }
        }
      }
    };
  };

  /* Helper function that determines if a node is a predefined node or not.
   *
   * Parameter:
   *  - id: String      The id of a node
   *
   * Return value:
   *    True if the node is a predefined node, false otherwise.
   */
  function _isPredefNode(id) {
    var predef = false;
    for (var i in _PREDEF_NODES) {
      if (_PREDEF_NODES[i].id === id) {
        predef = true;
        break;
      }
    }
    return predef;
  }

  /*
   * Some predefined nodes that are loaded into the tree
   */
  var _PREDEF_NODES = [
          {id: 'own-metadata', name: 'Metadata', parent_id: null},
          {id: 'own-not-annotated', name: 'Not Annotated', parent_id: null, isleaf: true},
          {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true},
          {id: 'shared', name: 'Shared Objects', parent_id: null},
          {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared'},
          {id: 'shared-not-annotated', name: 'Not Annotated', parent_id: 'shared', isleaf: true},
          {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true}
  ];

}());

