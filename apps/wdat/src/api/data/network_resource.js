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

//define methods of NetworkResource
(function() {

  
  
  WDAT.api.data.GNodeNetworkResource = function() {
    this.XHR = new XMLHttpRequest();
  };

  var proto = WDAT.api.data.GNodeNetworkResource.prototype
  // Define NEO types
  , metadata_types = ['section', 'property', 'value'], plotdata_types = ['analogsignal',
          'irsaanalogsignal', 'spike', 'spiketrain', 'event', 'epoch'], container_types = [
          'block', 'segment', 'eventarray', 'epocharray', 'analogsignalarray', 'unit',
          'recordingchannel', 'recordingchannelgroup']
  // A set of all types
  , all_types = metadata_types.concat(plotdata_types, container_types), mapping = {
    'property' : 'properties', 'section' : 'sections', 'value' : 'values'};

  /* Builds a query string of a javscript object.  Works non-recursively and
   * only on string type objects. */
  var serializeToQueryString = function(dictionary) {
    var str = [];

    for ( var p in dictionary) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(dictionary[p]));
    }
    return str.join("&");
  };

  /* Removes the object, type and parent attributes from a specifer and return
   * the result.
   */
  var clean = function(specifier) {
    var rtn = {}, filter_re = /(object|parent|type)/;

    for (name in specifier) {
      if (!filter_re.test(name)) {
        rtn[name] = specifier[name];
      }
    }

    return rtn;
  };

  /* This is the workhorse function in the data-api.  Would it make more sense
   * to push this to the woker thread?
   *
   * Parse a specifier object and return a specifier object with a URL built
   * up.  A URL is all that is, infact required to make a request.  There is no
   * POST data.
   */
  proto.parseSpecifier = function(specifier) {
    // Use window.location to create general URL skeleton
    var loc = location, url = loc.protocol + '//' + loc.host + '/electrophysiology/';

    // First, complete the specifier: with explicit inferred attributes
    if (!specifier.hasOwnProperty('type')) {
      // Well, the type attribute is necessary
      if (specifier.hasOwnProperty('object')) {
        // Infer type from object string
        var splits = specifier.object.split('_');

        if (splits.length > 1) {
          specifier.type = splits[0];
        }
      }
    }

    // Handle url generation for object requests
    if (specifier.hasOwnProperty('object')) {
      if (plotdata_types.indexOf(specifier.type) > -1) {
        // Plottable object requests.  These are the only ones that need to be
        // handled for object requests.
        var id = specifier.object.split('_')[1], query_string = serializeToQueryString(clean(specifier));

        // Also respect the id of the object being requested
        url += specifier.type + '/' + id + '?' + query_string;

        return url;
      }
    }

    // Handle url generation for children requests
    if (specifier.type === 'children') {
      var parent_type = specifier.parent.split('_')[0];

      if (container_types.indexOf(parent_type) > -1) {
        // A list of all container children has been requested.
        // TODO.  Discuss and figure out.
      }
    }

    return 'mock-url';
  };

  /* Get data based on a specifier. */
  proto.get = function(specifier) {
    var url = this.parseSpecifier(specifier);

    return this.getByURL(url);
  };

  /* Get data based on an URL. */
  proto.getByURL = function(url) {
    // Note, this is an async call.
    this.XHR.open('GET', url, false);
    this.XHR.send();

    if (this.XHR.status === 200) {
      return {'status_code' : this.XHR.status, 'response_text' : this.XHR.responseText}
    } else {
      // XXX Handle errors and 302 Not Modified s
    }
  };
}());
