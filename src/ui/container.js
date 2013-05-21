//--------- container.js ---------//

/*
 * This module defines the class Container.
 */
define(['util/classes', 'util/objects', 'util/strings', 'api/model_helpers', 'api/bus', 'ui/widget', 'ui/button'],
    function (classes, objects, strings, model_helpers, Bus, Widget, Button) {
    "use strict";

    /**
     * Possible container actions.
     */
    Container.ACTIONS = ['add', 'del', 'sel', 'edit'];

    /**
     * Constructor for the class container. This is just a sort of interface.
     * Implementations of methods are to be provided by subclasses.
     *
     * @param id {String|jQuery}    The id of the list or a jQuery object.
     * @param [template] {String}   A template for the widget.
     * @param [cls] {String}        A class that will be added to the widget.
     *
     * @constructor
     * @extends {Widget}
     * @public
     */
    function Container(id, template, cls) {

        Widget.apply(this, [id, template, cls]);

        /**
         * Set the data object of the container.
         *
         * @param data {Object}       The data object of the container.
         *
         * @returns {Object} The data object.
         *
         * @public
         */
        this.set = function(data) {
            throw "Container.set() not implemented yet!"
        };

        /**
         * Get the main data object of the container.
         *
         * @returns {Object} The main data object of the container.
         *
         * @public
         */
        this.get = function() {
            throw "Container.get() not implemented yet!"
        };

        /**
         * Clear the container content and refresh it.
         *
         * @public
         */
        this.clear = function() {
            throw "Container.clear() not implemented yet!"
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
            throw "Container.event() not implemented yet!"
        };

        /**
         * Refresh or create the whole content of the container.
         *
         * @public
         */
        this.refresh = function() {
            throw "Container.refresh() not implemented yet!"
        };
    }

    return Container;
});
