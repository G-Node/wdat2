//--------- form.js ---------//

/*
 * This module defines the class Form.
 */
define(['util/objects', 'util/strings', 'api/model_helpers', 'ui/container'],
    function (objects, strings, model_helpers, Container) {
    "use strict";

    /**
     * Constructor for the Form base class.
     * TODO check set, _init and refresh for correct implementation
     *
     * @param id
     * @param bus
     * @param actions
     * @param type
     * @param is_modal
     *
     * @constructor
     * @extends {Container}
     * @public
     */
    function Form(id, bus, actions, type, is_modal) {

        var _bus = bus ,
            _actions = {} ,
            _is_modal = is_modal || false ,
            _model, _data, _type;

        Container.apply(this, [id, _FORM_TEMPLATE, 'wdat-form']);

        this._init = function() {
            // get model and type
            if (typeof type === 'string') {
                _type  = type;
                _model = model_helpers.fields(type);
            } else if (typeof type === 'object') {
                if (model_helpers.isType(type.type)) {
                    _type  = type.type;
                    _model = model_helpers.fields(type.type);
                } else {
                    _model = type;
                }
            }

            // init actions
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

            // if not modal create a save button
            if (!_is_modal && _actions['save']) {
                var savebtn = $('<button>').button({text : true, label : "Save"});
                var that = this;
                savebtn.click(function() {
                    var data = that.get();
                    _bus.publish(_actions.save, data);
                });
                this.jq().children('.buttonset').append(savebtn);
            }
            // attach self to dom
            // this._jq.data(this);
            // build the form
            this.refresh();
        };

        /**
         * Set the data object of the form.
         *
         * @param data {Object}       The data object of the container.
         *
         * @returns {Object} The data object or undefined if the data don't match the form type.
         * @public
         */
        this.set = function(data) {
            var newdata;

            if (data) {
                if (_type && data.type == _type) {
                    newdata = data;
                } else if (!_type) {
                    newdata = data;
                }
            } else {
                if (_type) {
                    newdata = model_helpers.create(_type);
                } else {
                    newdata = {};
                }
            }
            if (newdata) {
                _data = newdata;
            }
            this.refresh();

            return newdata;
        };

        /**
         * Validates the form and read all data from the form.
         *
         * @returns {Object} The data of the form as object or null if the form is not valid.
         * @public
         */
        this.get = function() {

            if (this.validate()) {

                for ( var field in _model) {
                    if (_model.hasOwnProperty(field)) {
                        var def   = _model[field];
                        var input = this.jq().find('#' + this.toID(field) + ' :input');
                        var val   = (input.val());

                        if (val === '') {
                            val = null;
                        } else if (def.type === 'num') {
                            val = parseFloat(val);
                        } else if (def.type === 'int') {
                            val = parseInt(val);
                        }

                        var is_set = objects.deepSet(_data, field, val, ['fields', 'parents', 'data']);
                        if (!is_set) {
                            _data[field] = val;
                        }
                    }
                }

                return _data;
            }

            return null;
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
         * Validates the form and marks errors inside the form.
         *
         * @return {Boolean} True if the form is valid false otherwise.
         * @public
         */
        this.validate = function() {
            var valid = true;

            // reset errors
            this.jq().find('.error').remove();

            // iterate over input definitions
            for (var name in _model) {
                if (_model.hasOwnProperty(name)) {
                    var def   = _model[name];
                    var html  = this.jq().find('#' + this.toID(name));
                    var input = html.children('.field-input').contents();
                    var value = input.val();
                    var error = $(_ERROR_TEMPLATE);

                    // test if value is empty
                    if (value.match(/^\s*$/)) {
                        // check if not empty when obligatory
                        if (def.obligatory) {
                            error.children('.field-error').text('this field is obligatory');
                            html.after(error);
                            valid = false;
                        }
                    } else {
                        // get type definition an do type specific checks
                        var typedef = _FIELD_TYPES[def.type];
                        if (typedef && typedef.check && !value.match(typedef.check)) {
                            error.children('.field-error').text(typedef.fail);
                            html.after(error);
                            valid = false;
                            continue;
                        }
                        // check bounds
                        if (typedef && (def.type === 'num' || def.type === 'int')) {
                            value = parseFloat(value);
                            if (def.min !== undefined && value < def.min) {
                                error.children('.field-error').text('value must be larger than ' + def.min);
                                html.after(error);
                                valid = false;
                            } else if (def.max !== undefined && value > def.max) {
                                error.children('.field-error').text('value must be less than ' + def.max);
                                html.after(error);
                                valid = false;
                            }
                        } else {
                            value = value.toString();
                            if (def.min !== undefined && value.length < def.min) {
                                error.children('.field-error').text('value must be longer than ' + def.min);
                                html.after(error);
                                valid = false;
                            } else if (def.max !== undefined && value.length > def.max) {
                                error.children('.field-error').text('value must be less than ' + def.max);
                                html.after(error);
                                valid = false;
                            }
                        }
                    }
                }
            }

            return valid;
        };

        /**
         * Refresh the form.
         *
         * @public
         */
        this.refresh = function() {
            if (_model && _data) {
                var fieldset, field, name, val;

                // clear form
                this.jq().children('.errorset').empty();
                fieldset = this.jq().children('.fieldset');
                fieldset.empty();

                // generate fields
                for (name in _model) {
                    if (_model.hasOwnProperty(name)) {
                        val = objects.deepGet(_data, name, ['fields', 'parents', 'data']);
                        val = (val != null && val.data) ? val.data : val;
                        field = this._genField(name, _model[name], val);
                        fieldset.append(field);
                    }
                }
            }
        };

        /**
         * Opens the form in a modal window.
         *
         * @public
         */
        this.open = function() {
            if (_is_modal && this.jq()) {
                var title = strings.capitalWords(_type, /[_\- \.:]/) || 'Form';
                var that = this;

                this.jq().dialog({               // jQuery-UI dialog
                    autoOpen: true,     width : 610,        modal : true,
                    draggable: false,   resizable: false,   title: title,
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
            }
        };

        /**
         * Creates a jQuery object representing an input field with label.
         * For internal use only.
         *
         * @param name {String} Id for the input.
         * @param def {Object}  The definition object for the input (see WDAT.type), it must
         *                      specify a type and can have additionally the following fields:
         *                      obligatory, min, max, value and label, options, readonly. Valid
         *                      types are: text, file, email, ltext, num, int, password, option,
         *                      boolean, hidden.
         * @param value {*}     The value of the field (optional);
         *
         * @return {jQuery} A jQuery object that represents the input element and a label.
         * @private
         */
        this._genField = function(name, def, value) {
            // create template
            var html        = $(_FIELD_TEMPLATE).attr('id', this.toID(name));
            var html_label  = html.children('.field-label');
            var html_input  = html.children('.field-input');

            // generate label
            if (def.type != 'hidden') {
                var label = (def.label ? def.label : strings.capitalWords(name, /[_\- \.:]/)) + ':';
                html_label.text(label);
            } else {
                html.addClass('hidden');
            }

            // generate input
            var ftype = _FIELD_TYPES[def.type];
            var input = null;

            if (ftype) {
                input = $('<input>').attr('type', ftype.type);
                if (ftype.create)
                    ftype.create(input);
                if (!ftype.nowidth)
                    input.addClass('fixed-width');
            } else if (def.type === 'ltext' || def.type === 'textarea') {
                input = $('<textarea rows="6"></textarea>');
                input.addClass('fixed-width');
            } else if (def.type === 'option') {
                input = $('<select size="1"></select>');
                for (var i in def.options) {
                    if (def.options.hasOwnProperty(i)) {
                        input.append($('<option></option>').attr('value', i).text(def.options[i]));
                    }
                }
            } else {
                throw new Error('field has no valid type: field.type = ' + type);
            }
            if (value) {
                input.val(value);
            } else if (def.value !== undefined && def.value !== null) {
                input.val(def.value);
            }
            if (def.readonly) {
                input.attr('readonly', 'readonly');
            }

            input.attr('name', this.toID(name));
            html_input.append(input);
            return html;
        };

        this._init();
    }

    /**
     * Some template strings.
     */
    var _FORM_TEMPLATE =    '<div class="wdat-form"><div class="errorset"></div>' +
                            '<div class="fieldset"></div><div class="buttonset"></div></div>';

    var _FIELD_TEMPLATE =   '<div class="field"><div class="field-label"></div>' +
                            '<div class="field-input"></div></div>';

    var _ERROR_TEMPLATE =   '<div class="error"><div class="field-label"></div>' +
                            '<div class="field-error"></div></div>';

    var _ACTIONS = ['save'];

    /**
     * Internal constant that defines properties for several input types.
     */
    var _FIELD_TYPES = {
        text:   { type: 'text' },
        file:   { type: 'file' },
        hidden: { type: 'hidden'},
        password: { type: 'password' },
        date:   { type: 'text',
            create: function(input) { input.datepicker({dateFormat : "yy/mm/dd"}); },
            nowidth: true },
        num:    { type: 'text',
            check: /^[-+]?[0-9]{1,16}\.?[0-9]{0,16}([eE][-+]?[0-9]+)?$/,
            fail: 'is not a valid number (floeatingpoint)' },
        int:    { type: 'text',
            check: /^[0-9]{1,16}?$/,
            fail: 'is not a valid number (integer)' },
        email:  { type: 'text',
            check: /^[a-zA-Z][\w\.\-]{1,128}@[a-zA-Z][\w\.\-]{1,128}\.[a-zA-Z]{2,4}$/,
            fail: 'is not a valid email address' },
        boolean:  { type: 'checkbox',
            nowidth: true }
    };

    return Form;
});
