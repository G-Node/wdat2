// ---------- file: metadata_view.js ---------- //

(function(){
  'use strict';

  /**
   * Constructor for the presenter MetadataView. The presenter displays a section and
   * all its properties in a nice view.
   *
   * @param html (jQuery)         A jQuery object that will be filled with the content of the
   *                              metadata view.
   * @param api (DataAPI)         An initialized DataAPI object.
   * @param bus (Bus)             Event name for publishing selection events over the
   *                              event bus.
   * @param selSelection (String) Event name for incoming selection events for sections.
   * @param selValue (String)     The presenter will publich this event when a value
   *                              was selected.
   *
   * Depends on: WDAT.Bus, WDAT.DataAI, WDAT.SectionContainer, WDAT.PropertyContainer, WDAT.Form
   *
   * FIXME Properties are not properly updated when a new section is selected.
   * TODO Crate handlers for all events.
   */
  WDAT.MetadataView = MetadataView;
  function MetadataView(html, api, bus, selSection, selValue) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-metadata-view');
    var secContId  = id + '-section';
    var propListId = id + '-properties';
    this._jq = html;
    // section container
    this._section = new WDAT.SectionContainer(secContId, bus);
    this._section.refresh();
    html.append(this._section.jq());
    // property list
    var addProp = id + '-add-prop';
    this._properties = new WDAT.List(propListId, bus, {add: addProp}, ['properties']);
    this._properties.refresh();
    html.append(this._properties.jq());
    // actions for propety container
    this._propActions = {
            del: id + '-del-prop',
            edit: id + '-edit-prop',
            select_val: selValue
    };
    // other actions for the presenter
    this._actions = {
            add_prop: addProp,
            save_prop: id + '-save-prop',
            update_all: id + '-update-all',
            update_prop: id + '-update-prop',
            update_sec: selSection
    };
    // bus and api
    this._bus = bus;
    this._api = api;
    // a form for property editing events
    var formId = id += '-property-form';
    this._form = new WDAT.Form(formId, bus, {save: this._actions.save_prop},
                               'property', true);
    this._form.set();
    // subscribe event handlers
    bus.subscribe(selSection, this._selectSectionHandler());
    bus.subscribe(this._actions.update_all, this._updateAllHandler());
    bus.subscribe(this._actions.add_prop, this._addPropertyHandler());
    bus.subscribe(this._propActions.edit, this._editPropertyHandler());
    bus.subscribe(this._actions.save_prop, this._savePropertyHandler());
    bus.subscribe(this._actions.update_prop, this._updatePropertyHandler());
    bus.subscribe(this._propActions.del, this._delPropertyHandler());
  }

  /**
   * Crates an event handler that reacts on external selection events for sections.
   *
   * Triggers an 'update_all' event.
   *
   * @returns A handler for select events.
   */
  MetadataView.prototype._selectSectionHandler = function() {
    var that = this;
    return function(event, data) {
      if (data && data.id) {
        that._api.get(that._actions.update_all, {id: data.id, type: "section", depth: 2});
      } else {
        that._section.set();
        that._properties.clear();
      }
    };
  };

  /**
   * Crates an event handler that reacts on 'update_all' events. As data object the handler
   * expects a section with all its properties and values as returned by the DataAPI.
   *
   * Does not trigger any further events.
   *
   * @returns A handler for 'update_all' events.
   */
  MetadataView.prototype._updateAllHandler = function() {
    var that = this;
    return function(event, data) {
      var section = null;
      var properties = [];
      for (var i in data.response) {
        var elem = data.response[i];
        if (elem.type == 'section') {
          section = elem;
        } else if (elem.type == 'property') {
          var p = {property: elem, values: []};
          for (var j in elem.children.value_set) {
            var v = elem.children.value_set[j];
            p.values.push(data.response[v]);
          }
          properties.push(p);
        }
      }
      if (section) {
        that._section.set(section);
        that._properties.clear();
        for (var j in properties) {
          var p = properties[j].property;
          var v = properties[j].values;
          var cont = new WDAT.PropertyContainer(p.id, that._bus, that._propActions);
          cont.set(p);
          cont.setChildren(v);
          that._properties.addContainer(cont, 'properties');
        }
      }
    };
  };

  /**
   * Creates an event handler that reacts on 'add_prop' events. It opens a form with
   * an empty property.
   *
   * The form opened by this handler may trigger an 'save_prop' event.
   *
   * @returns A handler for 'add_property' events.
   */
  MetadataView.prototype._addPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var p = that._section.get();
      var f = that._form;
      f.set();
      if (p && p.id) {
        var elem = modCreate('property');
        elem.parents.section = p.id;
        f.set(elem);
        f.open();
      }
    };
  };

  /**
   * Creates an event handler that reacts on 'edit_prop' events. It opens a form with
   * the property data that was published with the event.
   *
   * The form opened by this handler may trigger an 'save_prop' event.
   *
   * @returns A handler for 'edit_prop' events.
   */
  MetadataView.prototype._editPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var f = that._form;
      if (data && data.id) {
        f.set(data);
        f.open();
      }
    };
  };

  /**
   * Crates an event handler that reacts on 'save_prop' events. The handler calls the
   * DataAPI and tries to save the data passed along with the event.
   *
   * If saved sucessfully the DataAPI will trigger an 'update_prop' event.
   *
   * @returns A handler for 'save_prop' events.
   */
  MetadataView.prototype._savePropertyHandler = function() {
    var that = this;
    return function(event, data) {
      if (data && data.type == 'property') {
        that._api.set(that._actions.update_prop, data);
      }
    };
  };

  /**
   * Creates an event that reacts on 'update_prop' events. The handler will update the
   * property list using the data pased along with the event.
   *
   * Does not trigger any further events.
   *
   * @returns A handler for 'update_prop' events.
   */
  MetadataView.prototype._updatePropertyHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.action == 'set') {
        var elements = data.response;
        for (var i in elements) {
          var elem = elements[i];
          if (that._properties.has(elem)) {
            that._properties.set(elem);
          } else {
            var cont = new WDAT.PropertyContainer(elem.id, that._bus, that._propActions);
            cont.set(elem);
            cont.setChildren([]);
            that._properties.addContainer(cont, 'properties');
          }
        }
      } else if (data.action === 'del') {
        that._properties.del(data.param);
      }
    };
  };

  /**
   * Crates an event that reacts on 'del_prop' events. The handler calls
   * DataAPI.
   *
   * If the deletion was successful the handler will trigger an 'update_prop' event.
   *
   * @returns A handler for 'del_prop' events.
   */
  MetadataView.prototype._delPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id || data;
      if (id) {
        that._api.del(that._actions.update_prop, id);
      }
    };
  };

})();