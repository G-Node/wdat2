//--------- search_view.js ---------//

define(['ui/search_bar'], function(SearchBar) {

    function SearchView(html, bus, searchEvent) {
        var _html       = $(html) ,
            _bus        = bus ,
            _id         = _html.attr('id') || _bus.uid() ,
            _search_bar;

        this._init = function() {
            _html.addClass('wdat-search-view');

            var search_id = _id + '-search-bar';
            _search_bar = new SearchBar(search_id, _bus, searchEvent)

            _html.append('<h1>Search</h1>');
            _html.append(_search_bar.jq());
        }

        this._init();
    }

    return SearchView;

});
