// ---------- file: form.js ---------- //

(function() {
  'use strict';

  //-------------------------------------------------------------------------------------
  // Class: Form
  //-------------------------------------------------------------------------------------

  /**
   * Constructor for the Form base class.
   *
   * @param id (String, Obj)        String or jQuery object that represents the container.
   * @param title (Sting)           Title of the form.
   * @param bus (Bus)               Bus for handling events.
   * @param actions (Obj, Array)    Definitions of all actions (e.g. save or response).
   * @param model (String, Obj)     Model for the form. This can be a name of a model
   * @param isModal (Boolean)       If true then this form can be shown in a modal window.
   *
   * Depends on: jQuery, jQuery-UI, WDAT.Bus, WDAT.Container, WDAT.model
   *
   * TODO Create form container for lists.
   * TODO Create Parent form with childlist and delete actions.
   */
  WDAT.Form = Form;
  inherit(Form, WDAT.Container);
  function Form(id, bus, actions, model, isModal) {
    Form.parent.constructor.call(this, id, bus, actions, 'wdat-form', Form.FORM_TEMPLATE);
    this._isModal = isModal;                      // true if this is a form for modal dialogs
    // get model and type
    if (typeof model == 'string') {
      this._type = model;
      this._model = modFields(model);
    } else if (typeof model == 'object') {
      this._model = modFields(model.type);
      if (this._model)
        this._type = model.type;
      else
        this._model = model;
    }
    // if not modal create a save button
    if (!isModal && this._actions.save) {
      // create buttons and actions
      var savebtn = $('<button>').button({text : true, label : "Save"});
      var that = this;
      savebtn.click(function() {
        var data = that.get();
        //if (data)
          that._bus.publish(that._actions.save, data);
      });
      this._jq.children('.buttonset').append(savebtn);
    }
    // attach self to dom
    this._jq.data(this);
    // build the form
    this.refresh();
  }

  /**
   * Refresh the form.
   */
  Form.prototype.refresh = function() {
    if (this._model) {
      // clear form
      this._jq.children('.errorset').empty();
      var fieldset = this._jq.children('.fieldset');
      fieldset.empty();
      // generate fields
      for (var name in this._model) {
        // search for field in data
        var val = undefined;
        if (this._data) {
          val = objGetRecursive(this._data, name, ['fields', 'parents', 'data']);
          val = (val != null && val.data) ? val.data : val;
        }
        // if value has a value, get input element and set val
        var field = this._genField(name, this._model[name], val);
        fieldset.append(field);
      }
    }
  };

  /**
   * Creates a jQuery object representing an input field with label.
   * For internal use only.
   *
   * @param name (String) Id for the input.
   * @param def (Obj)     The definition object for the input (see WDAT.type), it must
   *                      specify a type and can have additionally the following fields:
   *                      obligatory, min, max, value and label, options, readonly. Valid
   *                      types are: text, file, email, ltext, num, int, password, option,
   *                      boolean, hidden.
   * @param value (Obj)   The value of the field (optional);
   *
   * @return A jQuery object that represents the input element and a label.
   */
  Form.prototype._genField = function(name, def, value) {
    // create template
    var html = $(Form.FIELD_TEMPLATE).attr('id', this.toID(name));
    var htmlLabel = html.children('.field-label');
    var htmlInput = html.children('.field-input');
    // generate label
    if (def.type != 'hidden') {
      var label = (def.label ? def.label : strCapitalizeWords(name, /[_\-\ \.:]/)) + ':';
      htmlLabel.text(label);
    } else {
      html.addClass('hidden');
    }
    // generate input
    var ftype = Form.FIELD_TYPES[def.type];
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
        input.attr('value', def.value);
    } else if (def.type === 'option') {
      input = $('<select size="1"></select>');
      for (var i in def.options) {
        input.append($('<option></option>').attr('value', i).text(def.options[i]));
      }
    } else {
      throw new Error('field has no valid type: field.type = ' + type);
    }
    if (value) {
      input.attr('value', value);
    } else if (def.value != undefined && def.value != null) {
      input.attr('value', def.value);
    }
    if (def.readonly) {
      input.attr('readonly', 'readonly');
    }
    input.attr('name', this.toID(name));
    htmlInput.append(input);
    return html;
  };

  /**
   * Validates the form and marks errors inside the form.
   *
   * @return True if the form is valid false otherwise.
   */
  Form.prototype.validate = function() {
    // reset errors
    var valid = true;
    this._jq.find('.error').remove();
    // iterate over input definitions
    for (var name in this._model) {
      var def   = this._model[name];
      var html  = this._jq.find('#' + this.toID(name));
      var input = html.children('.field-input').contents();
      var value = input.val();
      var error = $(Form.ERROR_TEMPLATE);
      // test if value is empty
      if (value.match(/^\s*$/)) {
        // check if not empty when obligatory
        if (def.obligatory) {
          error.children('.field-error').text('this field is obligatory');
          html.after(error);
          valid = false;
          continue;
        }
      } else {
        // get type definition an do type specific checks
        var typedef = Form.FIELD_TYPES[def.type];
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
            continue;
          } else if (def.max !== undefined && value > def.max) {
            error.children('.field-error').text('value must be less than ' + def.max);
            html.after(error);
            valid = false;
            continue;
          }
        } else {
          value = value.toString();
          if (def.min !== undefined && value.length < def.min) {
            error.children('.field-error').text('value must be longer than ' + def.min);
            html.after(error);
            valid = false;
            continue;
          } else if (def.max !== undefined && value.length > def.max) {
            error.children('.field-error').text('value must be less than ' + def.max);
            html.after(error);
            valid = false;
            continue;
          }
        }
      }
    }
    return valid;
  };

  /**
   * Set the data object of the form.
   *
   * @param data (Obj)       The data object of the container.
   *
   * @returns The data object or undefined if the data don't match the form type.
   */
  Form.prototype.set = function(data) {
    var newdata = undefined;
    if (data) {
      if (this._type && data.type == this._type) {
        newdata = data;
      } else if (!this._type) {
        newdata = data;
      }
    } else {
      if (this._type) {
        newdata = modCreate(this._type);
      } else {
        newdata = {};
      }
    }
    if (newdata) {
      this._data = newdata;
    }
    this.refresh();
    return newdata;
  };

  /**
   * Validates the form and read all data from the form.
   *
   * Parameter:
   *    None
   *
   * Return value:
   *    The data of the form as object or null if
   *    the form is not valid.
   */
  Form.prototype.get = function() {
    if (this.validate()) {
      for ( var field in this._model) {
        var def = this._model[field];
        var input = this._jq.find('#' + this.toID(field) + ' :input');
        var val = (input.val());
        if (val === '') {
          val = null;
        } else if (def.type === 'num') {
          val = parseFloat(val);
        } else if (def.type === 'int') {
          val = parseInt(val);
        }
        var set = objSetRecursive(this._data, field, val, ['fields', 'parents', 'data']);
        if (!set)
          this._data[field] = val;
      }
      return this._data;
    }
  };

  /**
   * Opens the form in a modal window.
   */
  Form.prototype.open = function() {
    if (this._isModal && this._jq) {
      var title = strCapitalizeWords(this._type, /[_\-\ \.:]/) || 'Form';
      var that = this;
      this._jq.dialog({               // jQuery-UI dialog
        autoOpen : true, width : 610, modal : true,
        draggable: false, resizable: false, title: title,
        buttons : {
          Cancel : function() {         // callback for cancel actions
            $(this).dialog('close');
          },
          Save : function() {           // callback for save actions
            var data = that.get();
            if (data !== null) {
              that._bus.publish(that.event('save'), data);
              $(this).dialog('close');
            }
          }
        }
      });
    }
  };

  /**
   * Some template strings.
   */
  Form.FORM_TEMPLATE = '<div class="wdat-form"><div class="errorset"></div>' +
                       '<div class="fieldset"></div><div class="buttonset"></div></div>';

  Form.FIELD_TEMPLATE = '<div class="field"><div class="field-label"></div>' +
                        '<div class="field-input"></div></div>';

  Form.ERROR_TEMPLATE = '<div class="error"><div class="field-label"></div>' +
                        '<div class="field-error"></div></div>';

  /**
   * Internal constant that defines properties for several input types.
   */
  Form.FIELD_TYPES = {
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

  //-------------------------------------------------------------------------------------
  // Class: FormContainer
  //-------------------------------------------------------------------------------------

  //-------------------------------------------------------------------------------------
  // Class: ParentForm
  //-------------------------------------------------------------------------------------

}());

