// ---------- file: list.js ---------- //

if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};

(function() {
  'use strict';

  //-------------------------------------------------------------------------------------
  // Class: VForm
  //-------------------------------------------------------------------------------------

  /* Constructor for the VForm base class.
   * 
   * Input Definitions (inputdefs):
   *    Structure { field_name: { type: <type>, modifier: <mod>, ...}, ...}
   *    Types: text, ltext, file, password, date, num, int, email, boolean and option.
   *    Modifiers: min (number), max (number), obligatory (true/false), options ({id1: val1, ...})
   *
   * Parameter:
   *  - name: String, Obj     Name of the form or jQuery object.
   *
   *  - bus: EventBus         Bus for events.
   *
   *  - inputdefs: Obj        Describes all input fields that should be created 
   *                          automatically.
   *
   *  - onSave: String, function:
   *                          An event or a function to handle save events.
   *
   *  - modal: Boolean        If true then this form can be shown in a modal window.
   *
   * Depends on
   *    jQuery, jQuery-UI, WDAT.api.EventBus
   */
  WDAT.api.VForm = VForm;
  function VForm() {
    
  }
  
  VForm.prototype._init = function(name, bus, inputdefs, onSave, modal) {
    this._title = 'Form';
    this._bus = bus;
    this._modal = modal;
    this._inputdef = {};
    // create form
    if (typeof name === 'string') { // name is a string
      this._form = $('<div class="form-view"></div>').attr('id', name);
      this._name = name;
    } else if (typeof name === 'object') { // name is a jquery object
      this._form = name;
      this._form.addClass('form-view')
      this._name = name.attr('id');
    }
    this._form.append($('<div class="form-fields"></div>'));
    // create input fields
    if (inputdefs) {
      for (var i in inputdefs) {
        this._addField(i, inputdefs[i]);
      } 
    }
    // if not modal create a save button
    if (!modal) {
      // create buttons and actions
      if (!onSave)
        onSave = this.name + '-save';
      this.onSave = onSave;
      var savebtn = $('<button>').button({text : true, label : "Save"});
      if (typeof onSave == 'function') {
        savebtn.click(onSave);
      } else {
        savebtn.click(function() {
          this._bus.publish(onSave);
        });
      }
      this._form.append($('<div class="form-btn"></div>').append(savebtn));
    }
  };

  /* Adds a new field to the form.
   *
   * Parameter:
   *  - id: String      The id of the input.
   *
   *  - inputdef: Obj   The definition object for the input, it has to specify a type
   *                    and can have additionally the following fields: obligatory, min,
   *                    max, value and label, options.
   *                    Valid types are: text, file, email, ltext, num, int, password, 
   *                    option, boolean.
   *
   * Return value:
   *    None
   */
  VForm.prototype._addField = function(id, inputdef) {
    // each form field has a label, an input and a place for error messages
    var label, input, error;
    // generate label
    if (inputdef.label)
      label = inputdef.label + ':';
    else
      label = strCapitalizeWords(id, /[_\-\ \.:]/) + ':'
    label = $('<label class="field-label"></label>').text(label);
    // generate input
    var type = inputdef.type;
    if (_INPUT_TYPEDEF[type]) {
      var def = _INPUT_TYPEDEF[type];
      input = $('<input>').attr('type', def.type);
      if (def.create)
        def.create(input);
      if (inputdef.value)
        input.attr('value', inputdef.value);
      if (!def.nowidth)
        input.addClass('fixed-width');
    } else if (type === 'ltext' || type === 'textarea') {
      input = $('<textarea rows="6"></textarea>');
      input.addClass('fixed-width');
      if (inputdef.value)
        input.text(inputdef.value);
    } else if (type === 'option') {
      input = $('<select size="1"></select>');
      if (inputdef.options) {
        for (var i in inputdef.options) {
          input.append($('<option></option>').attr('value', i).text(inputdef.options[i]));
        }
      }
    } else {
      throw new Error('inputdef has no valid type: inputdef.type = ' + type)
    }
    // add id and name to input
    input.attr('name', this._toId(id)).addClass('field-input');
    // define error field
    error = $('<div class="field-error"></div>');
    // add to input definitions
    this._inputdef[id] = inputdef;
    // add label and input to fields
    var f = this._form.find('.form-fields');
    f.append($('<div></div>').attr('id', this._toId(id)).append(label).append(input).append(error));
  };

  /* Validates the form and marks errors inside the form.
   * 
   * Parameter: 
   *    None
   * 
   * Return value:
   *    True if the form is valid false otherwise.
   */
  VForm.prototype.validate = function() {
    // reset errors
    var valid = true;
    $('.field-error').text('');
    // iterate over input definitions
    for (var name in this._inputdef) {
      var inputdef = this._inputdef[name];
      var field = $('#' + this._toId(name));
      var value = field.find('.field-input').val();
      // test if value is empty
      if (value.match(/^\s*$/)) {
        // check if not empty when obligatory
        if (inputdef.obligatory) {
          field.find('.field-error').text('this field is obligatory');
          valid = false;
          continue;
        }
        value = null;
      } else {  
        // get type definition an do type specific checks
        var typedef = _INPUT_TYPEDEF[inputdef.type]
        if (typedef && typedef.check && !value.match(typedef.check)) {
          field.find('.field-error').text(typedef.fail);
          valid = false;
          continue;
        }
        // check bounds
        if (typedef && (inputdef.type === 'num' || inputdef.type === 'int')) {
          value = parseFloat(value);
          if (inputdef.min !== undefined && value < inputdef.min) {
            field.find('.field-error').text('value must be larger than ' + inputdef.min);
            valid = false;
            continue;
          } else if (inputdef.max !== undefined && value > inputdef.max) {
            field.find('.field-error').text('value must be less than ' + inputdef.max);
            valid = false;
            continue;
          }
        } else {
          value = value.toString();
          if (inputdef.min !== undefined && value.length < inputdef.min) {
            field.find('.field-error').text('value must be longer than ' + inputdef.min);
            valid = false;
            continue;
          } else if (inputdef.max !== undefined && value.length > inputdef.max) {
            field.find('.field-error').text('value must be less than ' + inputdef.max);
            valid = false;
            continue;
          }
        }
      }
    }
    return valid;
  };

  /* Validates the form and read all data from the form.
   * 
   * Parameter:
   *    None
   *
   * Return value:
   *    The data of the form as object or null if 
   *    the form is not valid. 
   */
  VForm.prototype.get = function() {
    if (this.validate()) {
      var data = {}
      for (var name in this._inputdef) {
        var def = this._inputdef[name];
        var input = this._form.find('#' + this._toId(name) + ' :input');
        var val = strTrim(input.val());
        if (def.type === 'num') {
          val = parseFloat(val);
        } else if (def.type === 'int') {
          val = parseInt(val);
        }
        data[name] = val;
      }
      return data;
    } else {
      return null;
    }
  };

  /* Opens the form in a modal window.
   * 
   * Parameters:
   *  - onSave: String, function    Override the event or callback for save 
   *                                events.
   * 
   * Return value:
   *    None
   */
  VForm.prototype.open = function(onSave) {
    if (!onSave)
      onSave = this.onSave;
    if (this._modal && this._form) {
      var that = this;
      if (typeof onSave != 'function') {
        onSave = function() {
          console.log("save pushed");
          that._bus.publish(onSave);
        }
      }
      this._form.dialog({
        autoOpen : true, 
        width : 520,
        modal : true,
        draggable: false,
        resizable: false,
        title: that._title,
        buttons : {
          Cancel : function() {
            $(this).dialog('close');
          },
          Save : function() {
            onSave();
            $(this).dialog('close');
          }
        }
      });
    }
  };

  /* Transforms a name into a internal id.
   * 
   * Parameters:
   *  - name: String      The name of an input element.
   *  
   * Return value:
   *    An internal id string.
   */
  VForm.prototype._toId = function(name) {
    if (!name)
      name = '';
    return this._name + '-' + name;
  };

  /* Internal constant that defines properties for several
   * input types.
   */
  var _INPUT_TYPEDEF = {
          text:   { type: 'text' },
          file:   { type: 'file' },
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
  // Class: VSectionForm
  //-------------------------------------------------------------------------------------
  WDAT.api.VSectionForm = VSectionForm;
  inherit(VSectionForm, VForm);
  function VSectionForm(name, bus, onSave, modal) {
    var inputdef = {
      name: {type: 'text'}
    };
    this._init(name, bus, inputdef, onSave, modal);
    this._title = "Section"
  }
  //-------------------------------------------------------------------------------------
  // Class: VPropertyForm
  //-------------------------------------------------------------------------------------
  

}());
