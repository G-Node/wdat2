//--------- metadata_tree.js ---------//

/*
 * TODO module description.
 */
define(['ui/tree'], function (Tree) {
    "use strict";

    /**
     *
     * @param html
     * @param api
     * @param bus
     * @param selEvent
     *
     * @constructor
     * @public
     */
    function MetadataTree(html, api, bus, selEvent) {

        var _id = bus.uid() ,
            _html = $(html) ,
            _bus  = bus ,
            _api  = api ,
            _sel  = selEvent || _id + '-select',
            _tree, _actions, _tree_actions, _form;

        /**
         * @private
         */
        this._init = function() {
            _tree_actions = {
                sel:        _sel ,
                edit:       _id + '-edit' ,
                del:        _id + '-delete' ,
                add:        _id + '-add' ,
                expand:     _id + '-expand' ,
                collapse:   _id + '-collapse'
            };

            _actions = {
                save:       _id + '-save',    // save events from forms
                load:       _id + '-load',    // DataAPI response to load events
                update:     _id + '-update'   // DataAPI response to update events
            };

            _tree = new Tree(_id + '-mdata-tree', _bus, _tree_actions);

            _html.attr('id', _id)
                 .addClass('wdat-metadata-tree')
                 .append('<h1>Metadata Browser</h1>')
                 .append(_tree.jq())
                 .append('<div class=tree-buttons></div>');

            // subscribe handlers for internal events
            _bus.subscribe(_actions.save, this._onSave());
            _bus.subscribe(_actions.update, this._onUpdate());
            _bus.subscribe(_actions.load, this._onLoad());
            // subscribe handlers for tree events
            _bus.subscribe(_tree_actions.del, this._onDelete());
            _bus.subscribe(_tree_actions.edit, this._onEdit());
            _bus.subscribe(_tree_actions.edit, this._onEdit());
            _bus.subscribe(_tree_actions.expand, this._onExpand());
            _bus.subscribe(_tree_actions.collapse, this._onExpand());
            // publish tree selections as external event
            _bus.subscribe(_tree_actions.sel, this._onSelect());
        };

        /**
         * Loads some default nodes to the tree
         *
         * @public
         */
        this.load = function() {
            for (var i = 0; i < _PREDEF_NODES.length; i++) {
                var node =  _PREDEF_NODES[i];
                _tree.add(node, node.parent_id, node.isleaf);
            }
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onSave = function() {
            var that = this;

            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdate = function() {
            var that = this;

            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onLoad = function() {
            return function(event, data) {
                if (!data.error) {
                    for (var i = 0; i < data.primary.length; i++) {
                        var section = data.primary[i];

                        if (data.info && _isPredefNode(data.info)) {
                            _tree.add(section, data.info);
                        } else {
                            _tree.add(section, section.parents.parent_section);
                        }
                    }
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onDelete = function() {
            var that = this;

            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onEdit = function() {
            var that = this;

            return function(event, data) {
                // TODO implement
            };
        };

        /**
         * Crates a handler for expand events.
         * It requests missing children of a node from the DataAPI, the response of
         * the DataAPI will trigger a load event.
         *
         * @returns {Function} A function that handles expand events
         * @private
         */
        this._onExpand = function() {
            return function(event, data) {
                var evname  = event.type ,
                    id      = data.id || data ,
                    user    = _api.currentUser() ,
                    search  = null ,
                    info    = null;

                if (evname === _tree_actions.expand) {
                    if (_isPredefNode(id)) {
                        switch (id) {
                            case 'own-metadata':
                                search = {type: 'section', parent: null, owner: user.id};
                                info   = 'own-metadata';
                                break;
                            case 'shared-metadata':
                                search = {type: 'section', parent: null, owner: [user.id, '!='], safety_level: 'friendly'};
                                info   = 'shared-metadata';
                                break;
                            case 'public-metadata':
                                search = {type: 'section', parent: null, owner: [user.id, '!='], safety_level: 'public'};
                                info   = 'public-metadata';
                                break;
                        }
                    } else {
                        search = {type: 'section', parent: id};
                    }
                    if (search) {
                        _api.get(_actions.load, search, info);
                    }
                } else if (evname === _tree_actions.collapse) {
                    _tree.delChildren(data);
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onSelect = function() {
            var that = this;

            return function(event, data) {
                _tree.select(data.id, true);
            };
        };

        this._init();
    }

    /**
     * Helper function that determines if a node is a predefined node or not.
     *
     * @param id {String}      The id of a node
     *
     * @return {Boolean} True if the node is a predefined node, false otherwise.
     * @private
     */
    function _isPredefNode(id) {
        var predef = false;

        for (var i = 0; i < _PREDEF_NODES.length; i++) {
            var node =  _PREDEF_NODES[i];
            if (node.id === id) {
                predef = true;
                break;
            }
        }

        return predef;
    }

    /**
     * Some predefined nodes that are loaded into the tree
     */
    var _PREDEF_NODES = [
        {id: 'own-metadata', name: 'Metadata', parent_id: null, type: 'predef'},
        {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true, type: 'predef'},
        {id: 'shared', name: 'Shared Objects', parent_id: null, type: 'predef'},
        {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared', type: 'predef'},
        {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true, type: 'predef'},
        {id: 'public', name: 'Public Objects', parent_id: null, type: 'predef'},
        {id: 'public-metadata', name: 'Metadata', parent_id: 'public', type: 'predef'},
        {id: 'public-all', name: 'All Data', parent_id: 'public', isleaf: true, type: 'predef'}
    ];

    return MetadataTree;
});
