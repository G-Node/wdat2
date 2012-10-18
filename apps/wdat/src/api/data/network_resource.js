// ---------- file: network_resource.js ---------- //

// Initialize modules
if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};
if (!WDAT.api.data) WDAT.api.data = {};

/* Dummy network resource.
 */
WDAT.api.data.NetworkResource = function(resource, adapter, bus) {
  // nothing to be done here
};

// define methods of NetworkResource
(function(){
  
  /* Dummy get method.
   */
  WDAT.api.data.NetworkResource.prototype.get = function(type, searchparam) {
    return "Cool NetworkResource data.";
  };

}());