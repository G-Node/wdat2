// ---------- file: selected_data_view.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the presenter for selected data.
   * TODO documentation
   */
  WDAT.SelectedDataView = SelectedDataView;
  function SelectedDataView(html, bus, dataSelect, dataPlot) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-selected-data-view');
    this._jq = html;
    // add header
    this._jq.append('<h1>Selected Data</h1>');
    // add list
    var listId = id + '-value-list';
    this.list = new WDAT.List(listId, bus, ['del', 'sel']);
    this._jq.append(this.list.jq());

    this.list.add({id: 'dummy', name: 'A NEO element'});
  }

}());