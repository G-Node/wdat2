// ---------- file: data_view.js ---------- //

(function() {
  "use strict";

  //-------------------------------------------------------------------------------------
  // Class: DataView
  //-------------------------------------------------------------------------------------

  /**
   * Constructor for the class DataView.
   *
   * Parameters:
   *  - id: String/Obj      Name/ID for this individual section view or a jQuery object representing
   *                        an empty div that will be used as the container for the view.
   *
   *  - bus: EventBus       A bus handling events.
   *
   * Depends on:
   *  - jQuery, WDAT.api.EventBus, WDAT.Button, WDAT.Container
   */
  WDAT.DataView = DataView;
  function DataView(html, api, bus, selSection, searchEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-data-view');
    var navId = id + '-bread-crumb';
    var listId = id + '-ephys-list';
    this._jq = html;
    // initialize bread crumb
    this._nav = new WDAT.BreadCrumb(navId, bus);
    this._nav.add({id: 'root', name: '>>'}, 0);
    this._jq.append(this._nav.jq());
    // initialize list
    this._list = new WDAT.List(listId, bus, ['edit', 'del', 'sel']);
    this._jq.append(this._list.jq());
    // bus and api
    this._bus = bus;
    this._api = api;
    // initial values for section and search
    this._searchActive = false;
    this._searchParam = null;
    this._selectedSection = null;
    this._actions = {
      sel: selSection,
      search: searchEvent,
      update: id + '-udate'
    };
    // subscribe events
    bus.subscribe(selSection, this._selectSectionHandler());
  }

  DataView.SPECIAL_NODES = ['own-not-annotated', 'own-all', 'shared-not-annotated',
                            'shared-all', 'public-not-annotated', 'public-all'];

  /**
   * Evaluates the active search configurations and the selected section and
   * perform one request on the DataAPI that gets all the data.
   */
  DataView.prototype._requestData = function(requestEvent) {
    // preinitialize search
    var search = [{}];
    if (this._searchActive && this._searchParam) {
      search = this._searchParam;
      if (typeof search == 'object')
        search = [search];
    }
    // prepare search depending on sections selection
    if (this._selectedSection) {
      switch (this._selectedSection) {
        case 'own-all':
          search = _createSearchOwnAll(search, '2'); // TODO get real user from api
          break;
        case 'shared-all':
          search = _createSearchSharedAll(search, '2');
          break;
        case 'public-all':
          search = _createSearchPublicAll(search, '2');
          break;
        default:
          if (DataView.SPECIAL_NODES.indexOf(this._selectedSection) < 0) {
            search = _createSearchBySectionSelected(search, this._selectedSection);
          } else {
            search = null;
          }
          break;
      }
    } else {
      search = _createSearchNoSelection(search);
    }
    // perform search
    if (search)
      this._api.get(requestEvent, search);
  };


  DataView.prototype._selectSectionHandler = function() {
    var that = this;
    return function(event, data) {
      var oldId = that._selectedSection;
      if (data && data.id) {
        var id = data.id;
        if (data.type == 'section') {
          that._selectedSection = id;
        } else if (DataView.SPECIAL_NODES.indexOf(id) >= 0) {
          that._selectedSection = id;
        } else {
          that._selectedSection = null;
        }
      } else {
        that._selectedSection = null;
      }
      if (oldId != that._selectedSection) {
        that._requestData(that._actions.update);
      }
    };
  };

  DataView.prototype._searchEventHandler = function() {
    // TODO implement
  };

  DataView.prototype._updateDataHandler = function() {
    // TODO implement
  };

  DataView.prototype._selectDataHandler = function() {
    // TODO implement
  };

  DataView.prototype._editDataHandler = function() {
    // TODO implement
  };

  DataView.prototype._deleteDataHandler = function() {
    // TODO implement
  };

  DataView.prototype._selectNavHandler = function() {
    // TODO implement
  };

  /**
   * Apply search on all data.
   *
   * @param search (Array)    Array with search parameters.
   */
  function _createSearchNoSelection(search) {
    // all ephys type names
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      if (partSearch.type) {
        searchCreated.push(partSearch);
      } else {
        for (var j in types) {
          var cpySearch = {};
          jQuery.extend(true, cpySearch, partSearch);
          cpySearch.type = types[j];
          searchCreated.push(cpySearch);
        }
      }
    }
    return searchCreated;
  }

  /**
   * Apply search on all public data.
   *
   * @param search (Array)    Array with search parameters.
   */
  function _createSearchPublicAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      partSearch.safety_level = 'public';
      partSearch.owner = [user, '!='];
      if (partSearch.type) {
        searchCreated.push(partSearch);
      } else {
        for (var j in types) {
          var cpySearch = {};
          jQuery.extend(true, cpySearch, partSearch);
          cpySearch.type = types[j];
          searchCreated.push(cpySearch);
        }
      }
    }
    return searchCreated;
  }

  /**
   * Apply search on all shared data.
   *
   * @param search (Array)    Array with search parameters.
   */
  function _createSearchSharedAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      partSearch.safety_level = 'friendly';
      partSearch.owner = [user, '!='];
      if (partSearch.type) {
        searchCreated.push(partSearch);
      } else {
        for (var j in types) {
          var cpySearch = {};
          jQuery.extend(true, cpySearch, partSearch);
          cpySearch.type = types[j];
          searchCreated.push(cpySearch);
        }
      }
    }
    return searchCreated;
  }

  /**
   * Apply search on all own data.
   *
   * @param search (Array)    Array with search parameters.
   */
  function _createSearchOwnAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      partSearch.owner = user;
      if (partSearch.type) {
        searchCreated.push(partSearch);
      } else {
        for (var j in types) {
          var cpySearch = {};
          jQuery.extend(true, cpySearch, partSearch);
          cpySearch.type = types[j];
          searchCreated.push(cpySearch);
        }
      }
    }
    return searchCreated;
  }

  /**
   * Apply search on all public data.
   *
   * @param search (Array)    Array with search parameters.
   */
  function _createSearchBySectionSelected(search, section) {
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      partSearch.parent = section;
      partSearch.type = 'block';
      searchCreated.push(partSearch);
    }
    return searchCreated;
  }

}());
