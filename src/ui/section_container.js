//--------- section_container.js ---------//

define(['ui/button', 'ui/template_container'], function (Button, TemplateContainer) {
    "use strict";

    /**
     * Constructor of the class SectionContainer.
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
    function SectionContainer(id, bus, actions, data) {

        var _bus = bus;

        TemplateContainer.apply(this, [id, _SECTION_TEMPLATE, actions || _ACTIONS, data]);

        /**
         * @private
         */
        this._postprocess = function(jq, data, actions) {
            // TODO SectionContainer post processing of the template
        };

        this.refresh();

    }

    var _ACTIONS = ['add', 'edit'];

    var _SECTION_TEMPLATE =  '' +
        '<div id="<%= this.dom_id %>" class="section-container">' +
        '  <h3>Section</h3>' +
        '  <div class="properties">' +
        '    <div class="field">' +
        '      <div class="field-name">Name</div><div class="field-val"><%= this.name || "unnamed" %></div>' +
        '    </div>' +
        '      <div class="field">' +
        '      <div class="field-name">Type</div><div class="field-val"><%= this.fields.odml_type || "n.a." %></div>' +
        '    </div>' +
        '    <div class="field">' +
        '      <div class="field-name">Description</div>' +
        '      <div class="field-val"><%= this.fields.description || "n.a." %></div>' +
        '    </div>' +
        '    <div class="field">' +
        '      <div class="field-name">Position</div><div class="field-val"><%= this.fields.tree_position || "n.a." %></div>' +
        '    </div>' +
        '    <div class="field">' +
        '      <div class="field-name">Creation Date</div><div class="field-val"><%= this.fields.date_created || "n.a." %></div>' +
        '    </div>' +
        '  </div>' +
        '  <h3>Security</h3>' +
        '    <div class="properties">' +
        '      <div class="field">' +
        '      <div class="field-name">Safety Level</div>' +
        '    <div class="field-val"><%= this.fields.safety_level || "n.a." %></div>' +
        '    </div>' +
        '    <div class="field">' +
        '      <div class="field-name">Shared With</div>' +
        '      <div class="field-val">' +
        '      <% for (person in this.shared_with) { %>' +
        '      <%= person + "&nbsp(" + this.shared_with[person] + ");"%>' +
        '      <% } %>' +
        '      </div>' +
        '    </div>' +
        /*'    <div class="field">' +
        '      <div class="field-name"></div>' +
        '      <div class="field-val"><button class="share-btn"></button></div>' +
        '    </div>' +*/
        '  </div>' +
        '</div>';

    return SectionContainer;
});
