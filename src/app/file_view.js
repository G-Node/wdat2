//--------- file_view.js ---------//

define(['ui/list'], function(List) {

    function FileView(html, bus, selSelection, searchEvent) {
        var _html       = $(html) ,
            _bus        = bus ,
            _id         = _html.attr('id') || _bus.uid() ,
            _api        = api ,
            _selection  = null,
            _actions, _list_actions, _nav, _list;

        this._init = function() {
            var list_id = _id + '-file-list';
            _list = new List(list_id, bus, ['sel']);
            _html.append(_list.jq());
        }

        this._init();
    }

    return FileView;

});
