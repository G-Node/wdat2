//---------- application.js ----------//

define(
    ['api/bus', 'api/data_api', 'ui/tab_folder', 'app/metadata_tree', 'app/search_view',
     'app/metadata_view', 'app/data_view', 'app/file_view', 'app/selected_data_view', 'app/selected_values_view'],

    function(Bus, DataAPI, TabFolder, MetadataTree, SearchView, MetadataView, DataView, FileView,
             SelectedDataView, SelectedValuesView) {

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
    var metadataTree,
        searchView,
        tabFolder,
        metadataView,
        dataView,
        fileView,
        selValueView,
        selDataView;

    function initialize() {
        var bus = new Bus();
        var api = new DataAPI(bus);
        // add metadata tree
        metadataTree = new MetadataTree($('#metadata-tree'), api, bus, events.sel_section);
        metadataTree.load();

        // add search bar
        searchView = new SearchView($('#search-bar'), bus, events.search);

        // add tab folder
        tabFolder = new TabFolder($('#tab-folder'), bus, true);
        bus.subscribe(tabFolder.event('sel'), tabFolder.selectHandler());

        // add metadata view
        var html = $('<div id="metadata-view"></div>');
        metadataView = new MetadataView(html, api, bus, events.sel_section);
        tabFolder.add(html, 'info');

        // add data view
        html = $('<div id="data-view"></div>');
        dataView = new DataView(html, api, bus, events.sel_section, events.search);
        tabFolder.add(html, 'data');

        // add file view
        html = $('<div id="file-view"></div>');
        fileView = new FileView(html, api, bus, events.sel_section, events.search);
        tabFolder.add(html, 'files');

        // add selected values list
        html = $('#sel-value-view');
        selValueView = new SelectedValuesView(html, api, bus, events.sel_value);

        // add selected data list
        html = $('#sel-data-view');
        selDataView = new SelectedDataView(html, api, bus, events.sel_data, events.plot);

        adjustLayout();
    }

    function adjustLayout() {
        // calculate heigths
        var w = $(window);
        var vspace = w.height() - VSPACE_HEAD;
        // vspace left
        metadataTree.tree().jq().css('height', vspace - VSPACE_CUSHION - MOD_METADATA_TREE);
        // vspace center
        metadataView.html().css('height', vspace - VSPACE_CUSHION * 2 - MOD_METADATA_VIEW);
        dataView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_DATA_VIEW);
        fileView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_FILE_VIEW);
        // vspace right
        selValueView.list().jq().css('height', VSPACE_SEL_VALUES);
        selDataView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_SEL_DATA);
    }

    // constant values for the layout
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

    return {
        initialize:     initialize ,
        adjustLayout:   adjustLayout
    };
});
