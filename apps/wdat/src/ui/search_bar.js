// ------------------ file: search_bar.js ---------//

(function () {
  'use strict';

  /**
   *
   *  Depends on: jQuery, WDAT.Bus, WDAT.Button
   * */
  WDAT.ui.SearchBar = SearchBar;
  inherit(SearchBar, WDAT.Widget);
  function SearchBar(id, bus, search, activate) {
    SearchBar.parent.constructor.call(this, id, SearchBar.TEMPLATE, 'wdat-search');
    this._bus = bus;
    // initiate actions
    this._actions = {
            search: search || this._id + '-search',
            activate: activate || this._id + '-search',
            type: this._id + '-type',
            compose: this._id + '-compose'
    };
    // initialize dom
    this._searchbar = $('<textarea rows="2" cols="30">');
    this._jq.find('.search-field').append(this._searchbar);
    this._searchbtn = new WDAT.Button('search-btn', 'Search', bus,
                                      this._searchButtonHandler());
    this._jq.find('.search-btn').append(this._searchbtn.jq());
    this._activebox = $('<input type="checkbox" value="active" checked="checked">');
    this._activebox.click(this._activateBoxHandler());
    this._jq.find('.activate-btn').append(this._activebox).append('Activate search');
    this._composebtn = new WDAT.Button('compose-btn', 'Compose', bus,
                                       this._composeButtonHandler());
    this._jq.find('.compose-btn').append(this._composebtn.jq());
  }

  /**
   * Get the event for a specific action.
   *
   * @param action (String)    The action name.
   *
   * @returns The event for the specific action or undefined.
   */
  SearchBar.prototype.event = function(action) {
    var act = this._actions[action];
    if (act && typeof action !== 'function')
      return act;
  };

  /**
   * Returns an object with information about the state and content of the search bar.
   *
   * Information object: {active: boolean, param: search_parameter }
   *
   * @return Object with information about the search field.
   */
  SearchBar.prototype.get = function() {
    // get active state
    var active = (this._activebox.val() == 'active') ? true : false;
    // parse params
    var str = this._searchbar.val();
    var param = this._searchbar.val(); // TODO parse parameter list
    return {active: active, param: param};
  };

  SearchBar.prototype._searchButtonHandler = function() {
    var that = this;
    return function() {
      that._bus.publish(that._actions.search, that.get());
    };
  };

  SearchBar.prototype._activateBoxHandler = function() {
    var that = this;
    return function() {
      var val = that._activebox.val();
      if (val == "active") {
        that._searchbtn.disable(true);
        that._composebtn.disable(true);
        that._searchbar.attr('readonly', true);
        that._activebox.val('inactive');
      } else {
        that._searchbtn.disable(false);
        that._composebtn.disable(false);
        that._searchbar.attr('readonly', null);
        that._activebox.val('active');
      }
      that._bus.publish(that._actions.search, that.get());
    };
  };

  SearchBar.prototype._composeButtonHandler = function() {
    return function() {
      console.log('SearchBar._composeButtonHandler(): not implemented yet');
    };
  };

  SearchBar.TEMPLATE = '<div class="wdat-search"><div class="top-row">' +
                       '<div class="search-field"></div><div class="search-btn"></div>' +
                       '</div><div class="bottom-row"><div class="activate-btn"></div>' +
                       '<div class="compose-btn"></div></div></div>"';
}());
