// ---------- file: application.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  // global events
  var events = {
          sel_section: 'global-sel-section',
          sel_value: 'global-sel-value',
          sel_value_search: 'global-sel-value-search',
          search: 'global-search',
          sel_data: 'global-sel-data',
          plot: 'global-plot',
          manage: 'global-manage'
  };

  // global presenter objects
  var metadataTree;
  var searchView;
  var tabFolder;
  var metadataView;
  var dataView;
  var fileView;
  var selValueView;
  var selDataView;

  wdat.initialize = function() {
    var bus = new wdat.Bus();
    var api = new wdat.DataAPI('NetworkResource', 'ResourceAdapter', bus);
    // add metadata tree
    metadataTree = new wdat.MetadataTree($('#metadata-tree'), api, bus, events.sel_section);
    metadataTree.load();

    // add search bar
    searchView = new wdat.SearchView($('#search-bar'), bus, events.search, events.search);

    // add tab folder
    tabFolder = new wdat.TabFolder($('#tab-folder'), bus, true);
    bus.subscribe(tabFolder.event('sel'), tabFolder.selectHandler());

    // add metadata view
    var html = $('<div id="metadata-view"></div>');
    metadataView = new wdat.MetadataView(html, api, bus, events.sel_section);
    tabFolder.add(html, 'metadata-view', 'Info');

    // add data view
    html = $('<div id="data-view"></div>');
    dataView = new wdat.DataView(html, api, bus, events.sel_section, events.search);
    tabFolder.add(html, 'data-view', 'Data');

    // add file view
    html = $('<div id="file-view"></div>');
    fileView = new wdat.FileView(html, bus, events.sel_section, events.search);
    tabFolder.add(html, 'file-view', 'Files');

    // add selected values list
    html = $('#sel-value-view');
    selValueView = new wdat.SelectedValueView(html, bus, events.sel_value, events.sel_value_search);

    // add selected data list
    html = $('#sel-data-view');
    selDataView = new wdat.SelectedDataView(html, bus, events.sel_data, events.plot);

    wdat.adjustLayout();
  };

  // values for the layout
  var VSPACE_HEAD = 158;
  var VSPACE_SEARCH = 62;
  var VSPACE_TAB = 34;
  var VSPACE_CUSHION = 6;
  var VSPACE_SEL_VALUES = 240;
  var MOD_METADATA_TREE = 40;
  var MOD_SEL_DATA = 320;
  var MOD_METADATA_VIEW = 133;
  var MOD_DATA_VIEW = 174;
  var MOD_FILE_VIEW = 141;

  wdat.adjustLayout = function() {
    // TODO remove dummy
    var dummy = VSPACE_SEARCH + VSPACE_TAB;
    dummy += 1;
    // calculate heigths
    var w = $(window);
    var vspace = w.height() - VSPACE_HEAD;
    // vspace left
    metadataTree.tree.jq().css('height', vspace - VSPACE_CUSHION - MOD_METADATA_TREE);
    // vspace center
    metadataView._jq.css('height', vspace - VSPACE_CUSHION * 2 - MOD_METADATA_VIEW);
    dataView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_DATA_VIEW);
    fileView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_FILE_VIEW);
    // vspace right
    selValueView.list.jq().css('height', VSPACE_SEL_VALUES);
    selDataView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_SEL_DATA);
  };

})(wdat || (wdat = {}), jQuery);
