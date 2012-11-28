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
  function VForm(name, bus, save, modal, fields) {
    // don't initialize if name and bus are undefined
    if (name && bus) {
      // create form and set name
      if (typeof name === 'string') {               // name is a string
        this._form = $('<div class="form-view">').attr('id', name);
        this._name = name;
      } else if (typeof name === 'object') {        // name is a jquery object
        this._form = name.addClass('form-view');
        this._name = name.attr('id');
      }
      this._form.append($('<div class="form-fields">'));
      // initialize other properties
      this._bus     = bus;                          // an event bus
      this._save    = save || this._name + '-save'  // the save event
      this._modal   = modal;                        // true if this is a form for modal dialogs
      this._element = {};                           // the element showed in the form
      this._fields  = {};                           // definition of input elements
      // create input fields
      for (var i in fields) {
        this.addField(i, fields[i]);
      }
      // if not modal create a save button
      if (!modal) {
        // create buttons and actions
        var savebtn = $('<button>').button({text : true, label : "Save"});
        var that = this;
        savebtn.click(function() { 
          var data = that.get(); 
          if (data) that._bus.publish(that._save, data); 
        });
        this._form.append($('<div class="form-btn"></div>').append(savebtn));
      }
    }
  };

  /* Adds a new field to the form.
   *
   * Parameter:
   *  - id: String      The id of the input.
   *
   *  - field: Obj      The definition object for the input, it has to specify a type
   *                    and can have additionally the following fields: obligatory, min,
   *                    max, value and label, options, readonly.
   *                    Valid types are: text, file, email, ltext, num, int, password, 
   *                    option, boolean, hidden.
   *
   * Return value:
   *    None
   */
  VForm.prototype.addField = function(id, field) {
    // each form field has a label, an input and a place for error messages
    var label, input, error;
    // generate label
    if (field.type !== 'hidden') {
      label = field.label ? field.label+': ' : strCapitalizeWords(id, /[_\-\ \.:]/)+': ';
      label = $('<label class="field-label">').text(label);
    }
    // generate input
    var type = field.type;
    if (FIELD_TYPES[type]) {
      var def = FIELD_TYPES[type];
      input = $('<input>').attr('type', def.type);
      if (def.create) def.create(input);
      if (!def.nowidth) input.addClass('fixed-width');
      if (field.value) input.attr('value', field.value);
    } else if (type === 'ltext' || type === 'textarea') {
      input = $('<textarea rows="6"></textarea>');
      input.addClass('fixed-width');
      if (field.value) input.text(field.value);
    } else if (type === 'option') {
      input = $('<select size="1"></select>');
      for (var i in field.options) {
        input.append($('<option></option>').attr('value', i).text(field.options[i]));
      }
      if (field.value) input.attr('value', inputdef.value);
    } else {
      throw new Error('field has no valid type: field.type = ' + type)
    }
    if (field.readonly) input.attr('readonly', 'readonly');
    input.attr('name', this._toId(id)).addClass('field-input');
    // define error field
    error = $('<div class="field-error"></div>');
    // add to input definitions
    this._fields[id] = field;
    // add label and input to fields
    var f = this._form.find('.form-fields');
    if (label)
      f.append($('<div>').attr('id', this._toId(id)).append(label, input, error));
    else
      f.append($('<div>').attr('id', this._toId(id)).append(input));
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
    for (var name in this._fields) {
      var inputdef = this._fields[name];
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
        var typedef = VForm.FIELD_TYPES[inputdef.type]
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
      var data = this._element || {};
      for (var name in this._fields) {
        var def = this._fields[name];
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

  /* Sets all the values of a form.
   *
   * Parameter:
   *  - elem: Obj       Object representing the data of the form. This can be a plain object
   *                    or an object with a structure as returned by the DataAPI class.
   *
   * Return value:
   *    None
   */
  VForm.prototype.set = function(elem) {
    this._element = elem;
    for (var name in this._fields) {
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
  VForm.prototype.open = function() {
    if (this._modal && this._form) {
      var title = this._title || 'Form';
      var that = this;
      this._form.dialog({               // jQuery-UI dialog
        autoOpen : true, width : 520, modal : true,
        draggable: false, resizable: false, title: title,
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
  var FIELD_TYPES = {
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
  VForm.FIELD_TYPES = FIELD_TYPES;

  //-------------------------------------------------------------------------------------
  // Class: VSectionForm
  //-------------------------------------------------------------------------------------
  WDAT.api.VSectionForm = VSectionForm;
  inherit(VSectionForm, VForm);
  function VSectionForm(name, bus, save, modal) {
    this._title = 'Section';
    var fields = {
      type: {type: 'hidden', value: 'section'},
      name: {type: 'text', obligatory: true, min: 3, max: 100},
      odml_type: {type: 'int', label: 'Type', obligatory: true, min: 0},
      tree_position: {type: 'int', label: 'Position', value: 0},
      description: {type: 'ltext'},
      safety_level: {type: 'option',  options: {'public': 'Public', 'friendly': 'Friendly', 'private': 'Private'}},
      date_created: {type: 'text', readonly: true}
    };
    VSectionForm.parent.constructor.call(this, name, bus, save, modal, fields);
  }
  
  //-------------------------------------------------------------------------------------
  // Class: VPropertyForm
  //-------------------------------------------------------------------------------------
  WDAT.api.VPropertyForm = VPropertyForm;
  inherit(VPropertyForm, WDAT.api.VForm);
  function VPropertyForm(name, bus, save, modal) {
    this._title = 'Property'
    var fields = {
      type: {type: 'hidden', value: 'property'},
      name: {type: 'text', obligatory: true, min: 3, max: 100},
      unit: {type: 'text', max: 10 },
      uncertainty: {type: 'text'},
      dtype: {type: 'text', label: 'Data Type'},
      //dependency: {type: 'text'},
      //dependency_value: {type: 'text'},
      //mapping: {type: 'text'},
      definition: {type: 'ltext'},
      //comment: {type: 'ltext'},
      date_created: {type: 'text', readonly: true}
    };
    VPropertyForm.parent.constructor.call(this, name, bus, save, modal, fields);
    this._form.find('.form-fields').after($('<div class="property-values">'));
    this._values = {};
  }
  
  VPropertyForm.prototype.setValue = function(value) {
    value = value || {}
    var id = 'val-' + this._bus.uid();
    var input = $('<input type="text">').addClass('value-input field-input').attr('id', id);
    if (value.name) 
      input.attr('value', input.name);
    var label = $('<label class="field-label">').text('Value: ');
    var delbtn = $('<button>').button({ icons: { primary: "ui-icon-minusthick"}, text: false}).click(function () {
      console.log('remove');
    });
    var addbtn = $('<button>').button({ icons: { primary: "ui-icon-plusthick"}, text: false}).click(function () {
      console.log('add');
    });
    var v = this._form.find('.property-values');
    v.append($('<div>').attr('id', this._toId(id)).append(label, input, addbtn, delbtn));
  };


}());
