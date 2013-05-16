//--------- metadata_view.js ---------//

/*
 * TODO module description.
 */
define(['ui/list', 'ui/Form', 'ui/section_container', 'ui/model_container'], function (List, Form, SectionContainer, ModelContainer) {
    "use strict";

    function MetadataView(html, api, bus, selSection, selValue) {

        var _html = $(html) ,
            _bus  = bus ,
            _id   = _html.attr('id') || _bus.uid() ,
            _api  = api ,
            _actions, _list_actions, _cont, _list, _form;

        /**
         * @private
         */
        this._init = function() {

            _list_actions = {
                edit:       _id + '-property-edit' ,
                del:        _id + '-property-delete'
            };

            _actions = {
                sel:            selSection || _id + '-select' ,
                sel_value:      selValue || _id + '-value-select' ,
                add_prop:       _id + '-property-add' ,
                save_prop:      _id + '-property-save' ,
                update:         _id + '-update' ,
                update_prop:    _id + '-update-prop' ,
                update_sec:     _id + '-update-sec'
            };

            var list_id = _id + '-properties';
            var cont_id = _id + '-section';
            var form_id = _id + '-property-form';

            _cont = new SectionContainer(cont_id, _bus, []);
            _list = new List(list_id, _bus, _list_actions);
            _form = new Form(form_id, _bus, {save: _actions.save}, 'section', true);
            _form.set({});

            _html.attr('id', _id)
                .addClass('wdat-metadata-view')
                .append(_cont.jq())
                .append('<div class=view-buttons></div>')
                .append(_list.jq());


            // subscribe event handlers
            _bus.subscribe(_actions.sel, this._onSelect());
            _bus.subscribe(_actions.update, this._onUpdate());
            _bus.subscribe(_actions.update_sec, this._onUpdateSection());
            _bus.subscribe(_actions.save_prop, this._onSaveProperty());
            _bus.subscribe(_actions.update_prop, this._onUpdateProperty());

            _bus.subscribe(_list_actions.edit, this._onEditProperty());
            _bus.subscribe(_list_actions.del, this._onDeleteProperty());
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onSelect = function() {
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
            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdateSection = function() {
            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onSaveProperty = function() {
            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdateProperty = function() {
            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onEditProperty = function() {
            return function(event, data) {
                // TODO implement
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onDeleteProperty = function() {
            return function(event, data) {
                // TODO implement
            };
        };

        this._init();
    }

    return MetadataView;
});
