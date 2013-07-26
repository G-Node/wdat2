//---------- application.js ----------//

define(
    ['api/bus', 'api/data_api', 'ui/tab_folder', 'app/metadata_tree', 'app/search_view',
     'app/metadata_view', 'app/data_view', 'app/file_view', 'app/selected_data_view',
     'app/selected_values_view', 'app/plotting_view'],

    function(Bus, DataAPI, TabFolder, MetadataTree, SearchView, MetadataView, DataView, FileView,
             SelectedDataView, SelectedValuesView, PlottingView) {

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
        // metadataView = new MetadataView(html, api, bus, 'blaselect');
        tabFolder.add(html, 'info');

        // add data view
        html = $('<div id="data-view"></div>');
        dataView = new DataView(html, api, bus, events.sel_section, events.search, events.sel_data);
        // dataView = new DataView(html, api, bus, 'fooselect', events.search);
        tabFolder.add(html, 'data');

        // add file view
        html = $('<div id="file-view"></div>');
        fileView = new FileView(html, api, bus, events.sel_section, events.search);
        // fileView = new FileView(html, api, bus, 'barselect', events.search);
        tabFolder.add(html, 'files');

        // add selected values list
        html = $('#sel-value-view');
        selValueView = new SelectedValuesView(html, api, bus, events.sel_value);

        // add selected data list
        html = $('#sel-data-view');
        selDataView = new SelectedDataView(html, api, bus, events.sel_data, events.plot);

        window.pv = new PlottingView(bus, api, selDataView.list(), events.plot);

        adjustLayout();
    }

    function adjustLayout() {
        // calculate heigths
        var w = $(window);
        var vspace = w.height() - VSPACE_HEAD;
        // vspace left
        metadataTree.tree().jq().css('height', vspace - VSPACE_CUSHION - MOD_METADATA_TREE);
        // vspace center
        metadataView.html().css('height', vspace - VSPACE_CUSHION * 2 - VSPACE_SEARCH - MOD_METADATA_VIEW);
        dataView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - VSPACE_SEARCH - MOD_DATA_VIEW);
        fileView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - VSPACE_SEARCH - MOD_FILE_VIEW);
        // vspace right
        selValueView.list().jq().css('height', VSPACE_SEL_VALUES);
        selDataView.list().jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_SEL_DATA);
    }

    // constant values for the layout
    var VSPACE_HEAD = 230;
    var VSPACE_SEARCH = 62;
    var VSPACE_TAB = 34;
    var VSPACE_CUSHION = 6;
    var VSPACE_SEL_VALUES = 193;
    var MOD_METADATA_TREE = 37;
    var MOD_SEL_DATA = 306;
    var MOD_METADATA_VIEW = 45;
    var MOD_DATA_VIEW = 78;
    var MOD_FILE_VIEW = 45;

    return {
        initialize:     initialize ,
        adjustLayout:   adjustLayout
    };
});
