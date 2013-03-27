// ---------- file: file_view.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the presenter file view.
   * TODO documentation
   */
  WDAT.FileView = FileView;
  function FileView(html, bus, selSection, searchEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-file-view');
    this._jq = html;
    // add list
    var listId = id + '-file-list';
    this.list = new WDAT.List(listId, bus, ['sel']);
    this._jq.append(this.list.jq());
  }

}());