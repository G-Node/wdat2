// ---------- file: network_resource.js ---------- //

/* WARNING!
 * This code section is tricky because this code may run inside the worker context
 * or if workers arn't available inside the normal window context of the application.
 * 
 * The worker context has some functions like importScripts() thar are not available in
 * the window context. So don't use them or you will break the code on systems without
 * workers.
 * On the other hand the worker context lacks several features that are available in the
 * window context. This is basically everything that is beyond the core JavaScript global
 * object especially everything that is related to the document and the dom tree. Thats the
 * reason why it's not possible to use jQuery inside this code. Even if it is part of the 
 * core JavaScript global object the console object is also missing in the worker context. 
 * 
 * But basically everything that is needed for AJAX calls and data handling like JSON, 
 * XMLHtpRequest, TypedArrays and so on can be used here. 
 */

// Initialize modules
if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};
if (!WDAT.api.data) WDAT.api.data = {};

WDAT.api.data.GNodeNetworkResource = function() {
  this.XHR = new XMLHttpRequest();
};

// define methods of NetworkResource
(function(){
  var proto = WDAT.api.data.GNodeNetworkResource.prototype;

  /* Async method.  Isn't expected to return any value.  Just call the callback
   * function with the response code as the first argument and the response
   * text as the second.
   */
  proto.get = function(url, callback) {
    if ( typeof(url) !== 'string' ) {
      throw ("WDAT.api.data.NetworkResource.get() expects a string as an URL.");
    }
    if (!callback) {
      throw ("WDAT.api.data.NetworkResource.get() expects a callback as the second arg.");
    }

    // XXX request the object.
    callback( '200', '{"asdf":"Jklk"}' );
  };

}());
