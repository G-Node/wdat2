//---------- data_view.js ---------//

define(['api/model_helpers', 'util/objects', 'ui/list', 'ui/model_container', 'ui/bread_crumb'],
    function(model_helpers, objects, List, ModelContainer, BreadCrumb) {
    "use strict";

    function DataView(html, api, bus, selSection, searchEvent) {
        var _html       = $(html) ,
            _bus        = bus ,
            _id         = _html.attr('id') || _bus.uid() ,
            _api        = api ,
            _selection  = null,
            _actions, _list_actions, _nav, _list;

        /** @type {{active: *, param: *, string: *, type: *, error: *}} */
        var _search = _NULL_SEARCH;

        this._init = function() {

            _actions = {
                sel:            selSection,
                search:         searchEvent,
                nav:            _id + '-nav',
                update:         _id + '-udate',
                update_single:  _id + '-update-single'
            };

            _list_actions = {
                sel:            _id + '-sel-data',
                edit:           _id + '-edit'
            };

            _html.attr('id', _id)
                .addClass('wdat-data-view');

            var nav_id  = _id + '-bread-crumb',
                list_id = _id + '-data-list';

            _nav = new BreadCrumb(nav_id, _bus, _actions.nav);
            _nav.add({id: 'root', name: '>>'});
            _html.append(_nav.jq());

            _list = new List(list_id, _bus, _list_actions);
            _html.append(_list.jq());

            _bus.subscribe(_actions.sel, this._onSelect());
            _bus.subscribe(_actions.search, this._onSearch());
            _bus.subscribe(_actions.update, this._onUpdate());
            //_bus.subscribe(_actions.update_single, this._onUpdateSingle());
            _bus.subscribe(_list_actions.sel, this._onSelectData());
            //_bus.subscribe(_list_actions.edit, this._onEditData());
            _bus.subscribe(_actions.nav, this._onNavigate());
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

        this.requestData = function(event) {
            var search_param,
                user = _api.currentUser();

            if (_selection) {
                switch (_selection.id) {
                    case 'own-all':
                        search_param = _searchOwn(_search, user.id);
                        break;
                    case 'shared-all':
                        search_param = _searchShared(_search, user.id);
                        break;
                    case 'public-all':
                        search_param = _searchPublic(_search, user.id);
                        break;
                    default:
                        if (_SPECIAL_NODES.indexOf(_selection.id) < 0) {
                            search_param = _searchBySection(_selection);
                        } else {
                            search_param = null;
                        }
                }
            } else {
                search_param = null;
            }

            if (search_param) {
                _api.get(event, search_param);
            }
        };

        this._onSelect = function() {
            var that = this;
            return function(event, data) {
                if (data && data.id) {
                    _nav.del(1);
                    if (data.type === 'section') {
                        _selection = data;
                    } else if (_SPECIAL_NODES.indexOf(data.id) >= 0) {
                        _selection = data;
                    } else {
                        _selection = null;
                    }
                } else {
                    _selection = null;
                }
                that.requestData(_actions.update);
            };
        };

        this._onSearch = function() {
            var that = this;
            return function(event, data) {
                if (data) {
                    _search = data;
                } else {
                    _search = _NULL_SEARCH;
                }
                that.requestData(_actions.update);
            };
        };

        this._onUpdate = function() {
            return function(event, data) {
                if (data && data.primary) {
                    _list.clear();

                    if (data.info) {
                        if (_nav.has(data.info)) {
                            _nav.select(data.info);
                        } else {
                            _nav.add(data.info)
                        }
                    } else {
                        _nav.del(1);
                    }

                    for (var i = 0; i < data.primary.length; i++) {
                        var d = data.primary[i];
                        _list.add(d, d.type);
                    }
                }
            };
        };

        this._onSelectData = function() {
            return function(event, data) {
                var urls = [];

                if (data && data.children) {
                    for (var childfield in data.children) {
                        if (data.children.hasOwnProperty(childfield)) {
                            urls = urls.concat(data.children[childfield]);
                        }
                    }
                }

                if (urls.length > 0) {
                    _api.getByURL(_actions.update, urls, 0, data);
                }
            };
        };

        this._onNavigate = function() {
            var that = this;
            return function(event, data) {
                if (data && data.id === 'root') {
                    that.requestData(_actions.update);
                } else {
                    var urls = [];

                    if (data && data.children) {
                        for (var childfield in data.children) {
                            if (data.children.hasOwnProperty(childfield)) {
                                urls = urls.concat(data.children[childfield]);
                            }
                        }
                    }

                    if (urls.length > 0) {
                        _api.getByURL(_actions.update, urls, 0, data);
                    }
                }
            }
        }

        this._init();
    } // end DataView

    function _searchOwn(search, id) {
        var search_created;
        if (search.param) {
            search_created = objects.deepCopy(search.param);
            for (var i = 0; i < search_created.length; i++) {
                search_created[i].owner = id;
            }
        } else {
            search_created = [{type: search.type, owner: id}];
        }
        return search_created;
    }

    function _searchShared(search, id) {
        var search_created;
        if (search.param) {
            search_created = objects.deepCopy(search.param);
            for (var i = 0; i < search_created.length; i++) {
                search_created[i].owner = [id, '!='];
                search_created[i].safety_level = 'friendly';
            }
        } else {
            search_created = [{type: search.type, owner: [id, '!='], safety_level: 'friendly'}];
        }
        return search_created;
    }

    function _searchPublic(search, id) {
        var search_created;
        if (search.param) {
            search_created = objects.deepCopy(search.param);
            for (var i = 0; i < search_created.length; i++) {
                search_created[i].owner = [id, '!='];
                search_created[i].safety_level = 'public';
            }
        } else {
            search_created = [{type: search.type, owner: [id, '!='], safety_level: 'public'}];
        }
        return search_created;
    }

    function _searchBySection(section) {
        return {type: 'block', parent: section.id};
    }

    var _SPECIAL_NODES = ['own-not-annotated', 'own-all', 'shared-not-annotated',
                          'shared-all', 'public-not-annotated', 'public-all'];

    var _NULL_SEARCH = {active: false, param: null, string: "",
                        type: "block", error: null};

    return DataView;
});
