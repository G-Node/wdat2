//--------- tree.js ---------//

/*
 * TODO module description.
 */
define(['util/strings', 'ui/button', 'ui/container', 'ui/template_container', 'ui/multi_container'],
    function (strings, Button, Container, TemplateContainer, MultiContainer) {
    "use strict";

    /**
     * TODO documentation for Tree and member functions
     *
     * @param id
     * @param bus
     * @param actions
     *
     * @constructor
     * @extends {MultiContainer}
     * @public
     */
    function Tree(id, bus, actions) {

        var _data       = {} ,
            _bus        = bus ,
            _actions    = {};

        MultiContainer.apply(this, [id, '<div>', 'wdat-tree']);

        /**
         * @private
         */
        this._init = function() {
            // initialize actions
            var act, i;
            if (actions instanceof Array) {
                for (i = 0; i < actions.length; i++) {
                    act = actions[i];
                    if (_ACTIONS.indexOf(act) >= 0) {
                        _actions[act] = this.toID(act);
                    }
                }
            } else {
                for (act in actions) {
                    if (actions.hasOwnProperty(act) && _ACTIONS.indexOf(act) >= 0) {
                        _actions[act] = actions[act] || this.toID(act);
                    }
                }
            }
            if (!_actions.hasOwnProperty('expand')) {
                _actions['expand'] = this.toID('expand');
            }
            if (!_actions.hasOwnProperty('collapse')) {
                _actions['collapse'] = this.toID('collapse');
            }
        };

        /**
         * Add a new element to the container.
         *
         * @param data {Object}     The data object to add.
         * @param parent {*}        The parent where to add the element.
         *
         * @returns {Object} The added object or null if nothing was added.
         *
         * @public
         */
        this.add = function(data, parent) {
            var id = this.toID(data) ,
                parent_id = this.toID(parent) ,
                added_data = null ,
                cont, parent_cont;

            if (_data.hasOwnProperty(parent_id)) {
                if (!_data.hasOwnProperty(id)) {
                    parent_cont = _data[parent_id];
                    cont = new NodeContainer(id, _bus, _actions, data);
                    parent_cont.addChild(cont);
                    _data[id] = cont;
                    added_data = data;
                }
            } else {
                if (!_data.hasOwnProperty(id)) {
                    cont = new NodeContainer(id, _bus, _actions, data);
                    this.jq().append(cont.jq());
                    _data[id] = cont;
                    added_data = data;
                }
            }

            return added_data;
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
            var id = this.toID(data) ,
                updated_data = null;

            if (_data.hasOwnProperty(id)) {
                _data[id].set(data);
                updated_data = _data[id].get();
            }

            return updated_data;
        };

        /**
         * Get an existing element by its id.
         *
         * @param data {Object|String}     The id of the element to get.
         *
         * @returns {Object} The element matching the id or null.
         *
         * @public
         */
        this.get = function(data) {
            var id = this.toID(data) ,
                found_data = null;

            if (_data.hasOwnProperty(id)) {
                found_data = _data[id].get();
            }

            return found_data;
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
            var id = this.toID(data) ,
                exists = false;

            if (_data.hasOwnProperty(id)) {
                exists = true;
            }

            return exists;
        };

        /**
         * Clear the container and refresh its content.
         *
         * @public
         */
        this.clear = function() {
            for (var id in _data) {
                if (_data.hasOwnProperty(id)) {
                    _data[id].remove();
                    delete _data[id];
                }
            }
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
            var id = this.toID(data) ,
                removed = false;

            if (_data.hasOwnProperty(id)) {
                _data[id].remove();
                delete _data[id];
                removed = true;
            }

            return removed;
        };

        /**
         * Delete all children of a node.
         *
         * @param data  {Object|String}  The element to delete or the id of this element.
         * @public
         */
        this.delChildren = function(data) {
            var id = this.toID(data);

            if (_data.hasOwnProperty(id)) {
                this.jq().find('#' + id).find('.tree-node').each(function() {
                    var i = $(this).attr('id');
                    $(this).remove();
                    delete _data[i];
                })
            }
        };

        /**
         * Select an element in the list. If the element is already selected
         * the selection will be removed (toggle).
         *
         * @param data (String, Obj)    The elements to select or the id of this
         *                              element.
         * @param single (Boolean)      Set to true if the selected element should be the
         *                              only selected element in the whole list.
         *
         * @return {Boolean} True if the element is now selected false otherwise.
         * @public
         */
        this.select = function (data, single) {
            var id = this.toID(data) ,
                selected = false;

            if (_data.hasOwnProperty(id)) {
                var html = this.jq().find('#' + id).children('.wdat-container');
                selected = html.is('.selected');
                if (single) {
                    this.jq().find('.wdat-container').removeClass('selected');
                }
                html.toggleClass('selected', !selected);
                selected = !selected;
            }

            return selected;
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
         * Crates a default handler function for select events.
         *
         * @return {Function} A default handler.
         * @public
         */
        this.selHandler = function () {
            var that = this;
            return function (event, data) {
                that.select(data, true);
            };
        };

        /**
         * Crates a default handler function for delete events.
         *
         * @return {Function} A default handler.
         * @public
         */
        this.delHandler = function () {
            var that = this;
            return function (event, data) {
                that.del(data);
            };
        };

        this._init();

    }

    /**
     *
     * @param id
     * @param bus
     * @param actions
     * @param data
     *
     * @constructor
     * @extends {TemplateContainer}
     */
    function NodeContainer(id, bus, actions, data) {

        var _bus = bus ,
            _parent;

        TemplateContainer.apply(this, [id, _NODE_TEMPLATE, actions || _ACTIONS, data]);


        /**
         *
         * @param container {NodeContainer}
         *
         * @returns {NodeContainer}
         * @public
         */
        this.parent = function(container) {
            if (container !== undefined) {
                _parent = container;
                return this;
            }
            return _parent;
        };

        /**
         *
         * @param container {NodeContainer}
         *
         * @public
         */
        this.addChild = function(container) {
            container.parent(this);
            this.jq().append(container.jq());
        };

        /**
         * @private
         */
        this._postprocess = function(jq, data, actions) {
            var buttons = jq.children('.wdat-container').find(".buttons") ,
                btn, click;

            for (var act in actions) {
                if (actions.hasOwnProperty(act) && act != 'sel' && act != 'expand' && act != 'collapse') {
                    click = actions[act];
                    btn   = new Button(null, act + '_small', _bus, click, data);
                    buttons.append(btn.jq());
                }
            }

            if (actions.hasOwnProperty('sel')) {
                click = actions['sel'];
                var html = jq.children('.wdat-container').find('.primary');
                html.click(function() {
                    if (typeof(click) === 'function') {
                        click(data);
                    } else {
                        _bus.publish(click, data);
                    }
                });
            }

            jq.children('.node-icon').click(this._expandHandler(actions));
        };


        /**
         * Returns a handler for expand events (for internal use only)
         *
         * @returns {Function}
         * @private
         */
        this._expandHandler = function(actions) {
            var that = this;

            return function() {
                var data = that.get() ,
                    collapsed = that.jq().is('.collapsed') ,
                    act;

                if (collapsed) {
                    act = actions['expand'];
                } else {
                    act = actions['collapse'];
                }

                if (act === 'function') {
                    act(data);
                } else {
                    _bus.publish(act, data);
                }

                that.jq().toggleClass('collapsed', !collapsed);
            };
        };

        this.refresh();
    }

    var _NODE_TEMPLATE = '' +
        '<div class="tree-node tree-leaf collapsed" id="<%= this.dom_id %>">' +
        '  <div class="node-icon"></div>' +
        '  <div class="wdat-container">' +
        '    <div class="buttons"></div>' +
        '    <div class="primary"><span="head"><%= this.name || "unnamed" %></span></div>' +
        '  </div>' +
        '</div>';

    var _ACTIONS = ['expand', 'collapse', 'sel', 'add', 'edit', 'del'];

    return Tree;
});
