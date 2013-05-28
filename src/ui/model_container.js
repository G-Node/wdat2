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
     * @param id {String|jQuery}         The id of the container or a jQuery object.
     * @param bus {Bus}                  Bus for events.
     * @param actions {Array|Object}     Array or Object defining events.
     * @param data {Object}              The model data to display.
     * @param is_simple {Boolean} 'true':  select by click on primary-block.
     *                                   'false': select by click on sel-button.
     *
     * @constructor
     * @extends {TemplateContainer}
     * @public
     */
    function ModelContainer(id, bus, actions, data, is_simple) {

        var _bus = bus;
        var _is_simple = is_simple ? true : false;

        TemplateContainer.apply(this, [id, _template(data), actions || _ACTIONS, data]);

        /**
         * @private
         */
        this._postprocess = function(jq, data, actions) {
            var buttons = jq.children(".buttons") ,
                btn, click;
            if (!_is_simple) {
                btn = new Button(null, 'more', _bus, this._expandHandler());
                buttons.append(btn.jq());
            } else {
                jq.find('.secondary').remove();
            }
            btn = new Button(jq.find('.share-btn'), 'Share', _bus, actions.share, data);
            for (var act in actions) {
                if (act !== 'share' && actions.hasOwnProperty(act) && act !== 'sel_click') {
                    click = actions[act];
                        btn   = new Button(null, act + '_small', _bus, click, data);
                        buttons.append(btn.jq());
                    }
                }

            if (actions.hasOwnProperty('sel_click')) {
                console.log('is simple select!')
                click = actions['sel_click'];
                jq.addClass("clickable"); // style specified in container.less
                var html = jq.find('.primary');
                html.click(function() {
                    if (typeof(click) === 'function') {
                        click(data);
                    } else {
                        _bus.publish(click, data);
                    }
                });
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
            '</dl></div></div>',

        analogsignal: '' +
            '<div id="<%= this.dom_id %>" class="wdat-container">' +
                '<div class="buttons"></div>' +
                '<div class="primary">' +
                    '<span class="head"><%= this.name || ("analogsignal&nbsp" + this.fields.date_created) %></span>' +
                    '<span class="head-add"></span>' +
                '</div>' +
                '<div class="secondary hidden">' +
                    '<hr>' +
                    '<h3>Fields</h3>' +
                    '<div class="properties">' +
                        '<div class="field">' +
                            '<div class="field-name">Name</div>' +
                            '<div class="field-val"><%= this.name || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Type</div>' +
                            '<div class="field-val"><%= this.type || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Description</div>' +
                            '<div class="field-val"><%= this.fields.description || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Creation Date</div>' +
                            '<div class="field-val"><%= this.fields.date_created || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Sampling Rate</div>' +
                            '<div class="field-val"><%= this.data.sampling_rate.data + "&nbsp" + this.data.sampling_rate.units || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Start Time</div>' +
                            '<div class="field-val"><%= this.data.t_start.data + "&nbsp" + this.data.t_start.units || "n.a." %></div>' +
                        '</div>' +
                        '<div class="field">' +
                            '<div class="field-name">Signal Units</div>' +
                            '<div class="field-val"><%= this.data.signal.units || "n.a." %></div>' +
                        '</div>' +
                    '</div>' +
                    '<h3>Security</h3>' +
                    '<div class="properties">' +
                        '<div class="field">' +
                            '<div class="field-name">Safety Level</div>' +
                            '<div class="field-val"><%= this.fields.safety_level || "n.a." %></div>' +
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
            '</div>'
    };

    /**
     * The default template.
     */
    var _DEFAULT_TEMPLATE = '' +
        '<div id="<%= this.dom_id %>" class="wdat-container">' +
        '<div class="buttons"></div>' +
        '<div class="primary">' +
        '  <span class="head"><%= this.name || "unnamed container"%></span>' +
        '  <span class="head-add"></span></div>' +
        '<div class="secondary hidden"><h3>Fields</h3><dl class="tabular">' +
        '  <dt>Name:</dt><dd><%= this.name || "unnamed container"%></dd>' +
        '  <dt>Creation Date:</dt><dd><%= this.fields.date_created || "n.a."%></dd>' +
        '</dl><h3>Security</h3><dl class="tabular">' +
        '  <dt>Safety Level:</dt><dd><%= this.safety_level || "n.a."%></dd>' +
        '  <dt>Shared With:</dt><dd><%="TODO"%></dd>' +
        '</dl></div></div>';

    /**
     * Default actions for the model container.
     */
    var _ACTIONS = ['sel', 'share', 'edit', 'del', 'sel_click'];

    return ModelContainer;
});
