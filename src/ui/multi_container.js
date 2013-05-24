//--------- multi_container.js ---------//

/*
 * This module defines the interface class MultiContainer
 */
define(['util/classes', 'ui/widget'], function(classes, Widget) {
    "use strict";

    /**
     * Constructor for the class MultiContainer. This is just a sort of interface.
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
    function MultiContainer(id, template, cls) {

        Widget.apply(this, [id, template, cls || 'wdat-container']);

        /**
         * Add a new element to the container.
         *
         * @param data {Object}     The data object to add.
         * @param position {*}      The position where to add the element.
         *
         * @returns {Object} The added object or null if nothing was added.
         *
         * @public
         */
        this.add = function(data, position) {
            throw "MultiContainer.add() not implemented yet!"
        };

        /**
         * Update an existing element of the container.
         *
         * @param data {Object}     The data object to update.
         *
         * @returns {Object} The updated element or null if no such element was found.
         *
         * @public
         */
        this.set = function(data) {
            throw "MultiContainer.set() not implemented yet!"
        };

        /**
         * Get an existing element by its id.
         *
         * @param data {Object|String}     The id of the element to get.
         *
         * @returns {Object} The element matching the id or undefined.
         *
         * @public
         */
        this.get = function(data) {
            throw "MultiContainer.get() not implemented yet!"
        };

        /**
         * Check if an element is in the container.
         *
         * @param data {Object|String} The element to check or the id of this element.
         *
         * @returns {Boolean} True if the element exists, false otherwise.
         *
         * @public
         */
        this.has = function(data) {
            throw "MultiContainer.has() not implemented yet!"
        };

        /**
         * Clear the container and refresh its content.
         *
         * @public
         */
        this.clear = function() {
            throw "MultiContainer.clear() not implemented yet!"
        };

        /**
         * Delete an element from the container.
         *
         * @param data {Object|String}  The element to delete or the id of this element.
         *
         * @returns {Boolean} True if the element was deleted, false otherwise.
         *
         * @public
         */
        this.del = function(data) {
            throw "MultiContainer.del() not implemented yet!"
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
            throw "MultiContainer.get() not implemented yet!"
        };

    }

    return MultiContainer;
});
