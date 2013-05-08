//--------- multi_container.js ---------//

/*
 * TODO module description.
 */
define(['util/classes', 'ui/widget'], function(classes, Widget) {
    "use strict";

    /**
     * TODO documentation for constructor and member functions
     *
     * @param id
     * @param bus
     * @param actions
     * @param cls
     * @param template
     *
     * @constructor
     * @public
     * @extends {Widget}
     */
    function MultiContainer(id, bus, actions, cls, template) {

        var _bus, _data, _actions;

        /**
         * @private
         */
        var tmpl = template || _TEMPLATE;
        //MultiContainer.parent.constructor.call(this, id, tmpl, 'wdat-container');
        Widget.apply(this, [id, tmpl, 'wdat-container']);

        if (cls !== undefined) {
            this.jq().addClass(cls);
        }

        // set attributes
        _bus = bus;
        _data = {};

        // prepare actions
        _actions = {};
        if (actions instanceof Array) {
            for (var i = 0; i < actions.length; i++) {
                var act = actions[i];
                _actions[act] = this.toID(act);
            }
        } else if (typeof(actions) === 'object') {
            for (var j in actions) {
                if (actions.hasOwnProperty(j)) {
                    _actions[j] = actions[j];
                }
            }
        }

        // TODO remove this line?
        this.jq().data(this);

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
            var d = null;

            if (!data.id) {
                data.id = _bus.uid();
            }
            if (!this.has(data)) {
                _data[data.id] = {data: data, position: position};
                d = data;
            }

            return d;
        };

        /**
         * Update an existing element of the container.
         *
         * @param data {Object}     The data object to update.
         * @param position {*}      The position of the element (optional).
         *
         * @returns {Object} The updated element or null if no such element was found.
         *
         * @public
         */
        this.set = function(data, position) {
            var d = null;

            if (this.has(data)) {
                var pos = position || _data[data.id].position;
                _data[data.id] = {data: data, position: pos};
                d = data;
            }

            return d;
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
            var d = null;

            if (data) {
                var id = data.id || data;
                if (_data.hasOwnProperty(id)) {
                    d = _data[id].data;
                }
            }

            return d;
        };

        this.position = function(data) {
            var pos = null;

            if (data) {
                var id = data.id || data;
                if (_data.hasOwnProperty(id)) {
                    pos = _data[id].position;
                }
            }

            return pos;
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
            var result = false;

            if (data) {
                var id = data.id || data;
                result = (id && _data.hasOwnProperty(id));
            }

            return result;
        };

        /**
         * Clear the container and refresh its content.
         *
         * @public
         */
        this.clear = function() {
            _data = {};
            this.refresh();
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
            var result = false;

            var id = data.id || data;
            if (this.has(id)) {
                delete _data[id];
                result = true;
            }

            return result;
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
            var act = null;

            var tmp = _actions[action];
            if (tmp && typeof(tmp) !== 'function') {
                act = tmp;
            }

            return act;
        };

        /**
         * Getter for data.
         *
         * @returns {Object}
         * @protected
         */
        this._data = function() {
            return  _data;
        };

    }

    /**
     * HTML template for container
     */
    var _TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                    '<dl class="secondary hidden"></dl></div>';

    return MultiContainer;
});
