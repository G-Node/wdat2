// ---------- file: metadata_tree.js ---------- //
if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};

// define everything in its own scope
(function(){
  
  /* Constructor for the presenter PMetadataTree. The presenter is the link
   * between the DataAPI and the view VTree and populates the view and manages 
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
   *    WDAT.api.EventBus, WDAT.api.VTree, WDAT.api.DataAPI
   */
  WDAT.api.PMetadataTree = PMetadataTree;
  function PMetadataTree(name, api, bus, selEvent, cacheSize) {
    this._tree = new WDAT.api.VTree(name, bus, ['sel', 'del', 'edit', 'add']);
    // all events from the tree view
    this._events = this._tree.events;
    // event to notify external components of tree selections
    this._selEvent = selEvent;
    // event used internally to react on DataAPI resonses
    this._loadEvent = this._tree.name + '-load';
    this._api = api;
    this._bus = bus;
    // caching fetched child nodes
    this._childLRU = [];
    if (cacheSize)
      this._cacheSize = cacheSize;
    else
      this._cacheSize = 10;
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
  PMetadataTree.prototype.load = function() {
    for (var node in _PREDEF_NODES) {
      node = _PREDEF_NODES[node];
      this._tree.add(node, node.parent_id, node.isleaf);
    }
    this._bus.subscribe(this._events.sel, this._selectionHandler());
    this._bus.subscribe(this._events.more, this._expandHandler());
    this._bus.subscribe(this._loadEvent, this._loadHandler());
  };

  /* Creates a handler for select events.
   * 
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles select events.
   */
  PMetadataTree.prototype._selectionHandler = function() {
    var that = this;
    return function(event, data) {
      that._tree.select(data.id, true);
      that._bus.publish(that._selEvent, data);
    };
  };

  /* Crates a handler for expand events.
   * It requests missing children of a node from the DataAPI, the response of 
   * the DataAPI will trigger a load event. 
   * 
   * TODO Caching and/or removal of events.
   * 
   * Parameter:
   *    None
   *
   * Return value:
   *    A function that handles expand events.
   */
  PMetadataTree.prototype._expandHandler = function() {
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
        search = {type: 'section', parent: id}
      }
      if (search) {
        console.log('expandHandler(): api.get(' + that._loadEvent + ', ' + JSON.stringify(search) + ')');
        that._api.get(that._loadEvent, search, info);
      }
      that._tree.expand(data.id, false);
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
  PMetadataTree.prototype._loadHandler = function() {
    var that = this;
    return function(event, data) {
      //console.log("\nloadHandler(): data = " + JSON.stringify(data, null, 2) + "\n\n");
      if (!data.error) {
        for (var i in data.response) {
          i = data.response[i];
          var node = {id: i.id, name: i.name};
          if (data.info && _isPredefNode(data.info)) {
            console.log('loadHandler(): _tree.add(' + JSON.stringify(node) + ', ' +  data.info + ')');
            that._tree.add({id: i.id, name: i.name}, data.info);
          } else if (i.parents.parent_section) {
            console.log('loadHandler(): _tree.add(' + JSON.stringify(node) + ', ' +  i.parents.parent_section + ')');
            that._tree.add({id: i.id, name: i.name}, i.parents.parent_section);
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
  _PREDEF_NODES = [
          {id: 'own-metadata', name: 'Metadata', parent_id: null},
          {id: 'own-not-annotated', name: 'Not Annotated', parent_id: null, isleaf: true},
          {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true},
          {id: 'shared', name: 'Shared Objects', parent_id: null},
          {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared'},
          {id: 'shared-not-annotated', name: 'Not Annotated', parent_id: 'shared', isleaf: true},
          {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true}
  ];

}());