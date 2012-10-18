// ---------- file: resource_adapter.js ---------- //

// Initialize modules
if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};
if (!WDAT.api.data) WDAT.api.data = {};

/* Dummy resource adapter.
 */
WDAT.api.data.ResourceAdapter = function(resource, adapter, bus) {
  // nothing to be done here
};

// define methods of ResourceAdapter
(function(){
  
  /* Dummy get method.
   */
  WDAT.api.data.ResourceAdapter.prototype.get = function(data) {
    return data;
  };

}());