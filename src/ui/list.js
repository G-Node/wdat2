//--------- list.js ---------//

/*
 * TODO module description.
 */
define(['util/classes', 'util/strings', 'ui/container', 'ui/multi_container', 'ui/button'],
    function (classes, strings, Container, MultiContainer, Button) {
        "use strict";

        /**
         * TODO documentation for List and member functions
         *
         * @param id
         * @param bus
         * @param actions
         * @param categories
         *
         * @constructor
         * @extends {MultiContainer}
         * @public
         */
        function List(id, bus, actions, categories) {

            var _container_actions, _categories, _bus;

            /**
             * @private
             */
            //List.parent.constructor.call(this, id, bus, actions, 'wdat-list', '<div>');
            MultiContainer.apply(this, [id, bus, actions, 'wdat-list', '<div>']);

            _bus = bus;
            // categories
            _categories = {};
            for (var i = 0; i < categories.length; i++) {
                var cat = categories[i].toLowerCase();
                _categories[cat] = strings.capitalWords(cat, /[_\- \.:]/);
            }

            // actions for container elements
            _container_actions = {};
            for (var j in actions) {
                var act = actions[j];
                if (_ACTIONS.indexOf(act) >= 0 && act != 'add') {
                    _container_actions[act] = this.id() + '-' + act;
                }
            }

            // append self to dom
            this.jq().data(this);


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
                //var elem = List.parent.add.call(this, data, category);
                if (elem) {
                    // create a container
                    var id = this.toID(elem.id);
                    var cont = new Container($('<li>').attr('id', id), this._bus, _container_actions);
                    cont.set(elem);
                    // get the right category
                    var cat = category || 'default';
                    cat = cat.toLowerCase();
                    if (_categories[cat]) {
                        // found a matching category
                        cat = this.jq().find('#' + this.toID(category));
                    } else {
                        // no category found, create a new one
                        var label = strings.capitalWords(cat, /[_\- \.:]/);
                        _categories[cat] = label;
                        var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
                        html.attr('id', this.toID(cat));
                        html.find('.category-name').text(label);
                        // create add button if add event is present
                        if (this.event('add')) {
                            var b = new Button(null, 'add_small', this._bus, this.event('add'), {
                                name: label, id: cat});
                            html.find('.category-name').before(b.jq());
                        }
                        // append everything
                        var position = this.jq().find('#' + this.toID('default'));
                        if (position.length > 0)
                            position.before(html);
                        else
                            this.jq().append(html);
                        cat = html;
                    }
                    // append container to the right category
                    cat.append(cont.jq());
                }
                return elem;
            };

            /**
             * Add a new element to the list that is already wrapped into a container
             * TODO check call of parent add!
             *
             * @param cont (Container)   The element to add to the list.
             * @param category (String)  The category (optional).
             *
             * @return The inserted element.
             */
            this.addContainer = function (cont, category) {
                var data = cont.get();
                data = List.parent.add.call(this, data, category);
                if (data) {
                    cont.jq().attr('id', this.toID(data));
                    // get the right category
                    var cat = category || 'default';
                    cat = cat.toLowerCase();
                    if (_categories[cat]) {
                        // found a matching category
                        cat = this.jq().find('#' + this.toID(category));
                    } else {
                        // no category found, create a new one
                        var label = strings.capitalWords(cat, /[_\- \.:]/);
                        _categories[cat] = label;
                        var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
                        html.attr('id', this.toID(cat));
                        html.find('.category-name').text(label);
                        // create add button if add event is present
                        if (this.event('add')) {
                            var b = new Button(null, 'add_small', _bus, this.event('add'), {
                                name: label, id: cat});
                            html.find('.category-name').before(b.jq());
                        }
                        // append everything
                        var position = this.jq().find('#' + this.toID('default'));
                        if (position.length > 0)
                            position.before(html);
                        else
                            this.jq().append(html);
                        cat = html;
                    }
                    // append container and return data object
                    cat.append(cont.jq());
                }
                return data;
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
             * @param [category] {String}   The category.
             */
            this.set = function (data, category) {
                if (this.has(data)) {

                    var oldcat = this.position(data.id);
                    var elem = List.parent.set.call(this, data, category);
                    var newcat = this.position(data.id);

                    if (elem) {
                        var html = this.jq().find('#' + this.toID(elem));
                        var cont = html.data();
                        cont.set(elem);
                        if (oldcat != newcat) {
                            cont.detach();
                            var cat;
                            if (newcat && newcat != 'default') {
                                cat = this.jq().find('#' + this.toID(newcat));
                            } else {
                                cat = this.jq().find('#' + this.toID('default'));
                            }
                            cat.append(cont.jq());
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
             * @return The removed element or null if no such element was found.
             */
            this.del = function (data) {
                var deleted = List.parent.del.call(this, data);
                if (deleted) {
                    var elem = this.jq().find('#' + this.toID(data));
                    elem.remove();
                }
                return deleted;
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
                _categories = {};
                List.parent.clear.call(this);
            };


            /**
             * Refresh or create the whole content of the container.
             */
            this.refresh = function () {
                // remove all content
                this.jq().empty();
                // crate category representation
                for (var cat in _categories) {
                    if (_categories.hasOwnProperty(cat)) {
                        var label = _categories[cat];
                        var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
                        html.attr('id', this.toID(cat));
                        html.find('.category-name').text(label);
                        // create add button if add event is present
                        if (this.event('add')) {
                            var b = new Button(null, 'add_small', _bus, this.event('add'), {name: label, id: cat});
                            html.find('.category-name').before(b.jq());
                        }
                        // append everything
                        this.jq().append(html);
                    }
                }
                // add elements to list
                var all_data = this._data();
                for (var j in all_data) {
                    if (all_data.hasOwnProperty(j)) {
                        var elem = all_data[j].data;
                        var category = all_data[j].position;
                        // create a container
                        var id = this.toID(elem.id);
                        var cont = new Container($('<li>').attr('id', id), _bus, _container_actions);
                        cont.set(elem);
                        // get the right category
                        if (category && category != 'default') {
                            html = this.jq().find('#' + this.toID(category));
                        } else {
                            html = this.jq().find('#' + this.toID('default'));
                        }
                        // append container to the right category
                        html.append(cont.jq());
                    }
                }
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
        }

        /**
         * Possible container actions.
         */
        var _ACTIONS = ['add', 'del', 'sel', 'edit'];

        return List;
    });
