// --------- plotting_window.js --------//

define(['ui/list', 'ui/model_container'], function(List, ModelContainer) {
    "use strict";

    /**
     *
     * @param bus {Bus}
     * @param api {DataAPI}
     * @param selected_list {List}
     *
     * @constructor
     * @public
     */
    function PlottingView(bus, api, selected_list) {

        var _bus = bus,
            _api = api,
            _sel_list = selected_list,
            _html = $(_WINDOW_TEMPLATE),
            _own_list, _plot_manager;



        this.open = function() {
            var w = $(window),
                width  = w.width() * 0.8,
                height = w.height() * 0.8,
                svg;

            _html.dialog({               // jQuery-UI dialog
                autoOpen: true,     width : width,      height: height,  modal : true,
                draggable: false,   resizable: false,   title: 'Plotting Window',
                buttons : {
                    Close : this._onClose()
                }
            });

            width  = _html.width();
            height = _html.height();

            svg = _html.find('svg');
            svg.attr('width', width - (_LIST_WIDTH + 4 * _BORDER_WIDTH))
               .attr('height', height - 2 * _BORDER_WIDTH)
               .attr('id', 'svg-' + _bus.uid());

            var id = '#' + svg.attr('id');
            svg = d3.select(id);
            _plot_manager = new cry.PlotManager(svg);
            _plot_manager.createContext('signal');
            _plot_manager.addRenderer('signal', new cry.SignalRenderer());
            var signals = new cry.RandomSignal(150, 4, 10000, 5);
            _plot_manager.addSource(signals, 'signal', 'signal');

            _plot_manager.createContext('spike', {yticks: 0});
            _plot_manager.addRenderer('spike', new cry.SpikeRenderer());
            var spikes = new cry.RandomSpikes(150, 1000, 7);
            _plot_manager.addSource(spikes, 'spike', 'spike');

            _plot_manager.plot();

            _html.find('.wdat-list')
                 .attr('id', 'list-' + _bus.uid())
                 .css('width', _LIST_WIDTH)
                 .css('height', height - 2 * _BORDER_WIDTH);

            _own_list = new List(_html.find('.wdat-list'), _bus, []);
            var data = _sel_list.getAll();

            for (var i = 0; i < data.length; i++) {
                _own_list.addContainer(new ModelContainer(null, _bus, [], data[i], true));
            }

        };

        this.close = function() {
            _html.dialog('close');

            _own_list.clear();
            _own_list.remove();
            _own_list = null;

            _html.find('svg').empty();
            _plot_manager = null;

            _html.remove();
        };

        this._onClose = function() {
            var that = this;
            return function () {
                that.close();
            };
        };

        this._onOpen = function() {
            var that = this;
            return function() {
                that.open();
            };
        };
    }


    var _LIST_WIDTH = 200;

    var _BORDER_WIDTH = 10;

    var _WINDOW_TEMPLATE = '' +
        '<div class="wdat-plotting-view">' +
            '<div class="list-panel">' +
                '<div class="wdat-list"></div>' +
                '<div class="buttons"></div>' +
            '</div>' +
            '<div class="plot-panel"><svg></svg></div>' +
        '</div>';

    return PlottingView;
});
