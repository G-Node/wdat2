//--------- selected_data_view.js ---------//

define(['ui/list'], function(List) {

    function SelectedDataView(html, api, bus, selSelection, searchEvent) {
        var _html       = $(html) ,
            _bus        = bus ,
            _id         = _html.attr('id') || _bus.uid() ,
            _api        = api ,
            _selection  = null,
            _actions, _list_actions, _nav, _list;

        this._init = function() {
            _html.addClass('wdat-selected-data-view');
            var list_id = _id + '-data-list';
            _list = new List(list_id, bus, ['sel']);

            _html.append('<h1>Selected Data</h1>');
            _html.append(_list.jq());

            _list.add({id: 'dummy', name: 'A NEO element'});
        }

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

        this._init();
    }

    return SelectedDataView;

});