//--------- property_container.js ---------//

/*
 * This module defines the class PropertyContainer
 */
define(['ui/button', 'ui/template_container'], function(Button, TemplateContainer) {
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
     * @extends {TemplateContainer}
     * @public
     */
    function PropetyContainer(id, bus, actions, property, values) {
        var _bus = bus ,
            _values = values;

        TemplateContainer.apply(this, [id, _PROPERTY_TEMPLATE, actions || _ACTIONS, property]);

        this.setValues = function(values) {
            // implement
        };

        this.getValues = function() {
            // implement
        };

        this.addValue = function(value) {
            // implement
        } ;

        this.delValue = function(id) {
            // implement
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

    var _ACTIONS = ['add', 'edit'];

    var _PROPERTY_TEMPLATE =  '' +
        '<div id="<%= this.dom_id %>" class="wdat-container">' +
        '<div class="buttons"></div>' +
        '<div class="primary">' +
        '  <span class="head"><%= this.name || "unnamed section"%></span>' +
        '  <span class="head-add"></span></div>' +
        '<div class="secondary hidden"><h3>Fields</h3><dl class="tabular">' +
        '  <dt>Name:</dt><dd><%= this.name || "unnamed section"%></dd>' +
        '  <dt>Creation Date:</dt><dd><%= this.fields.date_created || "n.a."%></dd>' +
        '</dl><h3>Security</h3><dl class="tabular">' +
        '  <dt>Safety Level:</dt><dd><%= this.safety_level || "n.a."%></dd>' +
        '  <dt>Shared With:</dt><dd><%="TODO"%></dd>' +
        '</dl></div></div>';

});
