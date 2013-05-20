//--------- bread_crumb.js ---------//

/*
 * This module defines the class BradCrumb
 */
define(['ui/widget'], function (Widget) {
    "use strict";

    /**
     * Constructor for the class BreadCrumb. BreadCrumb implements a bread crumb
     * navigation bar. Elements can be added to the navigation bar. Each element
     * is represented by a button which sends a selection event when clicked.
     *
     * Elements are Objects with the following properties:
     *
     *  - Minimal element: {id: <id>, name: <name>}
     *
     * @param id {string|Object}        The id of the list or a jQuery object.
     * @param bus {Bus}                 Bus for handling events.
     * @param action {string|Function}  Event name or callback function for selection events (click)
     *
     * @constructor
     * @extends {Widget}
     * @public
     */
    function BreadCrumb(id, bus, action) {

        var _bus = bus ,
            _datasets = [],
            _action;

        Widget.apply(this, [id, 'div', 'wdat-bread-crumb']);

        /**
         * @private
         */
        this._init = function() {
            _action = action || this.id() + '-select';

            // jquery ui buttonset
            this.jq().buttonset();
        };

        /**
         * Add a new element to the navigation bar. If pos is not set the element will
         * be appended after the currentlx selected element. If the position is specified
         * all elements beginning at this position will be removed and the element
         * will be appended to the end of the navigation bar.
         *
         * @param data {Object}         Object representing the navigation bar element.
         * @param position {number}     The position where to add the new element. All elements after the
         *                              specified position will be deleted (optional).
         *
         * @return {Object} The inserted element or null if nothing has been inserted.
         * @public
         */
        this.add = function(data, position) {
            var pos = position || this.selectedPos() + 1;

            if (!data.id) {
                data.id = _bus.uid();
            }

            // prepare datasets
            _datasets.splice(pos, _datasets.length);
            _datasets.push(data);

            // remove old radio buttons
            this.jq().empty();

            // create new ratio buttons
            var d, input, label;
            for (var i = 0; i < _datasets.length; i++) {
                d       = _datasets[i];
                input   = $('<input type="radio">').attr('name', this.id()).attr('id', this.toID(d));
                label   = $('<label>').attr('for', this.toID(d)).text(d.name);

                if (i === (_datasets.length - 1)) {
                    label.addClass('ui-state-active');
                }

                this.jq().append(input).append(label);
            }

            this.jq().buttonset('refresh');
            this.jq().children('input').click(this._selectHandler());

            return data;
        };

        /**
         * Remove all elements from the bread crumb bar beginning at the given position.
         *
         * @param position {number}    The position from where to delete all elements.
         *
         * @public
         */
        this.del = function(position) {
            var pos = position || 0;

            // prepare datasets
            _datasets.splice(pos, _datasets.length);

            // remove old radio buttons
            this.jq().empty();

            // create new ratio buttons
            var d, input, label;
            for (var i = 0; i < _datasets.length; i++) {
                d       = _datasets[i];
                input   = $('<input type="radio">').attr('name', this.id()).attr('id', this.toID(d));
                label   = $('<label>').attr('for', this.toID(d)).text(d.name);

                if (i == (_datasets.length - 1)) {
                    label.addClass('ui-state-active');
                }

                this.jq().append(input).append(label);
            }

            this.jq().buttonset('refresh');
            this.jq().children('input').click(this._selectHandler());
        };

        /**
         * Get the position of an element inside the bread crumb bar.
         *
         * @param data {string|Object}  The id of an element or the element itself.
         *
         * @return {Number} The position of the element inside the bar or -1 if not found.
         * @public
         */
        this.pos = function(data) {
            var pos = -1;

            if (data) {
                var id = this.toID(data);
                this.jq().children('input').each(function(i) {
                    if (pos < 0 && $(this).attr('id') == id) {
                        pos = i;
                    }
                });
            }

            return pos;
        };

        /**
         * Get the position of the selected element.
         *
         * @returns {Number} The position of the element inside the bar or -1 if not found.
         * @public
         */
        this.selectedPos = function() {
            var pos = (_datasets.length - 1);

            this.jq().children('label').each(function(i) {
                if (pos > i && $(this).is('.ui-state-active')) {
                    pos = i;
                }
            });

            return pos;
        };

        /**
         * Get the currently selected element.
         *
         * @return {Object} The currently selected element.
         * @public
         */
        this.selected = function() {
            return _datasets[this.selectedPos()];
        };

        /**
         * Checks if an element is in the bread crumb bar.
         *
         * @param data {string|Object}  The id of an element or the element itself.
         *
         * @return True if the element is in the bread crumb bar, false otherwise.
         * @public
         */
        this.has = function(data) {
            return (data && this.jq().children('#' + this.toID(data)).length > 0);
        };

        /**
         * Getter for action.
         *
         * @returns {String|Function}
         * @public
         */
        this.action = function() {
            return _action;
        };

        /**
         * Simple handler for selections
         * @private
         */
        this._selectHandler = function() {
            var that = this;

            return function() {
                var d = that.selected();
                if (typeof(_action) === 'function') {
                    _action(d);
                } else {
                    _bus.publish(_action, d);
                }
            };
        };

        this._init();
    }

    return BreadCrumb;
});
