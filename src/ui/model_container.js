//--------- model_container.js ---------//

/*
 * This module defines the class ModelContainer.
 */
define(['ui/button', 'ui/template_container'], function (Button, TemplateContainer) {
    "use strict";


    /**
     * Constructor of the class ModelContainer. ModelContainer can display a single
     * instance of a data model object in an expendable container.
     *
     * @param id {String|jQuery}        The id of the container or a jQuery object.
     * @param bus {Bus}                 Bus for events.
     * @param actions {Array|Object}    Array or Object defining events.
     * @param data {Object}             The model data to display.
     *
     * @constructor
     * @extends {TemplateContainer}
     * @public
     */
    function ModelContainer(id, bus, actions, data) {

        var _bus = bus;

        TemplateContainer.apply(this, [id, _template(data), actions || _ACTIONS, data]);

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
         * @returns {Function} The expand handler.
         */
        this._expandHandler = function() {
          var that = this;
          return function() {
            that.jq().children('.secondary').toggleClass('hidden');
          };
        };

        this.refresh();

    }

    /**
     * Select the right template and return the template as string.
     *
     * @param data {Object}     The data object to find a template for.
     *
     * @returns {String} The template.
     * @private
     */
    function _template(data) {
        if (typeof(data) === 'string' && _MODEL_TEMPLATES.hasOwnProperty(data)) {
            return _MODEL_TEMPLATES[data];
        } else if (typeof(data) === 'object' && _MODEL_TEMPLATES.hasOwnProperty(data.type)) {
            return _MODEL_TEMPLATES[data.type];
        } else {
            return _DEFAULT_TEMPLATE;
        }
    }

    /**
     * Predefined model templates.
     */
    var _MODEL_TEMPLATES = {

        section: '' +
            '<div id="<%= this.dom_id %>" class="wdat-container">' +
            '<div class="buttons"></div>' +
            '<div class="primary">' +
            '  <span class="head"><%= this.name || "unnamed section"%></span>' +
            '  <span class="head-add"></span></div>' +
            '<div class="secondary hidden"><h3>Fields</h3><dl class="tabular">' +
            '  <dt>Name:</dt><dd><%= this.name || "unnamed section"%></dd>' +
            '  <dt>Type:</dt><dd><%= this.fields.odml_type || "n.a."%></dd>' +
            '  <dt>Description:</dt><dd><%= this.fields.description || "n.a."%></dd>' +
            '  <dt>Position:</dt><dd><%= this.fields.tree_position || "n.a."%></dd>' +
            '  <dt>Creation Date:</dt><dd><%= this.fields.date_created || "n.a."%></dd>' +
            '</dl><h3>Security</h3><dl class="tabular">' +
            '  <dt>Safety Level:</dt><dd><%= this.safety_level || "n.a."%></dd>' +
            '  <dt>Shared With:</dt><dd><%="TODO"%></dd>' +
            '</dl></div></div>'
    };

    /**
     * The default template.
     */
    var _DEFAULT_TEMPLATE = '' +
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

    /**
     * Default actions for the model container.
     */
    var _ACTIONS = ['sel', 'edit', 'del'];

    return ModelContainer;
});
