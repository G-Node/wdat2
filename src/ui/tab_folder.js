//--------- tab_folder.js ---------//

/*
 * TODO module description.
 */
define(['util/strings', 'ui/multi_container'], function (strings, MultiContainer) {
    "use strict";


    /**
     * Constructor for the class TabFolder. A tab folder can display one of multiple
     * contents (tabs) inside a defined area. The folder provides functionality to switch
     * between all tabs and to remove and add tabs.
     *
     * @param id {String|jQuery}        The id of the list or a jQuery object.
     * @param bus {Bus}                 Bus handling events.
     * @param has_controls {Boolean}    True if the tab folder has control elements (tabs)
     *
     * @constructor
     * @extends {MultiContainer}
     * @public
     */
    function TabFolder(id, bus, has_controls) {

        var _data       = {} ,
            _bus        = bus ,
            _actions    = {} ,
            _control;

        MultiContainer.apply(this, [id, '<div>', 'wdat-tab-folder']);

        /**
         * @private
         */
        this._init = function() {
            _actions['sel'] = this.toID('sel');
            if (has_controls) {
                _control = $('<ul class="tab-navigation"></ul>');
                this.jq().append(_control);
            }
        };

        /**
         * Add a new tab to the folder.
         *
         * @param tab {jQuery}  jQuery object representing a block element as
         *                      the content of the tab.
         * @param id {String}   Individual identifier for the of the tab.
         *
         * @public
         */
        this.add = function(tab, id) {

            var elem_id = this.toID(id);

            if (!_data.hasOwnProperty(elem_id)) {
                var label = strings.capitalWords(id, /[_\- \.:]/);

                tab.addClass('tab-content');
                tab.attr('id', elem_id);

                this.jq().append(tab);
                _data[elem_id] = tab;

                if (_control) {
                    var control = $('<li></li>').text(label).attr('id', elem_id + '-control');
                    var that = this;
                    control.click(function() {
                        _bus.publish(that.event('sel'), id);
                    });
                    _control.append(control);
                }

                this.select(id);
            }
        };

        /**
         * Replace the content of an existing tab.
         *
         * @param tab {jQuery}  jQuery object representing a block element as
         *                      the content of the tab.
         * @param id {String}   Individual identifier for the of the tab.
         *
         * @public
         */
        this.set = function(tab, id) {
            var elem_id = this.toID(id);

            if (_data.hasOwnProperty(elem_id)) {
                var html = _data[elem_id];
                var selected = html.is('.selected');

                html.replaceWith(tab);
                tab.addClass('tab-content').toggleClass('selected', selected);
                tab.attr('id', this.toID(id));
            }
        };

        /**
         * Remove an existing tab.
         *
         * @param id {String}   Individual identifier for the of the tab.
         *
         * @return {Boolean} True if the tab was deleted, false otherwise.
         *
         * @public
         */
        this.del = function(id) {
            var elem_id = this.toID(id);

            if (_data.hasOwnProperty(elem_id)) {
                var html = this.jq().children('#' + this.toID(id));
                var selected = html.is('.selected');

                html.remove();
                delete _data[elem_id];

                if (selected) {
                    this.jq().children('.tab-content').first().addClass('selected');
                }

                if (_control) {
                    var control = _control.children('#' + elem_id + '-control');
                    control.remove();

                    if (selected) {
                        _control.children().first().addClass('selected');
                    }
                }

                return true;
            }

            return false;
        };

        /**
         * Select the tab to display.
         *
         * @param id {String}   Individual identifier for the of the tab.
         *
         * @public
         */
        this.select = function(id) {
            var elem_id = this.toID(id);

            if (_data.hasOwnProperty(elem_id)) {
                this.jq().children('.tab-content').removeClass('selected');
                this.jq().children('#' + elem_id).addClass('selected');

                if (_control) {
                    _control.children().removeClass('selected');
                    _control.children('#' + elem_id + '-control').addClass('selected');
                }
            }
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
         * Check if an element is in the container.
         *
         * @param id {String}   The element to check or the id of this element.
         *
         * @returns {Boolean} True if the element exists, false otherwise.
         *
         * @public
         */
        this.has = function(id) {
            var elem_id = this.toID(id) ,
                exists  = false;

            if (_data.hasOwnProperty(elem_id)) {
                exists = true;
            }

            return exists;
        };

        /**
         * Default select handler for selection events fired by the control panel.
         *
         * @return {Function} A handler function for select events.
         */
        this.selectHandler = function() {
            var that = this;
            return function(event, data) {
                that.select(data);
            };
        };

        this._init();
    }

    return TabFolder;
});
