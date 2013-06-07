//--------- selected_data_view.js ---------//

define(['ui/list', 'ui/model_container', 'ui/button'], function(List, ModelContainer, Button) {

    function SelectedDataView(html, api, bus, selData, doPlot) {
        var _html       = $(html),
            _bus        = bus,
            _id         = _html.attr('id') || _bus.uid(),
            _api        = api,
            _actions, _list_actions, _list;

        this._init = function() {
            _html.addClass('wdat-selected-data-view');

            _actions = {
                sel:    selData || _id + '-data-sel',
                plot:   doPlot  || _id + '-data-plot'
            };

            _list_actions = {
                del:    _id + '-data-remove'
            };

            var list_id = _id + '-data-list';
            _list = new List(list_id, bus, _list_actions);

            var btn = new Button(null, 'Plot Selection', _bus, doPlot);

            _html.append('<h1>Selected Data</h1>');
            _html.append(_list.jq());
            _html.append('<div class="panel-buttons"></div>');
            _html.find('.panel-buttons').append(btn.jq());

            _bus.subscribe(_actions.sel, this._onSelect());
            _bus.subscribe(_list_actions.del, this._onDelete());
        };


        /**
         * Getter for html element of the view.
         *
         * @returns {jQuery}
         * @public
         */
        this.html = function() {
            return _html;
        };

        /**
         * Getter for the list widget.
         *
         * @returns {List}
         * @public
         */
        this.list = function() {
            return _list;
        };


        this._onSelect = function() {
            return function(event, data) {

                var cont = new ModelContainer(null, _bus, _list_actions, data, true);
                _list.addContainer(cont);

            };
        }

        this._onDelete = function() {
            return function(event, data) {

                _list.del(data)

            }
        };

        this._init();
    }

    return SelectedDataView;

});
