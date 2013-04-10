// ---------- file: file_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /*
   * Constructor for the presenter file view.
   * TODO documentation
   */
  wdat.FileView = FileView;
  function FileView(html, bus, selSection, searchEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-file-view');
    this._jq = html;
    // add list
    var listId = id + '-file-list';
    this.list = new wdat.List(listId, bus, ['sel']);
    this._jq.append(this.list.jq());
  }

})(wdat || (wdat = {}), jQuery);