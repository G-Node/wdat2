// ---------- file: list.js ---------- //

if (!WDAT)
  var WDAT = {};
if (!WDAT.api)
  WDAT.api = {};

(function() {

  /*
   * 
   */
  WDAT.api.VForm = VForm;
  function VForm(name, bus, fields, onSave, modal) {
    this._title = 'Form' 
    this._bus = bus;
    this._modal = modal;
    // create form
    if (typeof name === 'string') { // name is a string
      this._form = $('<div class="form-view"></div>').attr('id', name);
      this._name = name;
    } else if (typeof name === 'object') { // name is a jquery object
      this._form = name;
      this._form.addClass('form-view')
      this._name = name.attr('id');
    }
    // create input fields
    if (fields) {
      this._fields = fields;
      var f = this._form.find('.form-fields');
      if (f.length == 0) {
        f = $('<div class="form-fields"></div>');
        this._form.append(f);
      }
      // iterate over fields
      for ( var name in fields) {
        // determine input type
        var type = fields[name];
        var input;
        switch (type) {
          case 'textarea':
            input = $('<textarea rows="6"></textarea>').attr('id', this._toId(name));
            break;
          case 'date':
            input = $('<input type="text" maxlength="10">').attr('id', this._toId(name));
            input.css('width', '220px');
            input.datepicker({dateFormat : "yy/mm/dd"});
            break;
          case 'password':
            input = $('<input type="password" maxlength="60">').attr('id',
                    this._toId(name));
            break;
          default:
            input = $('<input type="text" maxlength="90">').attr('id', this._toId(name));
            break;
        }
        // create a label and append input
        var label = $('<label></label>').attr('id', this._toId(name, true));
        label.text(strCapitalizeWords(name, /[_\-\ \.:]/) + ': ');
        f.append($('<div></div>').append(label).append(input))
      }
    }
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
  }

  VForm.prototype.addField = function() {

  };

  VForm.prototype.get = function() {

  };

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

  VForm.prototype._toId = function(name, isLabel) {
    if (!name)
      name = '';
    if (isLabel)
      return this.name + '-label-' + name;
    else
      return this.name + '-' + name;
  }

}());
