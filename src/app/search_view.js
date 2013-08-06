//--------- search_view.js ---------//

define(['ui/search_bar'], function(SearchBar) {

    function SearchView(html, bus, searchEvent, searchState) {
        var _html       = $(html) ,
            _bus        = bus ,
            _id         = _html.attr('id') || _bus.uid() ,
            _search_bar;

        this._init = function() {
            _html.addClass('wdat-search-view');

            var search_id = _id + '-search-bar';
            _search_bar = new SearchBar(search_id, _bus, searchEvent)
            _bus.subscribe(searchState, _searchStateHandler);

            _html.append('<h1>Search</h1>');
            _html.append(_search_bar.jq());
        }

        function _searchStateHandler(event, state) {
            var final_state = true;
            for (var s in state) {
                if (state.hasOwnProperty(s)) {
                    final_state = final_state && state[s];
                }
            }
            if (final_state) {
                _search_bar.enable();
            } else {
                _search_bar.disable();
            }
        }

        this._init();
    }

    return SearchView;

});
