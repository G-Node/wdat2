// ---------- file: metadata_tree.js ---------- //


var wdat; (function(wdat, $){
  'use strict';

  /**
   * Constructor for the presenter MetadataTree. The presenter is the link
   * between the DataAPI and the view Tree and populates the view and manages
   * updates on the model.
   *
   * @param html (jQuery)       A jQuery object that will be filled with the content of the
   *                            metadata tree.
   * @param api (DataAPI)       An initialized DataAPI object.
   * @param bus (Bus)           Bus for broadcasting events.
   * @param selEvent(String)    Event name for publishing selection events over the
   *                            event bus.
   * @param changeEvent(String) The presenter will listen on this event for changes in
   *                            the metadata tree.
   *
   * Depends on: wdat.Bus, wdat.Tree, wdat.DataAPI, wdat.Form
   *
   * FIXME maybe add a addContainer method to tree
   * FIXME create new edit delete button on bottom of the presenter.
   *
   */
  wdat.MetadataTree = MetadataTree;
  function MetadataTree(html, api, bus, selEvent, changeEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-metadata-tree');
    var treeId = id += '-mdata-tree';
    this._jq = html;
    // create header
    this._jq.append('<h1>Metadata Browser</h1>');
    // create tree
    this.tree = new wdat.Tree(treeId, bus, ['sel', 'del', 'edit', 'add']);
    this._jq.append(this.tree.jq());
    // create buttons
    // define names for internal and external events
    this._actions = {
      sel:    selEvent,                     // selection events to notify external comonents
      save:   this.tree.id() + '-save',    // save events from forms
      load:   this.tree.id() + '-load',    // DataAPI response to load events
      update: this.tree.id() + '-update'   // DataAPI response to update events
    };
    // event used internally to react on DataAPI resonses
    this._api = api;
    this._bus = bus;
    // a form for section editing and creation
    this._updateEvent = this.tree.name + '-update';
    var formId = id += '-section-form';
    this._form = new wdat.Form(formId, bus, {save: this._actions.save}, 'section', true);
    this._form.set();
    // subscribe handlers for internal events
    this._bus.subscribe(this._actions.save, this._saveHandler());
    this._bus.subscribe(this._actions.update, this._updateHandler());
    this._bus.subscribe(this._actions.load, this._loadHandler());
    // subscribe handlers for tree events
    this._bus.subscribe(this.tree.event('del'), this._deleteHandler());
    this._bus.subscribe(this.tree.event('edit'), this._editHandler());
    this._bus.subscribe(this.tree.event('add'), this._editHandler());
    this._bus.subscribe(this.tree.event('expand'), this._expandHandler());
    // publish tree selections as external event
    this._bus.subscribe(this.tree.event('sel'), this._selectHandler());
  }

  /**
   * This method fetches initial data from DataAPI and initializes all
   * events and event handlers. Call this method once on start of the
   * Application.
   */
  MetadataTree.prototype.load = function() {
    for (var node in MetadataTree.PREDEF_NODES) {
      node = MetadataTree.PREDEF_NODES[node];
      this.tree.add(node, node.parent_id, node.isleaf);
    }
  };

  /**
   * Creates a handler for select events.
   *
   * @return A function that handles select events.
   */
  MetadataTree.prototype._selectHandler = function() {
    var that = this;
    return function(event, data) {
      that.tree.select(data.id, true);
      var selected = that.tree.selected();
      that._bus.publish(that._actions.sel, selected);
    };
  };

  /**
   * Crates a handler for expand events.
   * It requests missing children of a node from the DataAPI, the response of
   * the DataAPI will trigger a load event.
   *
   * @return A function that handles expand events.
   */
  MetadataTree.prototype._expandHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id;
      var search = null, info = null;
      if (_isPredefNode(id)) {
        if (id == 'own-metadata') {
          search = {type: 'section', parent: '', owner: '2'}; // TODO get real owner
          info = 'own-metadata';
        } else if (id == 'shared-metadata') {
          search = {type: 'section', parent: '', owner: ['2', '!='], safety_level: 'friendly'}; // TODO get real owner
          info = 'shared-metadata';
        } else if (id == 'public-metadata') {
          search = {type: 'section', parent: '', owner: ['2', '!='], safety_level: 'public'}; // TODO get real owner
          info = 'public-metadata';
        }
      } else {
        if (that.tree.isExpanded(id)) {
          that.tree.delChildren(id);
        } else {
          search = {type: 'section', parent: id};
        }
      }
      if (search) {
        that._api.get(that._actions.load, search, info);
      }
      that.tree.expand(id, false);
    };
  };

  /**
   * Crates a handler for edit events.
   *
   * @return A handler for edit events.
   */
  MetadataTree.prototype._editHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id;
      var f = that._form;
      f.set();
      if (!_isPredefNode(id)) {
        if (event.type == that.tree.event('add')) {
          f.set({parents: {parent_section: id}, type: 'section'});
        } else if (event.type == that.tree.event('edit')) {
          f.set(data);
        }
        f.open();
      } else if (id == 'own-metadata') {
        f.set({parent_section: null});
        f.open();
      }
    };
  };

  /**
   * Creates a handler for save events from the form.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * @return A function that handles save events.
   */
  MetadataTree.prototype._saveHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.set(that._actions.update, data);
      else
        that._api.set(that._actions.update, data);
    };
  };

  /**
   * Creates a handler for delete events from the tree.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * @return A function that handles delete events.
   */
  MetadataTree.prototype._deleteHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.del(that._actions.update, data.id, data.id);
    };
  };

  /**
   * Creates a handler for delete events from the DataAPI.
   *
   * @return A function that handles update events.
   */
  MetadataTree.prototype._updateHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.action === 'del') {
        that.tree.del(data.info);
      } else if (data.action === 'set') {
        var elements = data.response;
        for (var i in elements) {
          var elem = elements[i];
          if (elem.parents && elem.parents.parent_section) {
            that.tree.add(elem, elem.parents.parent_section);
          } else {
            that.tree.add(elem, 'own-metadata');
          }
        }
      }
    };
  };

  /**
   * Creates a handler for load events fired by the DataAPI.
   *
   * @return A function that handles load events.
   */
  MetadataTree.prototype._loadHandler = function() {
    var that = this;
    return function(event, data) {
      if (!data.error) {
        for (var i in data.response) {
          i = data.response[i];
          if (data.info && _isPredefNode(data.info)) {
            that.tree.add(i, data.info);
          } else if (i.parents.parent_section) {
            that.tree.add(i, i.parents.parent_section);
          }
        }
      }
    };
  };

  /**
   * Helper function that determines if a node is a predefined node or not.
   *
   * @param id (String)      The id of a node
   *
   * @return True if the node is a predefined node, false otherwise.
   */
  function _isPredefNode(id) {
    var predef = false;
    for (var i in MetadataTree.PREDEF_NODES) {
      if (MetadataTree.PREDEF_NODES[i].id === id) {
        predef = true;
        break;
      }
    }
    return predef;
  }

  /**
   * Some predefined nodes that are loaded into the tree
   */
  MetadataTree.PREDEF_NODES = [
          {id: 'own-metadata', name: 'Metadata', parent_id: null},
          {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true},
          {id: 'shared', name: 'Shared Objects', parent_id: null},
          {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared'},
          {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true},
          {id: 'public', name: 'Public Objects', parent_id: null},
          {id: 'public-metadata', name: 'Metadata', parent_id: 'public'},
          {id: 'public-all', name: 'All Data', parent_id: 'public', isleaf: true}
  ];

})(wdat || (wdat = {}), jQuery);

