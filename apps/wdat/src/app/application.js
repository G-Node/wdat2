// ---------- file: application.js ---------- //

(function() {
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

  WDAT.initialize = function() {
    var bus = new WDAT.Bus();
    var api = new WDAT.DataAPI('NetworkResource', 'ResourceAdapter', bus);
    // add metadata tree
    metadataTree = new WDAT.MetadataTree($('#metadata-tree'), api, bus, events.sel_section);
    metadataTree.load();

    // add search bar
    searchView = new WDAT.SearchView($('#search-bar'), bus, events.search, events.search);

    // add tab folder
    tabFolder = new WDAT.TabFolder($('#tab-folder'), bus, true);
    bus.subscribe(tabFolder.event('sel'), tabFolder.selectHandler());

    // add metadata view
    var html = $('<div id="metadata-view"></div>');
    metadataView = new WDAT.MetadataView(html, api, bus, events.sel_section);
    tabFolder.add(html, 'metadata-view', 'Info');

    // add data view
    html = $('<div id="data-view"></div>');
    dataView = new WDAT.DataView(html, api, bus, events.sel_section, events.search);
    tabFolder.add(html, 'data-view', 'Data');

    // add file view
    html = $('<div id="file-view"></div>');
    fileView = new WDAT.FileView(html, bus, events.sel_section, events.search);
    tabFolder.add(html, 'file-view', 'Files');

    // add selected values list
    html = $('#sel-value-view');
    selValueView = new WDAT.SelectedValueView(html, bus, events.sel_value, events.sel_value_search);

    // add selected data list
    html = $('#sel-data-view');
    selDataView = new WDAT.SelectedDataView(html, bus, events.sel_data, events.plot);

    WDAT.adjustLayout();
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

  WDAT.adjustLayout = function() {
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

}());
