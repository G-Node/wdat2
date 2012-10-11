// ---------- file: tab_folder.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* Constructor for the class VTabFolder. A tab folder is a 
 * 
 * Parameters: 
 * 
 * Depends on: 
 *  - jQuery, WDAT.api.EventBus
 */
WDAT.api.VTabFolder = function(name, bus, hasControl) {
  // initialize name and tree body (_folder)
  if (typeof name == 'string') { // name is a string
    this._folder = $('<div class="tab-folder"></div>').attr('id', name);
    this.name = name;
  } else if (typeof name === 'object') { // name is a jQuery object
    this._folder = name;
    this._folder.addClass('tab-folder');
    this.name = this._folder.attr('id');
  }
  this.bus = bus;
  this.event = this.name + '-select'
  // initialize tabs
  if (hasControl) {
    this._control = $('<ul class="tab-navigation"></ul>');
    this._folder.append(this._control);
  }
};

// define the tab folders methods in their own scope
(function() {

  /* Add a new tab to the folder. 
   * 
   * Parameter:
   *  - tab: jQuery       jQuery object representing a block element as
   *                      the content of the tab.
   *
   *  - id: String        Individual identifier for the of the tab.
   *  
   *  - name: String      A human readable name used in the tab control bar (optional).
   * 
   * Return value:
   *    The id of the new tab.
   */
  WDAT.api.VTabFolder.prototype.add = function(tab, id, name) {
    // check if id is already used
    if (id && this._folder.children('#' + this._toId(id)).length < 1) {
      // create id and name
      name = name ? name : id;
      // set tab id and class
      tab.addClass('tab-content');
      tab.attr('id', this._toId(id));
      this._folder.append(tab);
      // create control if needed and append tab
      if (this._control) {
        var cont = $('<li></li>').text(name).attr('id', this._toControlId(id));
        var that = this;
        cont.click(function() { that.bus.publish(that.event, id); });
        this._control.append(cont);
      }
      // select last element
      this.select(id);
      return id;
    } else {
      return null;
    }
  };
  
  /*
   * 
   */
  WDAT.api.VTabFolder.prototype.update = function(tab, id, name) {
    if (id && this._folder.children('#' + this._toId(id)).length > 0) {
      // get elem
      var elem = this._folder.children('#' + this._toId(id));
      var selected = elem.is('.selected');
      // replace tab content
      elem.replaceWith(tab)
      tab.addClass('tab-content').toggleClass('selected', selected);
      tab.attr('id', this._toId(id));
      // create control if needed and append tab
      if (this._control && name) {
        var cont = this._control.children('#' + this._toControlId(id));
        cont.text(name);
      }
    } 
  };
  
  /*
   * 
   */
  WDAT.api.VTabFolder.prototype.remove = function(id) {
    if (id && this._folder.children('#' + this._toId(id)).length > 0) {
      // get and remove elem
      var elem = this._folder.children('#' + this._toId(id));
      var selected = elem.is('.selected');
      elem.remove();
      if (selected)
        this._folder.children('.tab-content').first().addClass('selected');
      // get and remove control
      if (this._control) {
        var cont = this._control.children('#' + this._toControlId(id));
        cont.remove();
        if (selected) 
          this._control.children().first().addClass('selected');
      }
    } 
  };

  /*
   * 
   */
  WDAT.api.VTabFolder.prototype.select = function(id) {
    // deselect all other tabs
    this._folder.children('.tab-content').removeClass('selected');
    this._folder.children('#' + this._toId(id)).addClass('selected');
    if (this._control) {
      this._control.children().removeClass('selected');
      this._control.children('#' + this._toControlId(id)).addClass('selected');
    }
  };

  var _handler = null;
  WDAT.api.VTabFolder.prototype.selectHandler = function() {
    if (_handler === null) {
      var that = this;
      _handler = function(event, data) {
        that.select(data);
      };
    }
    return _handler;
  };

  /* Helper function for the creation of unique ids.
   * For internal use only.
   */
  WDAT.api.VTabFolder.prototype._toId = function(id) {
    var result = null;
    if (id != null && id != undefined) {
      if (id['id'])
        result = this.name + '-' + id.id.toString();
      else
        result = this.name + '-' + id.toString();
    } 
    return result;
  };
  
  /* Helper function for the creation of unique ids.
   * For internal use only.
   */
  WDAT.api.VTabFolder.prototype._toControlId = function(id) {
    var result = null;
    if (id != null && id != undefined) {
      if (id['id'])
        result = this.name + '-control-' + id.id.toString();
      else
        result = this.name + '-control-' + id.toString();
    } 
    return result;
  };

}());
