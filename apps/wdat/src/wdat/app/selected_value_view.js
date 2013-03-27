// ---------- file: selected_value_view.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the presenter for selected values.
   * TODO documentation
   */
  WDAT.SelectedValueView = SelectedValueView;
  function SelectedValueView(html, bus, valSelect, valSearch) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-selected-value-view');
    this._jq = html;
    // add header
    this._jq.append('<h1>Selected Values</h1>');
    // add list
    var listId = id + '-value-list';
    this.list = new WDAT.List(listId, bus, ['del', 'sel']);
    this._jq.append(this.list.jq());

    this.list.add({id: 'dummy', name: 'A value'});
  }

}());