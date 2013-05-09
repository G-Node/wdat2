//--------- form.js ---------//

/*
 * TODO module description.
 */
define(['util/objects', 'api/model_helpers', 'ui/container'], function (objects, model_helpers, Container) {
    "use strict";

    /**
     * TODO check set, _init and refresh for correct implementation
     *
     * @param id
     * @param bus
     * @param actions
     * @param type
     * @param modal
     *
     * @constructor
     * @extends {Container}
     * @public
     */
    function Form(id, bus, actions, type, modal) {

        var _bus = bus ,
            _actions = {} ,
            _type = type ,
            _is_modal = modal || false ,
            _model, _data;

        Container.apply(this, [id, _FORM_TEMPLATE]);

        this._init = function() {
            // get model and type
            _model = model_helpers.field(_type);

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
                    that._bus.publish(_actions.save, data);
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
         * Refresh the form.
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
                        val = (val !== null && val.data) ? val.data : val;
                        field = this._genField(name, _model[name], val);
                        fieldset.append(field);
                    }
                }
            }
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
