// ---------- file: section_view.js ---------- //

(function() {
  "use strict";

  //-------------------------------------------------------------------------------------
  // Class: DataView
  //-------------------------------------------------------------------------------------

  /* Constructor for the class DataView.
   *
   * Parameters:
   *  - id: String/Obj      Name/ID for this individual section view or a jQuery object representing
   *                        an empty div that will be used as the container for the view.
   *
   *  - bus: EventBus       A bus handling events.
   *
   * Depends on:
   *  - jQuery, WDAT.api.EventBus, WDAT.Button, WDAT.Container
   */
  WDAT.app.DataView = DataView;
  inherit(DataView, WDAT.Widget);
  function DataView(id, api, bus, selSection) {
    DataView.parent.constructor.call(this, id);
    this._bus = bus;
    this._nav = new WDAT.ui.BreadCrumb(this.toID('bread-crumb'), bus);
    this._jq.append(this._nav.jq());
    this._list = new WDAT.ui.List(this.toID('list'), bus, ['']);
  }

  DataView.TEMPLATE = '<div><div class="data-bread-crumb"></div>' +
                      '<div class="data-list"></div></div>';

  //-------------------------------------------------------------------------------------
  // Class: DataContainer (private)
  //-------------------------------------------------------------------------------------

  /* Constructor for the class DataContainer.
  *
  * Parameters:
  *  - id: String/Obj      Name/ID for this property container or a jQuery object representing
  *                        an empty div that will be used as the container for the view.
  *
  *  - bus: EventBus       A bus handling events.
  *
  * Depends on:
  *  - jQuery, WDAT.api.EventBus, WDAT.Button, WDAT.Container
   */
  inherit(DataContainer, WDAT.Container);
  function DataContainer(id, bus) {
    var act = {sel : 'property-select', del : 'property-delete', edit : 'property-edit'};
    DataContainer.parent.constructor.call(this, id, bus, act);
  }

  /* Refresh the content (see WDAT.Container).
   */
  DataContainer.prototype.refresh = function() {
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

    btn = new WDAT.Button(null, 'more', this._bus, this._expandHandler());
    html.append(btn.jq());

    for ( var i in WDAT.Container.ACTIONS) {
      var act = WDAT.Container.ACTIONS[i];
      if (this._actions.hasOwnProperty(act)) {
        var click = this._actions[act];
        btn = new WDAT.Button(null, act + '_small', this._bus, click, this._data);
        html.append(btn.jq());
      }
    }
  };

}());
