// ------------------ file: search_bar.js ---------//

var wdat; (function (wdat, $) {
  'use strict';

  /**
   * Class SearchBar
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button
   *
   * @returns {SearchBar}
   */
  wdat.SearchBar = (function() {
    SearchBar.inherits(wdat.Widget);

    /**
     * Constructor for the class SearchBar
     *
     * @param id
     * @param bus
     * @param search
     * @param activate
     *
     * @constructor @this {SearchBar}
     */
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
      this._presets = {};
      // initialize dom
      this._searchbar = $('<textarea rows="2" cols="30">');
      this._jq.find('.search-field').append(this._searchbar);
      this._searchbtn = new wdat.Button('search-btn', 'Search', bus,
                                        this._searchButtonHandler());
      this._jq.find('.search-btn').append(this._searchbtn.jq());
      this._activebox = $('<input type="checkbox" value="active" checked="checked">');
      this._activebox.click(this._activateBoxHandler());
      this._jq.find('.activate-btn').append(this._activebox).append('Apply filter rules');
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
      try {
        var param = this.parse(str);
        if (param.length == 0) {
          param = null;
        }
        return {active: active, param: param};
      } catch (e) {
        return {active: active, param: null, error: e};
      }
    };

    /**
     * Parse strings to search parameter suited for the DataAPI
     *
     * @param str (String)    The string to parse.
     *
     * @returns Array of search parameters.
     */
    SearchBar.prototype.parse = function(str) {
      var splitOR, splitAND, splitOp, error;
      var result = [];
      splitOR = str.split(/\s+[Oo][Rr]\s+|\|/);
      for (var i in splitOR) {
        var partResult = {};
        splitAND = splitOR[i].split(/\s+[Aa][Nn][Dd]\s+|,|&/);
        for (var j in splitAND) {
          splitOp = splitAND[j].split(/([<>=:])/);
          if (splitOp.length == 3) {
            var key = strTrim(splitOp[0]);
            var op  = strTrim(splitOp[1]);
            var val = strTrim(splitOp[2]);
            if (op == ':') op = '=';
            partResult[key] = [val, op];
          } else {
            error = 'Parsing of search parameters failes at substring "' +
                    splitAND[j] + '".';
            throw error;
          }
        }
        result.push(partResult);
      }
      return result;
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
          that._searchbar.attr('readonly', true);
          that._activebox.val('inactive');
        } else {
          that._searchbtn.disable(false);
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
                         '<div class="compose-btn"></div></div></div>';

    return SearchBar;
  })(); // end class SearchBar

})(wdat || (wdat = {}), jQuery); // end module wdat

