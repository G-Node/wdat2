// ---------- file: tab_folder.js ---------- //

(function() {
  "use strict";

  /**
   * Constructor for the class VTabFolder. A tab folder can display one of multiple
   * contents (tabs) inside a defined area. The folder provides functionality to switch
   * between all tabs and to remove and add tabs.
   *
   * @param id (String, Obj)    The id of the list or a jQuery object.
   * @param bus (Bus)           Bus handling events.
   * @param hasControl (Bool)   If true the tab folder shows controls that allow to switch
   *                            between tabs.
   *
   * Depends on: jQuery, WDAT.Bus
   */
  WDAT.TabFolder = TabFolder;
  inherit(TabFolder, WDAT.MultiContainer);
  function TabFolder(id, bus, hasControl) {
    TabFolder.parent.constructor.call(this, id, bus, ['sel'], 'wdat-tab-folder', '<div>');
    this._hasControl = hasControl;
    if (this._hasControl) {
      this._control = $('<ul class="tab-navigation"></ul>');
      this._jq.append(this._control);
    }
    this._jq.data(this);
  }

  /**
   * Add a new tab to the folder.
   *
   * @param tab (jQuery)  jQuery object representing a block element as
   *                      the content of the tab.
   * @param id (String)   Individual identifier for the of the tab.
   *
   * @return The id of the new tab.
   */
  TabFolder.prototype.add = function(tab, id) {
    var data = TabFolder.parent.add.call(this, {id: id});
    if (data) {
      var label = strCapitalizeWords(id, /[_\-\ \.:]/);
      tab.addClass('tab-content');
      tab.attr('id', this.toID(id));
      this._jq.append(tab);
      // create control if needed and append tab
      if (this._control) {
        var control = $('<li></li>').text(label).attr('id', this.toID(id, 'control'));
        var that = this;
        control.click(function() {
          that._bus.publish(that.event('sel'), id);
        });
        this._control.append(control);
      }
      this.select(id);
      return id;
    }
  };

  /**
   * Replace the content of an existing tab.
   *
   * @param tab (jQuery)  jQuery object representing a block element as
   *                      the content of the tab.
   * @param id (String)   Individual identifier for the of the tab.
   */
  TabFolder.prototype.set = function(tab, id) {
    if (this.has(id)) {
      var html = this._jq.children('#' + this.toID(id));
      var selected = html.is('.selected');
      html.replaceWith(tab);
      tab.addClass('tab-content').toggleClass('selected', selected);
      tab.attr('id', this.toID(id));
    }
  };

  /**
   * Remove an existing tab.
   *
   * @param id (String)   Individual identifier for the of the tab.
   *
   * @return True if the tab was deleted, false otherwise.
   */
  TabFolder.prototype.del = function(id) {
    var deleted = TabFolder.parent.del.call(this, id);
    if (deleted) {
      var html = this._jq.children('#' + this.toID(id));
      var selected = html.is('.selected');
      html.remove();
      if (selected)
        this._jq.children('.tab-content').first().addClass('selected');
      if (this._control) {
        var control = this._control.children('#' + this.toID(id, 'control'));
        control.remove();
        if (selected)
          this._control.children().first().addClass('selected');
      }
    }
    return deleted;
  };

  /**
   * Select the tab to display.
   *
   * @param id (String)   Individual identifier for the of the tab.
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

  /**
   * Default select handler for selection events fired by the control panel.
   *
   * @return A handler function for select events.
   */
  TabFolder.prototype.selectHandler = function() {
    var that = this;
    return function(event, data) {
      that.select(data);
    };
  };

}());

