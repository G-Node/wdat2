// ---------- file: tab_folder.js ---------- //

(function() {
  "use strict";

  /* Constructor for the class VTabFolder. A tab folder can display one of multiple
   * contents (tabs) inside a defined area. The folder provides functionality to switch
   * between all tabs and to remove and add tabs.
   *
   * Parameters:
   *  - namme: String, Obj.     The id of the list or a jQuery object.
   *
   *  - bus: EventBus           Bus handling events.
   *
   *  - hasControl: boolean     If true the tab folder shows controls that allow to switch
   *                            between tabs.
   *
   * Depends on:
   *  - jQuery, WDAT.api.EventBus
   */
  WDAT.ui.TabFolder = TabFolder;
  inherit(TabFolder, WDAT.Widget);
  function TabFolder(id, bus, hasControl) {
    TabFolder.parent.constructor.call(this, id, '<div>', 'wdat-tab-folder');
    this.bus = bus;
    this.action = this._id + '-select'
    // initialize tabs
    if (hasControl) {
      this._control = $('<ul class="tab-navigation"></ul>');
      this._jq.append(this._control);
    }
  }


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
  TabFolder.prototype.add = function(tab, id, name) {
    // check if id is already used
    if (id && this._jq.children('#' + this.toID(id)).length < 1) {
      // create id and name
      name = name ? name : id;
      // set tab id and class
      tab.addClass('tab-content');
      tab.attr('id', this.toID(id));
      this._jq.append(tab);
      // create control if needed and append tab
      if (this._control) {
        var cont = $('<li></li>').text(name).attr('id', this.toID(id, 'control'));
        var that = this;
        cont.click(function() {
          that.bus.publish(that.action, id);
        });
        this._control.append(cont);
      }
      // select last element
      this.select(id);
      return id;
    } else {
      return null;
    }
  };

  /* Replace the content of an existing tab.
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
   *    None
   */
  TabFolder.prototype.update = function(tab, id, name) {
    if (id && this._jq.children('#' + this.toID(id)).length > 0) {
      // get elem
      var elem = this._jq.children('#' + this.toID(id));
      var selected = elem.is('.selected');
      // replace tab content
      elem.replaceWith(tab)
      tab.addClass('tab-content').toggleClass('selected', selected);
      tab.attr('id', this.toID(id));
      // create control if needed and append tab
      if (this._control && name) {
        var cont = this._control.children('#' + this.toID(id, 'control'));
        cont.text(name);
      }
    }
  };

  /* Rmove an existing tab.
   *
   * Parameter:
   *  - id: String        Individual identifier for the of the tab.
   *
   * Return value:
   *    None
   */
  TabFolder.prototype.remove = function(id) {
    if (id && this._jq.children('#' + this.toID(id)).length > 0) {
      // get and remove elem
      var elem = this._jq.children('#' + this.toID(id));
      var selected = elem.is('.selected');
      elem.remove();
      if (selected)
        this._jq.children('.tab-content').first().addClass('selected');
      // get and remove control
      if (this._control) {
        var cont = this._control.children('#' + this.toID(id, 'control'));
        cont.remove();
        if (selected)
          this._control.children().first().addClass('selected');
      }
    }
  };

  /* Select the tab to display.
   *
   * Parameter:
   *  - id: String        Individual identifier for the of the tab.
   *
   * Return value:
   *    None
   */
  TabFolder.prototype.select = function(id) {
    // deselect all other tabs
    this._jq.children('.tab-content').removeClass('selected');
    this._jq.children('#' + this.toID(id)).addClass('selected');
    if (this._control) {
      this._control.children().removeClass('selected');
      this._control.children('#' + this.toID(id, 'control')).addClass('selected');
    }
  };

  /* Default select handler for selection events fired by the control panel.
   *
   * Return value:
   *    None
   */
  TabFolder.prototype.selectHandler = function() {
    var that = this;
    return function(event, data) {
      that.select(data);
    };
  };

}());

