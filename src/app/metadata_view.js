//--------- metadata_view.js ---------//

/*
 * The module defines the presenter class MetadataView
 */
define(['ui/list', 'ui/form', 'ui/section_container', 'ui/property_container'],
    function (List, Form, SectionContainer, PropertyContainer) {
    "use strict";

    /**
     * Constructor for the class MetadataView. This class defines a presenter that reacts on
     * selection and update events from the MetadataTree and displays the selected section and
     * all its properties and values.
     *
     * @param html {jQuery}             The html element where the presenter should include its content.
     * @param api {DataAPI}             A data api object as data source.
     * @param bus {Bus}                 A message bus.
     * @param selSection {String}       An event name for selection events from the metadata tree.
     * @param updateSection {String}    An event name for update events (section update)
     * @param selValue {String}         An event name for value selections.
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
                .append('<h3>Properties</h3>')
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
         * Getter for the html element of the view.
         *
         * @returns {jQuery}
         * @public
         */
        this.html = function() {
            return _html;
        };

        /**
         * Crates a handler function for select events.
         *
         * @returns {Function}
         * @private
         */
        this._onSelect = function() {
            return function(event, data) {
                if (data && data.id && data.type && data.type === 'section') {
                    _api.get(_actions.update, {id: data.id, type: 'section', depth: 2});
                } else {
                    _cont.clear();
                    _list.clear();
                }
            };
        };

        /**
         * Crates a handler function for update events.
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
         * Crates a handler function for section update events.
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
         * Crates a handler function for save property events.
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
         * Crates a handler function for update property events.
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
         * Crates a handler function for property edit events.
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
         * Crates a handler function for property delete events.
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
