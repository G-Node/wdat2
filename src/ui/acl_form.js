//--------- form.js ---------//

/*
 * This module defines the class Form.
 */
define(['util/objects', 'util/strings', 'api/model_helpers', 'ui/container',
    'ui/model_container', 'ui/list'], function (objects, strings, model_helpers, 
    Container, ModelContainer, List) {
    "use strict";

    /**
     * Constructor for the ACL Form class.
     *
     * @param id
     * @param bus
     * @param users
     * @param is_modal
     *
     * @constructor
     * @extends {Container}
     * @public
     */
    function Form(id, bus, users, is_modal) {

        var _bus = bus,
            _is_modal = is_modal || false ,
            _users = users, // permanent array of all users in the system
            _users_autocomplete = [], // array of users available for autocomplete field
            _actions = {}, // actions supported (save)
            _title = 'Undefined', // title of the form
            SECURITY_LEVEL_NUM = model_helpers.SECURITY_LEVEL_NUM,
            SECURITY_LEVEL_STR = model_helpers.SECURITY_LEVEL_STR,
            _sl_input, _auto_input, _shared_with; // field input elements

        // parse users in appropriate for autocompletion users list
        for (var i=0; i < users.length; i++) {
            _users_autocomplete[i] = {"value": users[i]["id"], "label": users[i]["name"]};
        }

        Container.apply(this, [id, _FORM_TEMPLATE, 'wdat-form']);

        this._init = function() { // builds the form
            // form needs only one action
            _actions[ 'save' ] = this.toID( 'save' );

            var fieldset, field;

            // clear form
            this.jq().children('.errorset').empty();
            this.jq().children('.fieldset').empty();
            fieldset = this.jq().children('.fieldset');

            // generate fields
            // 1. SAFETY LEVEL <select> field
            field = $(_FIELD_TEMPLATE).attr('id', this.toID('safety_level'));
            field.children('.field-label').text('Privacy level');

            _sl_input = $('<select size="1"></select>');
            for (var i in SECURITY_LEVEL_NUM) {
                if (SECURITY_LEVEL_NUM.hasOwnProperty(i)) {
                    _sl_input.append($('<option></option>').attr('value', i).text(SECURITY_LEVEL_NUM[i]));
                }
            }
            _sl_input.attr('value', 3); // default is private
            _sl_input.attr('id', this.toID('safety_level'));
            field.children('.field-input').append( _sl_input );
            fieldset.append(field);

            // 2. USER SEARCH autocomplete field
            field = $(_FIELD_TEMPLATE).attr('id', this.toID('user_auto_search'));
            field.children('.field-label').text('Username');

            _auto_input = $('<input>').attr('type', 'text');
            _auto_input.attr('id', this.toID('user_auto_search_input'));
            field.children('.field-input').append( _auto_input );
            fieldset.append(field);

            // 3. SELECTED USERS list field
            field = $(_FIELD_TEMPLATE).attr('id', this.toID('shared_with'));
            field.children('.field-label').text('Selected');

            _shared_with = new List(this.toID('shared_with_selection'), _bus, ['add', 'del']);
            _bus.subscribe(_shared_with.event('del'), this._onRemoveUser());

            field.children('.field-input').append( _shared_with.jq() );
            fieldset.append(field);

            // set up autocompletion actions
            if (!is_modal) {
                var that = this;
                _auto_input.autocomplete({
                    source: _users_autocomplete,
                    select: function (event, ui) {

                        // process selected user without bus
                        that._onSelectUser( ui.item.value );
                        return false;
                    }
                });
            };

            // if not modal create a save button
            if (!_is_modal) {
                var savebtn = $('<button>').button({text : true, label : "Save"});
                var that = this;
                savebtn.click(function() {
                    var data = that.get();
                    _bus.publish(that.event('save'), data);
                });
                this.jq().children('.buttonset').append(savebtn);
            }
        };

        /**
         * Appends user to the selected users list.
         *
         * @param user_id {Number}       User id to append.
         *
         * @returns undefined
         * @private
         */
        this._onSelectUser = function( user_id ) {
            var user = this._getUserByID( user_id );
            var c = new ModelContainer(null, _bus, {'del': _shared_with.event('del')}, user, true);
            _shared_with.addContainer( c );

            /* non-list way
            var lid = _shared_with[0].id;
            var li, index;

            if (!($('#' + lid + ' li[id=' + user.value + ']').length > 0)) {

                // selected item is not in the selected items list, add item
                li = $('<li><div class="object_repr">' + user.username +
                    '</div><div><a style="cursor:pointer" onClick="removeUser(' + user.id +
                    ')"><img src="/site_media/static/pinax/images/img/icon_deletelink.gif" /></a></div></li>');
                li.attr('uid', user.id);
                _shared_with.append( li );

                // remove from the _users_autocomplete list
                index = _users_autocomplete.indexOf( user );
                _users_autocomplete.splice(index, 1);
            }
            */
        }

        /**
         * Crates a handler function for property delete events.
         *
         * @returns {Function}
         * @private
         */
        this._onRemoveUser = function() {
            return function (event, data) {
                if (data && data.id) {
                    _shared_with.del(data.id);
                }
                //var lid = _shared_with[0].id;
                //var user = this._getUserByID( user_id );
                // remove item from the selected items list
                //$('#' + lid + ' li[id=' + user_id + ']').remove();

                // add an item back to the _users_autocomplete list
                //_users_autocomplete.push( {"value": user.id, "label": user.username} );
            }
        }

         /**
         * Set the data object of the form.
         *
         * @param data {Object}       The data object of the container.
         *
         * @returns undefined
         * @public
         */
        this.set = function( data ) {
            var _shared_with_init = [],
                _safety_level_init = 3,
                user;

            // clear the list from previous usages
            _shared_with.clear();
            _auto_input.val('');

            // parse input object data
            _title = data.name;
            _shared_with_init = data.shared_with;
            _safety_level_init = SECURITY_LEVEL_STR[ data.fields.safety_level ];

            if (_shared_with_init === undefined || _safety_level_init === undefined )  {
                throw "A given object does not contain shared_with and safety_level fields."
            };

            // set up the form with actual data
            //selected_option = '#' + _sl_input.id + ' option[value=' + _safety_level_init + ']';
            //$( selected_option ).prop('selected', true);
            _sl_input.val( _safety_level_init );

            for (var username in _shared_with_init) {
                if (_shared_with_init.hasOwnProperty(username)) {

                    user = this._getUserByName( username );
                    if (user) {
                        this._onSelectUser( user.id );
                    }
                }
            }
        };

        /**
         * Read all data from the form.
         *
         * @returns {Object} selected users and a safety level as an object like
         *                      {"safety_level": 3, "shared_with": {"bob": 1, "anita": 2}}
         * @public
         */
        this.get = function() {
            var result = {},
                users = [];

            // fetch selected safety level
            result["safety_level"] = _sl_input.val();

            // fetch selected users
            result["shared_with"] = {};
            users = _shared_with.getAll();
            for (var i=0; i < users.length; i++) {
                result["shared_with"][ users[i]['name'] ] = 1;
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
            var event = null;
            if (_actions.hasOwnProperty(action) && typeof(_actions[action]) !== 'function') {
                event = _actions[action];
            }
            return event;
        };

        /**
         * Opens the form in a modal window.
         *
         * @public
         */
        this.open = function() {
            if (_is_modal && this.jq()) {
                var that = this;

                this.jq().dialog({               // jQuery-UI dialog
                    autoOpen: true,     width : 610,        modal : true,
                    draggable: false,   resizable: false,   title: _title,
                    buttons : {
                        Cancel : function() {         // callback for cancel actions
                            $(this).dialog('close');
                        },
                        Save : function() {           // callback for save actions
                            var data = that.get();
                            if (data) {
                                _bus.publish(that.event('save'), data);
                                $(this).dialog('close');
                            }
                        }
                    }
                });

                _auto_input.autocomplete({
                    source: _users_autocomplete,
                    select: function (event, ui) {

                        // process selected user without bus
                        that._onSelectUser( ui.item.value );
                        return false;
                    }
                });
            }
        };

        /**
         * Fetches a user from the _users list by a given id.
         *
         * @param username {Number}   Id of the required user.
         *
         * @return {Object}     A user object like {"value": 2873, "username": "bob"}
         * @private
         */
        this._getUserByName = function ( username ) {
            var users = _users.filter(function (el) {
                return el.name == username;
            });
            if (users.length > 0) {

                // user found
                return users[0];
            } else {

                // username not found in all users list
                return undefined;
            }
        }

        /**
         * Fetches a user from the _users list by a given id.
         *
         * @param user_id {Number}   Id of the required user.
         *
         * @return {Object}     A user object like {"value": 2873, "username": "bob"}
         * @private
         */
        this._getUserByID = function ( user_id ) {
            var users = _users.filter(function (el) {
                return el.id == user_id;
            });
            if (users.length > 0) {

                // user found
                return users[0];
            } else {

                // user id not found in all users list
                return undefined;
            }
        }

        this._init();
    }

    /**
     * Some template strings.
     */
    var _FORM_TEMPLATE =    '<div class="acl-form"><div class="errorset"></div>' +
        '<div class="fieldset"></div><div class="buttonset"></div></div>';

    var _FIELD_TEMPLATE =   '<div class="field"><div class="field-label"></div>' +
        '<div class="field-input"></div></div>';

    var _ERROR_TEMPLATE =   '<div class="error"><div class="field-label"></div>' +
        '<div class="field-error"></div></div>';

    return Form;
});
