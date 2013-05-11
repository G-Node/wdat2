//--------- search_bar.js ---------//

/*
 * TODO module description.
 */
define(['ui/template_container'], function (TemplateContainer) {
    "use strict";

    function SearchBar(id, bus, search_action, is_active) {

        var _bus = bus;



    }

    var _SEARCH_BAR_TEMPLATE = '' +
        '<div id="search" class="wdat-search">' +
        '  <div class="search-right">' +
        '    <select id="select-type" class="ui-button ui-widget ui-state-default ui-corner-all">' +
        '      <option value="block">Block</option>' +
        '      <option value="analogsignal">Analogsignal</option>' +
        '    </select>' +
        '    <button id="search-btn">Search</button>' +
        '  </div>' +
        '  <div class="search-left">' +
        '    <input type="text" id="search-field">' +
        '  </div>' +
        '</div>';

    return {};
});
