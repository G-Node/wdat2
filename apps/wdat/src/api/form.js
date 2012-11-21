// ---------- file: list.js ---------- //

if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};

(function(){
  
  /*
   * 
   */
  WDAT.api.VForm = VForm;
  function VForm() {
    this._fields = {};
    this._actions = {};
  }
  
  VForm.prototype._init = function(name, bus, actions, fields) {
    // create form
    if (typeof name === 'string') { // name is a string
      this._form = $('<form class="form-view"></form>').attr('id', name);
      this._name = name;
    } else if (typeof name === 'object') { // name is a jquery object
      this._form = name;
      this._form.addClass('form-view')
      this._name = name.attr('id');
    }
    // create input fields
    if (fields) {
      this._fields = fields;
      var f  = this._form.find('.form-fields');
      if (f.length == 0) {
        f = $('<div class="form-fields"></div>');
        this._form.append(f);
      }
      // iterate over fields
      for (var name in fields) {
        // determine input type
        var type = fields[name];
        var input;
        switch (type) {
          case 'textarea':
            input = $('<textarea  cols="30" rows="6"></textarea>').attr('id', this._toId(name));
            break;
          case 'date':
            input = $('<input type="text" size="30" maxlength="30">').attr('id', this._toId(name));
            input.datepicker({ dateFormat: "yy/mm/dd" });
            break;
          case 'password':
            input = $('<input type="password" size="30" maxlength="60">').attr('id', this._toId(name));
            break;
          default:
            input = $('<input type="text" size="30" maxlength="90">').attr('id', this._toId(name));
            break;
        }
        // create a label and append input
        var label = $('<label></label>').attr('id',this._toId(name, true));
        label.text(strCapitalizeWords(name, /[_\-\ \.:]/) + ': ')
        f.append(label);
        f.append(input)
      }
    }
    // create buttons
    if (actions) {
      this._actions = actions;
      var b = this._form.find('.form-btn');
      if (b.length == 0) {
        b = $('<div class="form-btm"></div>');
        this._form.append(b);
      }
      
    }
  };
  
  VForm.prototype.addField = function() {
    
  };

  VForm.prototype.addButton = function() {
    
  };

  VForm.prototype.get = function() {
    
  };
  
  VForm.prototype._toId = function(name, isLabel) {
    if (!name) name = '';
    if (isLabel)
      return this.name + '-label-' + name;
    else
      return this.name + '-' + name;
  }

}());