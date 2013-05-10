// ---------- file: selected_data_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Constructor for the presenter for selected data.
   * TODO documentation
   */
  wdat.SelectedDataView = SelectedDataView;
  function SelectedDataView(html, bus, dataSelect, dataPlot) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-selected-data-view');
    this._jq = html;
    // add header
    this._jq.append('<h1>Selected Data</h1>');
    // add list
    var listId = id + '-value-list';
    this.list = new wdat.List(listId, bus, ['del', 'sel']);
    this._jq.append(this.list.jq());

    this.list.add({id: 'dummy', name: 'A NEO element'});
  }

})(wdat || (wdat = {}), jQuery);