//--------- widget.js ---------//

/*
 * Defines the class Widget
 * Depends on jQuery.
 */
define(function () {
    "use strict";

    /**
     * Constructor for the the class Widget. Widget is just a very simple wrapper around
     * a jQuery object with some useful functions.
     *
     * @param id {String|jQuery}    Id or a jQuery object.
     * @param [template] {String}   A template for the widget.
     * @param [cls] {String}        A class that will be added to the widget.
     *
     * @constructor
     * @public
     */
    function Widget(id, template, cls) {

        /** @type  jQuery */
        var _jq;

        /**
         * @private
         */
        this._init = function() {
            var templ = template || '<div>';

            if (!id || typeof(id) === 'string') {
                _jq = $(templ);
                _jq.attr('id', id);
            } else {
                _jq = id;
                _jq.empty().append($(templ).html());
            }

            if (cls) {
                _jq.addClass(cls);
            }
        };

        /**
         * Getter/setter for the widget id.
         *
         * @param [id] {String}     The id to set for the widget.
         *
         * @returns {String|Widget} The id of the widget (getter) or the widget object (setter).
         * @public
         */
        this.id = function(id) {
            if (id !== undefined) {
                _jq.attr('id', id);
                return this;
            } else {
                return _jq.attr('id');
            }
        };

        /**
         * Getter for the jQuery object that represents the widget.
         *
         * @param [jq] {jQuery} The new jQuery object to set.
         *
         * @returns {jQuery|Widget} The jQuery object that represents the widget.
         * @public
         */
        this.jq = function(jq) {
            if (jq !== undefined) {
                _jq.replaceWith($(jq));
                _jq = jq;
                return this;
            }
            return _jq;
        };

        /**
         * Remove the widget from the DOM. Invalidates the widget.
         * @public
         */
        this.remove = function() {
            _jq.remove();
            _jq = null;
        };

        /**
         * Detach the widget from the DOM.
         * @public
         */
        this.detach = function() {
            _jq.detach();
        };

        /**
         * Turns an id or and object with an id into a string that represents the id/object
         * inside the subtree of the widget.
         *
         * @param element {String|Object}   Id or object.
         * @param [suffix] {String}         A suffix string.
         *
         * @returns {String} Id of and object
         * @public
         */
        this.toID = function(element, suffix) {
            var id, this_id;

            this_id = _jq.attr('id') || '';
            if (element && typeof(element) === 'object') {
                id = element.id;
            } else {
                id = element;
            }

            if (id) {
                id = this_id + '-' + id.toString().replace(/[\.\\\/_]+/g, '-');
                if (suffix) {
                    id += suffix;
                }
            } else {
                id = null;
            }

            return id;
        };

        this._init();
    }

    return Widget;
});
