//--------- list.js ---------//

/*
 * TODO module description.
 */
define(['util/strings', 'ui/container', 'ui/model_container', 'ui/multi_container'],
    function (strings, Container, ModelContainer, MultiContainer) {
        "use strict";

        /**
         * TODO documentation for List and member functions
         *
         * @param id
         * @param bus
         * @param actions
         * @param categories TODO implement categories
         *
         * @constructor
         * @extends {MultiContainer}
         * @public
         */
        function List(id, bus, actions, categories) {

            var _list       = {} ,
                _bus        = bus ,
                _actions    = {} ,
                _cont_actions = {};


            MultiContainer.apply(this, [id, '<div>', 'wdat-list']);

            /**
             * @private
             */
            this._init = function() {
                // initialize actions
                var act, i;
                if (actions instanceof Array) {
                    for (i = 0; i < actions.length; i++) {
                        act = actions[i];
                        if (Container.ACTIONS.indexOf(act) >= 0) {
                            _actions[act] = this.toID(act);
                            if (act != 'add') {
                                _cont_actions[act] = _actions[act];
                            }
                        }
                    }
                } else {
                    for (act in actions) {
                        if (actions.hasOwnProperty(act) && Container.ACTIONS.indexOf(act) >= 0) {
                            _actions[act] = actions[act] || this.toID(act);
                            if (act != 'add') {
                                _cont_actions[act] = _actions[act];
                            }
                        }
                    }
                }
                for (i = 0; i < categories.length; i++) {
                    var cat = categories[i].toString().toLowerCase();

                    var label = strings.capitalWords(cat, /[_\- \.:]/);
                    var html;
                    if (cat === 'default') {
                        html = $('<div class="category"></div>');
                    } else {
                        html = $('<div class="category"><h2>'+label+'</h2></div>');
                    }
                    this.jq().append(html);
                    _list[cat] = {html: html, data: {}};
                }
            };


            /**
             * Add a new element to the list. If the element doesn't has id, a unique identifier
             * will be created.
             *
             * @param data (Obj)          The element to add to the list.
             * @param category (String)   The category (optional).
             *
             * @return The inserted element.
             */
            this.add = function (data, category) {
                var inserted = null;

                if (!this.has(data)) {

                    var id = this.toID(data);
                    var cont = new ModelContainer(id, _bus, _cont_actions, data);
                    //_addSelectAction(cont, _bus, this.event('sel'));

                    // get category
                    var cat = category || 'default';
                    cat = cat.toString().toLowerCase();
                    if (!_list.hasOwnProperty(cat)) {
                        var label = strings.capitalWords(cat, /[_\- \.:]/);
                        var html;
                        if (cat === 'default') {
                            html = $('<div class="category"></div>');
                        } else {
                            html = $('<div class="category"><h2>'+label+'</h2></div>');
                        }
                        this.jq().append(html);
                        _list[cat] = {html: html, data: {}};
                    }
                    _list[cat]['html'].append(cont.jq());
                    _list[cat]['data'][id] = cont;

                    inserted = data;
                }

                return inserted;
            };

            /**
             * Add a new element to the list that is already wrapped into a container
             *
             * @param cont (Container)   The element to add to the list.
             * @param category (String)  The category (optional).
             *
             * @return The inserted element.
             */
            this.addContainer = function(cont, category) {
                var inserted = null;

                var data = cont.get();

                if (!this.has(data)) {

                    var id = this.toID(data);
                    cont.id(id);
                    //_addSelectAction(cont, _bus, this.event('sel'));

                    // get category
                    var cat = category || 'default';
                    cat = cat.toString().toLowerCase();
                    if (!_list.hasOwnProperty(cat)) {
                        var label = strings.capitalWords(cat, /[_\- \.:]/);
                        var html;
                        if (cat === 'default') {
                            html = $('<div class="category"></div>');
                        } else {
                            html = $('<div class="category"><h2>'+label+'</h2></div>');
                        }
                        this.jq().append(html);
                        _list[cat] = {html: html, data: {}}
                    }
                    _list[cat]['html'].append(cont.jq());
                    _list[cat]['data'][id] = cont;

                    inserted = data;
                }
                return inserted;
            };

            /**
             * Add new items to the list.
             *
             * @param datasets {Array}      The elements to add to the list.
             * @param [category] {String}   The category.
             *
             * @return {Array} The elements added to the list.
             */
            this.addAll = function (datasets, category) {
                var added = [];
                for (var i = 0; i < datasets.length; i++) {
                    var data = this.add(datasets[i], category);
                    if (data) added.push(data);
                }
                return added;
            };

            /**
             * Update the content of an existing list element.
             *
             * @param data {Object}         The element to update.
             */
            this.set = function (data) {
                if (this.has(data)) {
                    var id = this.toID(data);
                    var cont;
                    for (var cat in _list) {
                        if (_list.hasOwnProperty(cat)) {
                            if (_list[cat]['data'].hasOwnProperty(id)) {
                                cont = _list[cat]['data'][id];
                                cont.set(data);
                                break;
                            }
                        }
                    }
                }
            };

            /**
             * Remove an element from the list.
             *
             * @param data (String, Obj)    The element to remove or the id of this
             *                              element.
             *
             */
            this.del = function (data) {
                if (this.has(data)) {
                    var id = this.toID(data);
                    var cont;
                    for (var cat in _list) {
                        if (_list.hasOwnProperty(cat)) {
                            if (_list[cat]['data'].hasOwnProperty(id)) {
                                cont = _list[cat]['data'][id];
                                cont.detach();
                                delete _list[cat]['data'][id];
                                break;
                            }
                        }
                    }
                }
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
                var id = this.toID(data);
                var exists = false;
                for (var cat in _list) {
                    if (_list.hasOwnProperty(cat)) {
                        var d = _list[cat]['data'];
                        if (d.hasOwnProperty(id)) {
                            exists = true;
                            break;
                        }
                    }
                }
                return exists;
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
             */
            this.select = function (data, single) {
                var selected = false;
                if (this.has(data)) {
                    var html = this.jq().find('#' + this.toID(data));
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
             * Clear the container and refresh its content.
             */
            this.clear = function () {
                for (var cat in _list) {
                    if (_list.hasOwnProperty(cat)) {
                        var data = _list[cat]['data'];
                        var html = _list[cat]['html'];
                        for(var id in data) {
                            if (data.hasOwnProperty(id)) {
                                data[id].detach();
                            }
                        }
                        html.remove();
                    }
                }
                _list = {};
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
         * Invoke select action on click.
         *
         * @param container
         * @param bus
         * @param action
         *
         * @private
         */
        function _addSelectAction(container, bus, action) {
            if (action) {
                var click;
                if (typeof(action) === 'function') {
                    click = action;
                } else {
                    click = function() {
                        bus.publish(action, container.get());
                    };
                }
                container.jq().click(click);
            }
        }

        return List;
    });