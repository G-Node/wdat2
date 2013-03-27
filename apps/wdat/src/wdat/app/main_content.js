// ---------- file: main_content.js ---------- //

(function() {
  'use strict';
  /* Constructor for the presenter MainContent. The presenter is the link
   * between the DataAPI and several viewers for sections, files an (neo) data 
   * objects.
   *
   * Parameter:
   *  - id: String, Obj     String (id) or jQuery object that represents the container
   *                          that should contain the tree view.
   *
   *  - api: DataAPI          An initialized DataAPI object.
   *
   *  - bus: EventBus         Bus for broadcasting events.
   *
   * TODO update documentation
   *
   * Depends on:
   *    WDAT.api.EventBus, WDAT.api.DataAPI, ...
   */
  WDAT.app.MainContent = MainContent;
  function MainContent(id, api, bus, selEvent, searchEvent) {
    // create tabs
    this._tabs = new WDAT.ui.TabFolder(id, bus, true);
    this._id = this._tabs.id();
    bus.subscribe(this._tabs.action, this._tabs.selectHandler());
    // properties
    this._api = api;
    this._bus = bus;
    this._actions = {sel : selEvent, search : searchEvent,
      get_sec : this._id + '-get-section', get_prp : this._id + '-get-property',
      get_val : this._id + '-get-value'};

    // create section view
    this._section = new WDAT.ui.SectionView(this._id + 'section', bus);
    this._tabs.add(this._section.jq(), 'tab-section', 'Metadata');
    bus.subscribe(this._actions.sel, this.sectionSelHandler());
    bus.subscribe(this._actions.get_sec, this.sectionSelHandler());
    bus.subscribe(this._actions.get_prp, this.sectionSelHandler());
    bus.subscribe(this._actions.get_val, this.sectionSelHandler());
    // creae data view
    this._tabs.add($('<div>Data</div>').css('padding', 4), 'tab-data', 'Data');
    // create file view
    this._tabs.add($('<div>Files</div>').css('padding', 4), 'tab-files', 'Files');
    // buffers
    this._sectionBuffer = {};
    this._sectionReqCount = 0;
  }

  MainContent.prototype.sectionSelHandler = function() {
    var that = this;
    return function(event, data) {
      // some shortcuts
      var ev = event.type;
      var sec = that._section;
      var act = that._actions;
      var api = that._api;
      console.log('EVENT: ' + ev + ';COUNT: ' + that._sectionReqCount + '; EVENT DATA: '
              + JSON.stringify(data.response || data));
      // handle events
      switch (ev) {
        // selection event from the metadata tree
        case act.sel:
          if (data && data.fields) {
            that._sectionReqCount = 1;
            that._sectionBuffer = {};
            sec.set(data);
            sec.setChildren([]);
            api.get(act.get_prp, {type : 'property', parent : data.id});
          } else {
            that._sectionReqCount = 0;
            sec.set(null);
          }
          break;
        // event when properties are recieved from the data api
        case act.get_prp:
          that._sectionBuffer.properties = {};
          that._sectionReqCount = 0;
          for ( var i in data.response) {
            var prop = data.response[i];
            var values = objGetRecursive(prop, 'value_set');
            that._sectionBuffer.properties[prop.id] = {property : prop, values : []};
            if (values && values.length > 0) {
              that._sectionReqCount += 1;
              api.get(act.get_val, {type : 'value', parent : prop.id});
            }
          }
          break;
        // event when values are recieved from the data api
        case act.get_val:
          that._sectionReqCount -= 1;
          for ( var i in data.response) {
            var val = data.response[i];
            var parentId = val.parents.parent_property;
            if (that._sectionBuffer.properties.hasOwnProperty(parentId)) {
              that._sectionBuffer.properties[parentId].values.push(val);
            }
          }
          break;
      }
      if (that._sectionReqCount == 0) {
        console.log('SECTION BUFFER: ' + JSON.stringify(that._sectionBuffer, null, 4));
        var props = [];
        for ( var i in that._sectionBuffer.properties) {
          props.push(that._sectionBuffer.properties[i]);
        }
        sec.setChildren(props);
        that._sectionBuffer = {};
      }
    };
  };

}());
