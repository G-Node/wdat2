// ---------- file: mod/model_tools.js ---------- //


// Add helper and tool functions for models to the module 'wdat.mod'.
// Import: wdat.mod as mod and jQuery as $
var wdat; (function(wdat, mod, $) {
  "use strict";

  /**
   * Find the matching category for specific type using WDAT.model.
   *
   * @param type {string}   The type of a data object e.g. section, segment or analogsignal
   *
   * @return {string} The corresponding category e.g. metadata or electrophysiology
   */
  mod.category = function(type) {
    var t = type.toString().toLowerCase();
    if (mod.def.metadata.hasOwnProperty(t))
      return 'metadata';
    else if (mod.def.ephys.container.hasOwnProperty(t))
      return 'electrophysiology';
    else if (mod.def.ephys.plotable.hasOwnProperty(t))
      return 'electrophysiology';
  };

  // just a local var that serves as a chache.
  var _templateCache = {};

  /**
   * Get the matching template for a specific type defined in WDAT.model.
   *
   * @param type {string}   The type of a data object e.g. section, segment or analogsignal
   *
   * @return {Object} The corresponding template object defined in wdat.mod.def or undefined if
   *                  no such type is specified.
   */
  mod.template = function(type) {
    if (type) {
      var t = type.toString().toLowerCase();
      // try to get template from cache
      if (!_templateCache[t]) {
        var tmpl, merged = {};
        // create template
        if (mod.def.metadata.hasOwnProperty(t))
          tmpl = mod.def.metadata[t];
        else if (mod.def.ephys.container.hasOwnProperty(t))
          tmpl = mod.def.ephys.container[t];
        else if (mod.def.ephys.plotable.hasOwnProperty(t))
          tmpl = mod.def.ephys.plotable[t];

        // merge with all
        if (tmpl) {
          $.extend(true, merged, tmpl);
          $.extend(true, merged, all);
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
  mod.fields = function(type) {
    var tmpl = mod.template(type);
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
  mod.data = function(type) {
    var tmpl = mod.template(type);
    if (tmpl && tmpl.data) {
      return tmpl.data;
    }
  };

})(wdat || (wdat = {}), wdat.mod || (wdat.mod = {}), jQuery);

