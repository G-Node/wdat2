//--------- template_container.js ---------//

define(['util/objects', 'ui/container'], function (objects, Container) {
    "use strict";

    /**
     * Constructor of the class TemplateContainer.
     *
     * @param id {String|jQuery}        The id of the container or a jQuery object.
     * @param template {String}         The template (see jQote2 documentation).
     * @param actions {Array|Object}    Array or Object defining events.
     * @param data {Object}             The model data to display.
     *
     * @constructor
     * @extends {Container}
     * @public
     */
    function TemplateContainer(id, template, actions, data) {

        // inherit from Container
        Container.apply(this, [id]);

        var _data       = data || {},
            _template   = $.jqotec(template) ,
            _actions    = {};

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
         * Set the data object of the container.
         *
         * @param data {Object}       The data object of the container.
         *
         * @returns {TemplateContainer} The container object.
         *
         * @public
         */
        this.set = function(data) {
            _data = data || {};
            this.refresh();
            return this;
        };

        /**
         * Get the main data object of the container.
         *
         * @returns {Object} The main data object of the container.
         *
         * @public
         */
        this.get = function() {
            return _data;
        };

        /**
         * Clear the container content and refresh it.
         *
         * @returns {TemplateContainer} The container object.
         *
         * @public
         */
        this.clear = function() {
            _data = null;
            this.refresh();
            return this;
        };

        /**
         * Get the event for a specific action.
         *
         * @param action {String}    The action name.
         *
         * @returns {String} The event for the specific action or undefined.
         *
         * @public
         */
        this.event = function(action) {
            var event = null;
            if (_actions.hasOwnProperty(action) && typeof(_actions[action]) !== 'function') {
                event = _actions[action];
            }
            return event;
        };

        /**
         * Refresh or create the whole content of the container.
         *
         * @public
         */
        this.refresh = function() {
            var id = this.id();
            var d  = objects.deepCopy(_data || {});
            if (!d.fields) d.fields = {};
            if (!d.data) d.data = {};
            var jq = $($.jqote(_template, d)).attr('id', id);
            this._postprocess(jq, d, _actions);
            this.jq(jq);
        };

        /**
         *
         * @private
         */
        this._postprocess = function(jq, data, actions) {
            // do nothing
        };

        this._init();
    }
    return TemplateContainer;
});
