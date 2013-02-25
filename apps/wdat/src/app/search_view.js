// ---------- file: search_view.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the presenter search view.
   * TODO documentation
   */
  WDAT.SearchView = SearchView;
  function SearchView(html, bus, search, activate) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-search-view');
    var searchId = id + '-bread-crumb';
    this._jq = html;
    // add header
    this._jq.append('<h1>Filter Rules</h1>');
    // initialize search bar
    this._search  = new WDAT.SearchBar(searchId, bus, search, activate);
    this._jq.append(this._search.jq());
  }

}());
