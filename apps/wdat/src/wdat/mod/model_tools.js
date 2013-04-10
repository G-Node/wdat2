// ---------- file: mod/model_tools.js ---------- //


// Add helper and tool functions for models to the module 'wdat.mod'.
// Import: wdat.mod as mod and jQuery as $
var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Find the matching category for specific type using WDAT.model.
   *
   * @param type {string}   The type of a data object e.g. section, segment or analogsignal
   *
   * @return {string} The corresponding category e.g. metadata or electrophysiology
   */
  wdat.modelCategory = function(type) {
    var t = type.toString().toLowerCase();
    if (wdat.model.metadata.hasOwnProperty(t))
      return 'metadata';
    else if (wdat.model.ephys.container.hasOwnProperty(t))
      return 'electrophysiology';
    else if (wdat.model.ephys.plotable.hasOwnProperty(t))
      return 'electrophysiology';
  };

  // just a local var that serves as a chache.
  var _templateCache = {};

  /**
   * Get the matching template for a specific type defined in WDAT.model.
   *
   * @param type {string}   The type of a data object e.g. section, segment or analogsignal
   *
   * @return {Object} The corresponding template object defined in wdat.wdat.model or undefined if
   *                  no such type is specified.
   */
  wdat.modelTemplate = function(type) {
    if (type) {
      var t = type.toString().toLowerCase();
      // try to get template from cache
      if (!_templateCache[t]) {
        var tmpl, merged = {};
        // create template
        if (wdat.model.metadata.hasOwnProperty(t))
          tmpl = wdat.model.metadata[t];
        else if (wdat.model.ephys.container.hasOwnProperty(t))
          tmpl = wdat.model.ephys.container[t];
        else if (wdat.model.ephys.plotable.hasOwnProperty(t))
          tmpl = wdat.model.ephys.plotable[t];

        // merge with all
        if (tmpl) {
          $.extend(true, merged, tmpl);
          $.extend(true, merged, wdat.model.all);
          _templateCache[t] = merged;
          return merged;
        }
      } else {
        return _templateCache[t];
      }
    }
  };

  /**
   * Get all defined fields for a specific type described in WDAT.model
   *
   * @param type {string}   Object with all defined fields or 'undefined' if no such type or no fields
   *                        are specified.
   *
   * @return {Object} An object with all defined fields or 'undefined' if no such type or no fields
   *                  are specified.
   */
  wdat.modelFields = function(type) {
    var tmpl = wdat.modelTemplate(type);
    if (tmpl && tmpl.fields) {
      return tmpl.fields;
    }
  };

  /**
   * Get all defined data fields for a specific type described in WDAT.model
   *
   * @param type {string}   The type of a data object.
   *
   * @return {Object} An object with all defined data or 'undefined' if no such type or no data
   *                  are specified.
   */
  wdat.modelData = function(type) {
    var tmpl = wdat.modelTemplate(type);
    if (tmpl && tmpl.data) {
      return tmpl.data;
    }
  };

  /**
   * Get all defined parents for a specific type described in WDAT.model
   *
   * @param type {string}   The type of a data object.
   *
   * @return {Object} An object with all defined parents or 'undefined' if no such type or no
   *                  parents are specified.
   */
  wdat.modelParents = function(type) {
    var tmpl = wdat.modelTemplate(type);
    if (tmpl && tmpl.parents) {
      return tmpl.parents;
    }
  };

  /**
   * Get all defined children for a specific type described in WDAT.model
   *
   * @param type {string}   The type of a data object.
   *
   * @return {Object} Object with all defined children or 'undefined' if no such type or no children
   *                  are specified.
   */
  wdat.modelChildren = function(type) {
    var tmpl = wdat.modelTemplate(type);
    if (tmpl && tmpl.children) {
      return tmpl.children;
    }
  };

  /**
   * Determine by its type if a data object is plotable, using the definitions
   * in WDAT.model.
   *
   * @param type {string}     The type of a data object e.g. section, segment or analogsignal
   *
   * @return {Boolean} True if the object is plotable, false otherwise
   */
  wdat.isPlotable = function(type) {
    var t = type.toString().toLowerCase();
    return wdat.model.ephys.plotable.hasOwnProperty(t);
  };

  /**
   * Crates a new object from a certain type with all the defaults set.
   *
   * @param type {string}     The type of a data object e.g. section, segment or analogsignal
   *
   * @return {Object} A new object from a certain type, or indefined if no such type was found.
   */
  wdat.modelCreate = function(type) {
    var val, obj = {}, tmpl = wdat.modelTemplate(type);
    if (tmpl) {
      if (tmpl.fields) {
        obj.fields = {};
        for (var i in tmpl.fields) {
          val = tmpl.fields[i].value;
          if (val === undefined) val = null;
          if (i == 'name')
            obj.name = val;
          else
            obj.fields[i] = val;
        }
      }
      obj.parents = {};
      for (var i in tmpl.parents) {
        obj.parents[i] = null;
      }
      obj.children = {};
      for (var i in tmpl.children) {
        obj.children[i] = [];
      }
      return obj;
    }
  };


  // local var for types
  var _types;

  /**
   * Returns an array containing all ephys type names.
   *
   * @return {Array} All type names of ephys data types.
   */
  wdat.ephysTypes = function() {
    if (!_types) {
      _types = [];
      for (var i in wdat.model.ephys.container) {
        _types.push(i);
      }
      for (var i in wdat.model.ephys.plotable) {
        _types.push(i);
      }
    }
    return _types;
  };


})(wdat || (wdat = {}), jQuery);

