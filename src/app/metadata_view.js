//--------- metadata_view.js ---------//

/*
 * TODO module description.
 */
define(['ui/list', 'ui/Form', 'ui/section_container', 'ui/property_container'],
    function (List, Form, SectionContainer, PropertyContainer) {
    "use strict";

    /**
     *
     * @param html
     * @param api
     * @param bus
     * @param selSection
     * @param updateSection
     * @param selValue
     *
     * @constructor
     * @public
     */
    function MetadataView(html, api, bus, selSection, updateSection, selValue) {

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
                update_sec:     updateSection || _id + '-update-sec'
            };

            var list_id = _id + '-properties';
            var cont_id = _id + '-section';
            var form_id = _id + '-property-form';

            _cont = new SectionContainer(cont_id, _bus, []);
            _list = new List(list_id, _bus, _list_actions);
            _form = new Form(form_id, _bus, {save: _actions.save_prop}, 'section', true);
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
                if (data && data.id) {
                    _api.get(_actions.update, {id: data.id, type: 'section', depth: 2});
                } else {
                    _cont.clear();
                    _list.clear();
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdate = function() {
            return function(event, data) {
                /** @type {[{property: {Object}, values: Array}]} */
                var properties = [];
                var section = null;

                if (data.primary.length > 0) {
                    section = data.primary[0];

                    for (var i = 0; i < section.children.property_set.length; i++) {
                        var p_id = section.children.property_set[i];
                        var property = data.secondary[p_id];

                        var values = [];
                        for (var j = 0; j < property.children.value_set.length; j++) {
                            var v_id = property.children.value_set[j];
                            values.push(data.secondary[v_id]);
                        }

                        properties[i] = {property: property, values: values};
                    }

                    _cont.set(section);
                    _list.clear();
                    for (i = 0; i < properties.length; i++) {
                        var p = properties[i].property ,
                            v = properties[i].values ,
                            c = new PropertyContainer(null, _bus, _list_actions, p, v);
                        _list.addContainer(c);
                    }
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdateSection = function() {
            return function(event, data) {
                if (data && data.id) {
                    _api.get(_actions.update, {id: data.id, type: 'section', depth: 2});
                } else {
                    _cont.clear();
                    _list.clear();
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onSaveProperty = function() {
            return function(event, data) {
                if (data) {
                    _api.set(_actions.update_prop, data);
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onUpdateProperty = function() {
            return function(event, data) {
                if (data.action.del) {
                    _list.del(data.info);
                } else if (data.primary.length > 0) {
                    _list.set(data.primary[0]);
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onEditProperty = function() {
            return function(event, data) {
                if (data) {
                    _form.set(data);
                    _form.open();
                }
            };
        };

        /**
         *
         * @returns {Function}
         * @private
         */
        this._onDeleteProperty = function() {
            return function(event, data) {
                if (data && data.id) {
                    _api.del(_actions.update_prop, data.id, data.id);
                }
            };
        };

        this._init();
    }

    return MetadataView;
});
