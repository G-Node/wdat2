//--------- property_container.js ---------//

/*
 * This module defines the class PropertyContainer
 */
define(['util/objects', 'util/strings', 'ui/button', 'ui/container'],
    function(objects, strings, Button, Container) {
    "use strict";


    /**
     * A container that displays property and value data.
     * TODO Implement missing methods.
     *
     * @param id {String|jQuery}        The id of the list or a jQuery object.
     * @param bus {Bus}                 Bus for events.
     * @param actions {Array|Object}    Array or Object defining events for the list.
     * @param property {Object}         The property data to display.
     * @param values {Array}            The values of the property.
     *
     * @constructor
     * @extends {Container}
     * @public
     */
    function PropertyContainer(id, bus, actions, property, values) {

        var _actions = actions || PropertyContainer.ACTIONS,
            _bus = bus,
            _property = property || {},
            _values = values || [];

        Container.apply(this, [id]);

        /**
         * @private
         */
        this._init = function() {
            // set actions
            var act, i;
            if (actions instanceof Array) {
                for (i = 0; i < actions.length; i++) {
                    act = actions[i];
                    _actions[act] = this.toID(act);
                }
            } else {
                for (act in actions) {
                    if (actions.hasOwnProperty(act)) {
                        _actions[act] = actions[act] || this.toID(act);
                    }
                }
            }
        };

        /**
         * Set the property of the container.
         *
         * @param data {Object}       The property of the container.
         *
         * @returns {PropertyContainer} The container object.
         * @public
         */
        this.set = function(property) {
            _property = property || {};
            this.refresh();
            return this;
        };

        /**
         * Get the property from the container.
         *
         * @returns {Object} The property.
         * @public
         */
        this.get = function() {
            return _property;
        };

        /**
         * Set the values.
         *
         * @param values {Array}    The values to set.
         *
         * @return {PropertyContainer} The container object.
         * @public
         */
        this.setValues = function(values) {
            _values = values || [];
            this.refresh();
            return this;
        };

        /**
         * Return all values.
         *
         * @returns {Array}
         * @public
         */
        this.getValues = function() {
            return _values;
        };

        /**
         * Add a value.
         *
         * @param value {Object}    The value to add.
         *
         * @returns {PropertyContainer}
         * @public
         */
        this.addValue = function(value) {
            _values.push(value);
            this.refresh();
            return this;
        } ;

        /**
         * Delete a value.
         *
         * @param id {Number}   The id of the value to delete.
         *
         * @returns {PropertyContainer}
         * @public
         */
        this.delValue = function(id) {
            var found = -1;
            for (var i = 0; i < _values.length; i++) {
                if (_values[i].id === id) {
                    found = i;
                    break;
                }
                if (found >= 0) {
                    delete _values[i];
                }
            }
            return this;
        };


        /**
         * Refresh or create the whole content of the container.
         *
         * @public
         */
        this.refresh = function() {
            var id = this.id(),
                property_orig = _property || {},
                property_copy = objects.deepCopy(property_orig),
                jq;

            // add dummies
            if (property_orig.id) {
                property_copy.id = strings.urlToID(property_orig.id);
            }
            if (!property_copy.fields) {
                property_copy.fields = {};
            }

            // sort values
            _values.sort(function(a, b) {
                if (a.name < b.name)
                    return -1;
                else if (a.name > b.name)
                    return 1;
                else
                    return 0
            });

            // create a string representation of all values
            var values_str = "";
            for (var i = 0; i < _values.length; i++) {
                values_str += _values[i].name;
                if (i < _values.length - 1) {
                    values_str += ",&nbsp;"
                }
            }

            // create jQuery object from template
            jq = $($.jqote(_COMPILED_TEMPLATE, {property: property_copy, values: values_str})).attr('id', id);

            // postprocessing
            var buttons = jq.children(".buttons") ,
                btn, click;

            btn = new Button(jq.find('.share-btn'), 'Share', _bus, _actions.share, property_orig);
            btn = new Button(null, 'more', _bus, this._expandHandler());
            buttons.append(btn.jq());
            for (var act in _actions) {
                if (_actions.hasOwnProperty(act)) {
                    click = _actions[act];
                    btn   = new Button(null, act + '_small', _bus, click, property_orig);
                    buttons.append(btn.jq());
                }
            }

            // replace content
            this.jq(jq);
        };

        /**
         * @private
         */
        this._postprocess = function(jq, data, actions) {
            var buttons = jq.children(".buttons") ,
                btn, click;

            btn = new Button(null, 'more', _bus, this._expandHandler());
            buttons.append(btn.jq());
            for (var act in actions) {
                if (actions.hasOwnProperty(act)) {
                    click = actions[act];
                    btn   = new Button(null, act + '_small', _bus, click, data);
                    buttons.append(btn.jq());
                }
            }

        };

        /**
         * Returns a handler for expand events (for internal use only)
         *
         * @returns {Function}
         */
        this._expandHandler = function() {
            var that = this;
            return function() {
                that.jq().children('.secondary').toggleClass('hidden');
            };
        };

        this.refresh();
    }

    var _PROPERTY_TEMPLATE = '' +
        '<div id="<%= this.dom_id %>" class="wdat-container">' +
            '<div class="buttons"></div>' +
            '<div class="primary">' +
                '<span class="head"><%= this.property.name %></span>' +
                '<span class="head-add">=&nbsp;<%= this.values || "n.a." %></span>' +
            '</div>' +
            '<div class="secondary hidden">' +
                '<hr>' +
                '<h3>Fields</h3>' +
                '<div class="properties">' +
                    '<div class="field">' +
                        '<div class="field-name">ID</div>' +
                        '<div class="field-val"><%= this.property.id %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Name</div>' +
                        '<div class="field-val"><%= this.property.name %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Values</div>' +
                        '<div class="field-val"><%= this.values || "n.a." %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Uncertainty</div>' +
                        '<div class="field-val"><%= this.property.fields.uncertainty || "n.a." %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Definition</div>' +
                        '<div class="field-val"><%= this.property.fields.definition || "n.a." %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Creation Date</div>' +
                        '<div class="field-val"><%= this.property.fields.date_created || "n.a." %></div>' +
                    '</div>' +
                '</div>' +
                '<h3>Security</h3>' +
                '<div class="properties">' +
                    '<div class="field">' +
                        '<div class="field-name">Safety Level</div>' +
                        '<div class="field-val"><%= this.property.safety_level || "n.a." %></div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name">Shared With</div>' +
                        '<div class="field-val">' +
                        '<% for (person in this.shared_with) { %>' +
                        '<%= person + "&nbsp(" + this.shared_with[person] + ");"%>' +
                        '<% } %>' +
                        '</div>' +
                    '</div>' +
                    '<div class="field">' +
                        '<div class="field-name"></div>' +
                        '<div class="field-val"><button class="share-btn"></button></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';


    var _COMPILED_TEMPLATE = $.jqotec(_PROPERTY_TEMPLATE);

    PropertyContainer.ACTIONS = ['edit', 'del'];

    return PropertyContainer;

});
