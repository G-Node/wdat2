//--------- search_bar.js ---------//

/*
 * TODO module description.
 */
define(['util/strings', 'ui/button', 'ui/widget'], function (strings, Button, Widget) {
    "use strict";

    /**
     *
     * @param id
     * @param bus
     *
     * @constructor
     * @extends {Widget}
     * @private
     */
    function SearchBar(id, bus) {

        var _bus = bus ,
            _actions ,
            _search_field ,
            _search_btn ,
            _select_type;

        Widget.apply(this, [id, _SEARCH_BAR_TEMPLATE, 'wdat-search']);

        /**
         * @private
         */
        this._init = function() {
            // initiate actions
            _actions = {
                search:     this.id() + '-search',
                activate:   this.id() + '-search',
                type:       this.id() + '-type',
                compose:    this.id() + '-compose'
            };

            _search_field = this.jq().find('#search-field');
            _select_type  = this.jq().find('#select-type');
            _search_btn   = new Button(this.jq().find('#search-btn'), 'Search', bus,
                                       this._searchButtonHandler());
        };

        /**
         * Get the event for a specific action.
         *
         * @param action {String}    The action name.
         *
         * @returns {String} The event for the specific action or undefined.
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
         * Returns an object with information about the state and content of the search bar.
         *
         * Information object:
         *  {active: Boolean, param: Array, string: String, type: String}
         *
         * @return  {Object} Object with information about the search field.
         */
        this.get = function() {
            // parse params
            var str  = strings.trim(_search_field.val());
            var type = _select_type.val();

            var result = {
                active: false, param: null, string: str ,
                type:   type,  error: null
            };

            if (str) {
                try {
                    var param = _parseSearch(str);
                    if (param.length > 0) {
                        result.active = true;
                        result.param  = param;

                        if (type) {
                            for (var i = 0; i < param.length; i++) {
                                var part = param[i];
                                part.type = [type, '='];
                            }
                        }
                    }
                } catch (e) {
                    result.error = e;
                }
            }

            return result;
        };

        /**
         * A handler for the search button.
         *
         * @returns {Function}
         * @private
         */
        this._searchButtonHandler = function() {
            var that = this;
            return function() {
                _bus.publish(_actions.search, that.get());
            };
        };

        this._init();
    }

    /**
     * Parse strings to search parameter suited for the DataAPI
     *
     * @param str {String}    The string to parse.
     *
     * @returns {Array} Array of search parameters.
     */
    function _parseSearch(str) {
        var result = [], partResult ,
            splitOR, splitAND ,
            splitOp, error;

        splitOR = str.split(/\s+[Oo][Rr]\s+|\|/);

        for (var i = 0; i < splitOR.length; i++) {
            partResult = {};
            splitAND = splitOR[i].split(/\s+[Aa][Nn][Dd]\s+|,|&/);

            for (var j = 0; j < splitAND.length; j++) {
                splitOp = splitAND[j].split(/([<>=:])/);

                if (splitOp.length == 3) {
                    var key = strings.trim(splitOp[0]);
                    var op  = strings.trim(splitOp[1]);
                    var val = strings.trim(splitOp[2]);
                    if (op == ':') op = '=';
                    partResult[key] = [val, op];
                } else {
                    error = 'Parsing of search parameters failes at substring "' +
                            splitAND[j] + '".';
                    throw error;
                }
            }

            result.push(partResult);
        }

        return result;
    }


    var _SEARCH_BAR_TEMPLATE = '' +
        '<div id="search" class="wdat-search">' +
        '  <div class="search-right">' +
        '    <select id="select-type" class="ui-button ui-widget ui-state-default ui-corner-all">' +
        '      <option value="block">Block</option>' +
        '      <option value="analogsignal">Analogsignal</option>' +
        '    </select>' +
        '    <button id="search-btn">Search</button>' +
        '  </div>' +
        '  <div class="search-left">' +
        '    <input type="text" id="search-field">' +
        '  </div>' +
        '</div>';

    return SearchBar;
});
