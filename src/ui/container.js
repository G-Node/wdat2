//--------- container.js ---------//

/*
 * TODO module description.
 */
define(['util/classes', 'util/objects', 'util/strings', 'api/model_helpers', 'api/bus', 'ui/widget', 'ui/button'],
    function (classes, objects, strings, model_helpers, Bus, Widget, Button) {
    "use strict";

    classes.inherit(Container, Widget);

    /**
     * TODO documentation for constructor and member functions
     *
     * @param id
     * @param bus
     * @param actions
     * @param cls
     * @param template
     * @param empty
     * @param attrconf
     *
     * @constructor
     * @public
     */
    function Container(id, bus, actions, cls, template, empty, attrconf) {

        var _bus, _data, _empty, _actions, _attrconf;

        /**
         * @private
         */
        this._init = function() {
            // prepare container structure
            var tmpl = template || _TEMPLATE;
            Container.parent.constructor.call(this, id, tmpl, 'wdat-container');

            if (cls) { // TODO remove?
                this.jq.addClass(cls);
            }

            // set attributes
            _bus = bus;
            _data = null;
            _empty = empty || "No data selected";

            // prepare actions
            _actions = {};
            if (actions) {
                if (actions instanceof Array) {
                    for (var i = 0; i < actions.length; i++) {
                        _actions[actions[i]] = this.toID(actions[i]);
                    }
                } else if (typeof actions === 'object') {
                    for (var j in actions) {
                        if (actions.hasOwnProperty(j)) {
                            if (actions[j]) {
                                _actions[j] = actions[j];
                            } else {
                                _actions[j] = this.toID(j);
                            }
                        }
                    }
                }
            }

            // prepare attrconf
            _attrconf = {};
            if (attrconf) {
                for (var k in attrconf) {
                    if (attrconf.hasOwnProperty(k)) {
                        if (k === 'prim') {
                            _attrconf[k] = attrconf[k] || ['name'];
                        } else {
                            _attrconf[k] = attrconf[k];
                        }
                    }
                }
            } else {
                _attrconf = {prim : ['name']};
            }
            // add this to html container
            // TODO can this be removed?
            this.jq().data(this);
        };

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
            _data = data;
            this.refresh();
            return data;
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
         * @public
         */
        this.clear = function() {
            _data = null;
            this.refresh();
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
            if (_actions.hasOwnProperty(action) && typeof(_actions[action]) !== 'function') {
                act = _actions[action];
            }
            return act;
        };

        /**
         * Configure the primary or secondary attributes for the main data object or
         * its children.
         *
         * @param type {String}     The type of attributes ('prim', 'sec', 'child_prim'
         *                          or 'child_sec').
         * @param attrlist {Array}  Array with attributes that replaces the existing list
         *                          of attributes.
         *
         * @returns {Array}
         *
         * @public
         */
        this.attrconf = function(type, attrlist) {
            if (attrlist)
                _attrconf[type] = attrlist;
            return _attrconf[type] || [];
        };

        /**
         * Refresh or create the whole content of the container.
         *
         * @public
         */
        this.refresh = function() {
            // create primary content
            var html = this.jq().children('.primary').empty();
            var count = 0;
            var attrconf = this._genAttrconf();
            for (var i = 0; i < attrconf.sec.prim; i++) {
                var val = objects.deepGet(_data, attrconf.prim[i]);
                if (val) {
                    switch (count) {
                        case 0:
                            html.append($('<span class="head">').text(val));
                            break;
                        case 1:
                            html.append($('<span class="head-add">').text(val));
                            break;
                        default:
                            html.children('.head-add').append(', ' + val);
                            break;
                    }
                }
            }
            // create secondary content
            html = this.jq().children('.secondary').empty();
            for (i = 0; i < attrconf.sec.length; i++) {
                var key = attrconf.sec[i];
                val = objects.deepGet(this._data, key) || 'n.a.';
                key = strings.capitalWords(key, /[_\- \.:]/) + ':';
                html.append($('<dt>').text(key)).append($('<dd>').text(val));
            }
            // create buttons
            html = this.jq().children('.buttons').empty();
            var btn;
            if (attrconf.sec.length > 0) {
                btn = new Button(null, 'more', this._bus, this._expandHandler());
                html.append(btn.jq());
            }
            for (i = 0; i < _ACTIONS.length; i++) {
                var act = _ACTIONS[i];
                if (_actions.hasOwnProperty(act)) {
                    var click = _actions[act];
                    btn = new Button(null, act + '_small', this._bus, click, this._data);
                    html.append(btn.jq());
                }
            }
        };

        /**
         * Generates a attrconf.
         *
         * @returns {Object}
         *
         * @private
         */
        this._genAttrconf = function() {
            var attrconf = {};
            if (_attrconf.prim && _attrconf.prim.length > 0) {
                attrconf.prim = _attrconf.prim;
            } else {
                attrconf.prim = ['name'];
            }
            if (_attrconf.sec) {
                attrconf.sec = _attrconf.sec;
            } else {
                attrconf.sec = [];
                var fields = model_helpers.field(_data.type);
                if (fields) {
                    for (var i in fields) {
                        if (fields.hasOwnProperty(i)) {
                            attrconf.sec.push(i);
                        }
                    }
                } else {
                    for (var j in _data) {
                        if (_data.hasOwnProperty(j)) {
                            attrconf.sec.push(j);
                        }
                    }
                }
            }
            return attrconf;
        };

        /**
         * Returns a handler for expand events (for internal use only)
         *
         * @returns {Function}
         *
         * @private
         */
        this._expandHandler = function() {
            var that = this;
            return function() {
                var sec = that.jq().children('.secondary');
                sec.toggleClass('hidden');
            };
        };



        this._init();
    }

    /**
     * HTML template for container
     */
    var _TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                    '<dl class="secondary hidden"></dl></div>';

    /**
     * Possible container actions.
     */
    var _ACTIONS = ['add', 'del', 'sel', 'edit'];

    return Container;
});
