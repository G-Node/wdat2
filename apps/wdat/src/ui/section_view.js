// ---------- file: section_view.js ---------- //

(function() {
  "use strict";

  //-------------------------------------------------------------------------------------
  // Class: SectionView
  //-------------------------------------------------------------------------------------

  /* Constructor for the class SectionView.
   *
   * Parameters:
   *  - id: String/Obj      Name/ID for this individual section view or a jQuery object representing
   *                        an empty div that will be used as the container for the view.
   *
   *  - bus: EventBus       A bus handling events.
   *
   * Depends on:
   *  - jQuery, WDAT.api.EventBus, WDAT.ui.Button, WDAT.ui.Container
   */
  WDAT.ui.SectionView = SectionView;
  inherit(SectionView, WDAT.ui.Container);
  function SectionView(id, bus) {
    var act = {};
    var attrconf = {};
    var clazz = 'wdat-section-view';
    SectionView.parent.constructor.call(this, id, bus, act, attrconf, clazz,
            SectionView.TEMPLATE);
    this._bus = bus;
    this._data = {};
    this._children = [];
    var l = this._jq.children('.properties').attr('id', this._id + '-properties');
    this._list = new WDAT.ui.List(l, bus, ['del', 'sel', 'edit']);
    this._jq.data(this);
    this.refresh();
  }

  /* Refresh the content (see WDAT.ui.Container).
   */
  SectionView.prototype.refresh = function() {
    // section overview
    var html = this._jq.children('.section').empty();
    var val = objGetRecursive(this._data, 'name') || 'n.a.';
    html.append($('<dt>').text('Name:')).append($('<dd>').text(val));
    val = objGetRecursive(this._data, 'odml_type') || 'n.a.';
    html.append($('<dt>').text('Type:')).append($('<dd>').text(val));
    val = objGetRecursive(this._data, 'tree_position') || 'n.a.';
    html.append($('<dt>').text('Position:')).append($('<dd>').text(val));
    val = objGetRecursive(this._data, 'description') || 'n.a.';
    html.append($('<dt>').text('Description:')).append($('<dd>').text(val));
    val = objGetRecursive(this._data, 'safety_level') || 'n.a.';
    html.append($('<dt>').text('Savety Level:')).append($('<dd>').text(val));
    val = objGetRecursive(this._data, 'date_created') || 'n.a.';
    html.append($('<dt>').text('Date Created:')).append($('<dd>').text(val));
    // create property list
    this.refreshChildren();
  };

  /* Refresh the content (see WDAT.ui.Container).
   */
  SectionView.prototype.refreshChildren = function() {
    // create property list
    this._list.clear();
    for ( var i in this._children) {
      var p = this._children[i].property;
      var v = this._children[i].values;
      var cont = new PropertyContainer(p.id, this._bus);
      cont.set(p);
      cont.setChildren(v);
      this._list.addContainer(cont);
    }
  };

  SectionView.TEMPLATE = '<div><h2>Section</h2><dl class="section"></dl>'
          + '<h3>Properties</h3><div class="properties"></div></div>';

  //-------------------------------------------------------------------------------------
  // Class: PropertyContainer (private)
  //-------------------------------------------------------------------------------------

  /* Constructor for the class PropertyContainer.
  *
  * Parameters:
  *  - id: String/Obj      Name/ID for this property container or a jQuery object representing
  *                        an empty div that will be used as the container for the view.
  *
  *  - bus: EventBus       A bus handling events.
  *
  * Depends on:
  *  - jQuery, WDAT.api.EventBus, WDAT.ui.Button, WDAT.ui.Container
   */
  inherit(PropertyContainer, WDAT.ui.Container);
  function PropertyContainer(id, bus) {
    var act = {sel : 'property-select', del : 'property-delete', edit : 'property-edit'};
    PropertyContainer.parent.constructor.call(this, id, bus, act);
  }

  /* Refresh the content (see WDAT.ui.Container).
   */
  PropertyContainer.prototype.refresh = function() {
    // create primary content
    var html = this._jq.children('.primary').empty();
    var val = this._data.name;
    html.append($('<span class="head">').text(val));
    html.append($('<span class="head-add">').text(' = '));
    for ( var i in this._children) {
      val = this._children[i].name;
      html.children('.head-add').append(i == 0 ? val : ', ' + val);
    }
    val = objGetRecursive(this._data, 'uncertainty');
    if (val)
      html.children('.head-add').append('; +/- ' + val);
    // create secondary content
    html = this._jq.children('.secondary').empty();
    val = '';
    for ( var i in this._children) {
      val += (i == 0 ? this._children[i].name : ', ' + this._children[i].name);
    }
    html.append($('<dt>').text('Values:')).append($('<dd>').text(val || 'n.a.'));
    val = objGetRecursive(this._data, 'unit');
    html.append($('<dt>').text('Unit:')).append($('<dd>').text(val || 'n.a.'));
    val = objGetRecursive(this._data, 'uncertainty');
    html.append($('<dt>').text('Uncertainty:')).append($('<dd>').text(val || 'n.a.'));
    val = objGetRecursive(this._data, 'data_type');
    html.append($('<dt>').text('Data Type:')).append($('<dd>').text(val || 'n.a.'));
    val = objGetRecursive(this._data, 'definition');
    html.append($('<dt>').text('Definition:')).append($('<dd>').text(val || 'n.a.'));
    val = objGetRecursive(this._data, 'date_created');
    html.append($('<dt>').text('Date Created:')).append($('<dd>').text(val || 'n.a.'));
    // create buttons
    html = this._jq.children('.buttons').empty();
    var btn;

    btn = new WDAT.ui.Button2(null, 'more', this._bus, this._expandHandler());
    html.append(btn.jq());

    for ( var i in WDAT.ui.Container.ACTIONS) {
      var act = WDAT.ui.Container.ACTIONS[i];
      if (this._actions.hasOwnProperty(act)) {
        var click = this._actions[act];
        btn = new WDAT.ui.Button2(null, act + '_small', this._bus, click, this._data);
        html.append(btn.jq());
      }
    }
  };

}());
