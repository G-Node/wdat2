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
   *
   *    Types: text, ltext, file, password, date, num, int, email, boolean,
   *           hidden and option.
   *
   *    Modifiers: min (number), max (number), obligatory (true/false), 
   *               options ({id1: val1, ...}), readonly (true/false).
   *
   * Parameter:
   *  - name: String, Obj     Name of the form or jQuery object.
   *  
   *  - title: Sting          The title of the form.
   *
   *  - bus: EventBus         Bus for events.
   *
   *  - inputdefs: Obj        Describes all input fields that should be created automatically. 
   *
   *  - save: String          An event for the handling of save events.
   *
   *  - modal: Boolean        If true then this form can be shown in a modal window.
   *
   * Depends on
   *    jQuery, jQuery-UI, WDAT.api.EventBus
   */
  WDAT.api.VForm = VForm;
  function VForm(name, title, bus, inputdefs, save, modal) {
    this._init(name, title, bus, inputdefs, save, modal);
  }

  /* Method for form object initialisation. See VForm for documentation.
   */
  VForm.prototype._init = function(name, title, bus, inputdefs, save, modal) {
    this._elem = null;        // the element showed in the form
    this._bus = bus;          // an event bus 
    this._modal = modal;      // true if this is a form for modal dialogs
    this._inputdefs = {};     // definition of input elements
    this._save  = save  || this.name + '-save';   // the event that is fired on save
    this._title = title || 'Form';                // the title of the form
    // create form and set name
    if (typeof name === 'string') {               // name is a string
      this._form = $('<div class="form-view">').attr('id', name);
      this._name = name;
    } else if (typeof name === 'object') {        // name is a jquery object
      this._form = name.addClass('form-view');
      this._name = name.attr('id');
    }
    this._form.append($('<fieldset>').addClass('form-fields'));
    // create input fields
    for (var i in inputdefs) {
      this._addField(i, inputdefs[i]);
    }
    // if not modal create a save button
    if (!modal) {
      // create buttons and actions
      var savebtn = $('<button>').button({text : true, label : "Save"});
      var that = this;
      savebtn.click(function() { 
        var data = that.get(); 
        if (data) that._bus.publish(that._save, data); });
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
   *                    max, value and label, options, readonly.
   *                    Valid types are: text, file, email, ltext, num, int, password, 
   *                    option, boolean, hidden.
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
    } else if (type === 'hidden'){ 
      input = $('<input>').attr('type', 'hidden');
      label = null;
      if (inputdef.value)
        input.attr('value', inputdef.value);
    } else {
      throw new Error('inputdef has no valid type: inputdef.type = ' + type)
    }
    if (inputdef.readonly) {
      input.attr('readonly', 'readonly');
    }
    // add id and name to input
    input.attr('name', this._toId(id)).addClass('field-input');
    // define error field
    error = $('<div class="field-error"></div>');
    // add to input definitions
    this._inputdefs[id] = inputdef;
    // add label and input to fields
    var f = this._form.find('.form-fields');
    if (label)
      f.append($('<div></div>').attr('id', this._toId(id)).append(label).append(input).append(error));
    else
      f.append($('<div></div>').attr('id', this._toId(id)).append(input));
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
    for (var name in this._inputdefs) {
      var inputdef = this._inputdefs[name];
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
      var data = this._elem || {};
      for (var name in this._inputdefs) {
        var def = this._inputdefs[name];
        var input = this._form.find('#' + this._toId(name) + ' :input');
        var value = (input.val());
        if (value === '') {
          value = null;
        } else if (def.type === 'num') {
          value = parseFloat(value);
        } else if (def.type === 'int') {
          value = parseInt(value);
        }
        var set = objSetRecursive(data, name, value, ['fields', 'parents', 'data']);
        if (!set) data[name] = value;
      }
      return data;
    } else {
      return null;
    }
  };

  /* Sets the values of a form.
   *
   * Parameter:
   *  - elem: Obj       Object representing the data of the form. This can be a plain object
   *                    or an object with a structure as returned by the DataAPI class.
   *
   * Return value:
   *    None
   */
  VForm.prototype.set = function(elem) {
    this._elem = elem;
    for (var name in this._inputdefs) {
      // search for field in data
      var value = objGetRecursive(elem, name, ['fields', 'parents', 'data']);
      value = value.data || value;
      // if value has a value, get input element and set val
      if (value !== null) {
        var input = this._form.find('#' + this._toId(name) + ' :input');
        value = strTrim(value.toString());
        input.val(value);
      }
    }
  };

  /* Opens the form in a modal window.
   * 
   * Parameters:
   *  - save: String, function    Override the event or callback for save 
   *                                events.
   * 
   * Return value:
   *    None
   */
  VForm.prototype.open = function(save) {
    if (this._modal && this._form) {
      if (!save)
        save = this.save;
      var that = this;
      this._form.dialog({               // jQuery-UI dialog
        autoOpen : true, width : 520, modal : true,
        draggable: false, resizable: false, title: that._title,
        buttons : {
          Cancel : function() {         // callback for cancel actions
            $(this).dialog('close');
          },
          Save : function() {           // callback for save actions
            var data = that.get();
            if (data !== null) {
              that._bus.publish(that._save, data);
              $(this).dialog('close');
            }
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
  function VSectionForm(name, bus, save, modal) {
    var inputdefs = {
      id: {type: 'hidden'},
      name: {type: 'text', obligatory: true, min: 3, max: 100},
      odml_type: {type: 'int', label: 'Type', obligatory: true, min: 0},
      tree_position: {type: 'int', label: 'Position', value: 0},
      description: {type: 'ltext'},
      safety_level: {type: 'option',  options: {'public': 'Public', 'friendly': 'Friendly', 'private': 'Private'}},
      date_created: {type: 'text', readonly: true}
    };
    this._init(name, 'Section', bus, inputdefs, save, modal);
  }
  
  //-------------------------------------------------------------------------------------
  // Class: VPropertyForm
  //-------------------------------------------------------------------------------------
  

}());
