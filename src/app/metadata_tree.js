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
                save:       _id + '-save' ,
                edit:       _id + '-edit' ,
                del:        _id + '-delete' ,
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
         *
         * @returns {Function}
         * @private
         */
        this._onExpand = function() {
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
        this._onSelect = function() {
            var that = this;

            return function(event, data) {
                // TODO implement
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
        {id: 'own-metadata', name: 'Metadata', parent_id: null},
        {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true},
        {id: 'shared', name: 'Shared Objects', parent_id: null},
        {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared'},
        {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true},
        {id: 'public', name: 'Public Objects', parent_id: null},
        {id: 'public-metadata', name: 'Metadata', parent_id: 'public'},
        {id: 'public-all', name: 'All Data', parent_id: 'public', isleaf: true}
    ];

    return MetadataTree;
});
