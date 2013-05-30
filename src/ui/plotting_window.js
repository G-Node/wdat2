// --------- plotting_window.js --------//

define(['util/strings', 'ui/multi_container', 'ui/model_container'],
    function(strings, MultiContainer, ModelContainer) {
    "use strict";

    /**
     *
     * @param id
     * @param bus
     * @param render_manager
     *
     * @constructor
     * @extends {MultiContainer}
     * @public
     */
    function PlottingWindow(id, bus, api, render_manager) {

        var _bus = bus ,
            _api = api, // TODO violates design principle
            _manager = render_manager,
            _list;

        MultiContainer.apply(this, [id, _WINDOW_TEMPLATE, 'wdat-plotting-window']);

        this._init = function() {
            _list = this.jq().find('.wdat-list');
            _list = new List(_list, _bus, []);
        };
    }

    var _WINDOW_TEMPLATE = '' +
        '<div>' +
            '<div class="list-panel">' +
                '<div class="wdat-list" id="' + this.id() + '"></div>' +
                '<div class="buttons"></div>' +
            '</div>' +
            '<div class="plot-panel"></div>' +
        '</div>';

    return PlottingWindow;
});
