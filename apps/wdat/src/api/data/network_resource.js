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

// create anonymous namespace
(function(){

  //-------------------------------------------------------------------------------------
  // Class: NetworkResource
  //-------------------------------------------------------------------------------------

  WDAT.api.NetworkResource = NetworkResource;
  function NetworkResource() {
    this._xhr = new XMLHttpRequest();
  };

  /* Get data based on a specifier. */
  NetworkResource.prototype.get = function(specifier) {
    var url = this._specToURL(specifier);
    return this.getByURL(url);
  };

  /* Get data based on an URL. */
  NetworkResource.prototype.getByURL = function(url) {
    var result = {};
    result.url = url;
    // This is a synchronous call.
    this._xhr.open('GET', url, false);
    this._xhr.send();

    if (this._xhr.status === 200) {
      result.status = this._xhr.status;
      result.response = this._xhr.responseText;
    } else {
      result.status = this._xhr.status;
      result.error = true;
      result.response = 'Request failed (' + this._xhr.status + ')';
    }
    return result;
  };
  
  /* Creates a URL from a set of given search specifiers. See NetworkResource.get()
   * for further explanation. This function is for internal use only.
   * 
   * Parameter:
   *  - spec: Obj         A set of search specifiers
   *  
   * Return value:
   *    A URL that performs a search as defined by the specifiers.
   */
  NetworkResource.prototype._specToURL = function(spec) {
    var url;
    if (spec.id || spec.permalink) {
      // if id or permalink is specified all other parameters besides type and category 
      // are ignored
      if (spec.permalink) spec.id = spec.permalink;
      // split id
      var split = spec.id.toString().split('?')[0].split('/');
      // remove empty strings from split 
      var tmp = []
      for (var i in split) {
        if (split[i] && split[i] != "") tmp.push(split[i]);
      }
      split = tmp;
      if (split.length === 3) {
        spec.category = split[0];
        spec.type = split[1];
        spec.id = split[2];
      }
      if (!spec.category) {
        spec.category = _getCategory(spec.type);
      }
      url = '/' + spec.category + '/' + spec.type + '/' + spec.id + '?q=full';
    } else { 
      // if no id or permalink is specified additional parameters are evaluated
      if (!spec.category) {
        spec.category = _getCategory(spec.type);
      }
      // TODO maybe handle errors when category and type are unset
      url = '/' + spec.category + '/' + spec.type + '/?q=full&'
      for (var i in spec) {
        if (spec.hasOwnProperty(i) && i !== 'type' && i !== 'category' && i !== 'id') {
          url += this._specToComp(spec.type, i, spec[i], '='); // TODO other operators
        }
      }
    }
    return 'http://' + location.hostname + ':' + location.port + url;
  }
  
  /* Creates a string representing a component of a URI query string from a key, 
   * a value and an operator (optional). This is for internal use only.
   * 
   * Example:
   *   'name', 'foo' --> name__icontains=foo&
   * 
   * Parameter:
   *  - type: String        The type to search for
   *  - key: String         The key of the search specifier
   *  - value: Sting, Num   The value of the search specifier
   *  - op: String          The operator e.g. '=', '>', '<' (optional)
   *  
   * Return value:
   *    A Sting representing a query component
   */
  NetworkResource.prototype._specToComp = function(type, key, value, op) {
    var result = '';
    var template = _getTemplate(type);
    // Lambda that converts an operator to its equivalent in the URL
    var opToString = function(operator) {
      switch (operator) {
        case '>':
          operator =  '__gt=';
          break;
        case '<':
          operator = '__le=';
          break;
        default:
          operator = '__icontains=';
          break;
      }
      return operator;
    };
    // handle different types of key specifiers
    switch (key) {
      case 'category':  // ignore key category
        break;
      case 'type':      // ignore key type
        break;
      case 'parent':  // search for objects with specific parent
        var split = value.toString().split('?')[0].split('/');
        // remove empty strings from split 
        var tmp = []
        for (var i in split) {
          if (split[i] && split[i] != "") tmp.push(split[i]);
        }
        split = tmp;
        if (split.length === 3) {
          var parent_type = split[1];
          var parent_id = split[2];
          var parent_name;
          for (var i in template.parents) {
            if (i.match(parent_type)) {
              parent_name = i;
              break;
            }
          }
          result = encodeURIComponent(parent_name) + '=' + encodeURIComponent(parent_id) + '&';
        } else {
          result = '';
          if (!value || vlaue == "") {
            for (var i in template.parents) {
              result += encodeURIComponent(template.parents[i]) + '__isnull=1&';
            }
          }
        }
        break;
      default:
        op = opToString(op)
        if (value && value != "")
          result = encodeURIComponent(key) + op + encodeURIComponent(value) + '&';
        else
          result = encodeURIComponent(key) + '__isnull=1&'
        break;
    }
    return result;
  }
  
  //-------------------------------------------------------------------------------------
  // Class: ResourceAdapter
  //-------------------------------------------------------------------------------------

  /* Constuctor of the resource adapter
   */
  WDAT.api.ResourceAdapter = ResourceAdapter;
  function ResourceAdapter() {
    // nothing to do
  };

  /* Converts data from GNodeNetworkResource into a format that can easily be used 
   * inside the wdat application. The result is always an array of objects. Each object 
   * has the following form.
   * 
   * { 
   *   id: <id>,                // path part of the permalink
   *   type: <type>,            // e.g. segment, block, section etc.
   *   category: <cat>,         // data or metadata
   *   name: <name>,
   *   date_created: <date>,
   *   owner: <str>,            // id of the owner profile
   *   safety_level: <level>,   // public, friendly or private
   *   fields: {},              // other object specific attributes 
   *   children: {},            // all child objects as a list of ids
   *   parents: {},             // all parent objects as a list of ids
   *   data: {},                // data as { unit: <unit>, data: <data> }
   * }
   * 
   * Parameter:
   *  - data: Obj, String       A response object as specified in the 
   *                            Documentation of the RESTfull api
   * Return value
   *    An array of converted objects
   */
  ResourceAdapter.prototype.adapt = function(data) {
    var adapted_data = [];
    if (typeof data  === 'string') data = JSON.parse(data);
    // iterate over results
    for (var index in data.selected) {
      var element = data.selected[index];
      // the adapted result
      var adapted = {}
      // adapt general data
      var tmp = this._stripURL(element.permalink).split('/');
      adapted.id = tmp.join('/');
      adapted.type = tmp[1];
      adapted.category = _getCategory(adapted.type);
      adapted.plotable = _isPlotable(adapted.type);
      adapted.date_created = element.fields.date_created;
      adapted.owner = this._stripURL(element.fields.owner);
      switch (element.fields.safety_level) {
        case 1:
          adapted.safety_level = 'public'
          break;
        case 2:
          adapted.safety_level = 'friendly'
          break;
        default:
          adapted.safety_level = 'private'
          break;
      }
      // set template
      var template = _getTemplate(adapted.type);
      if (template) {
        // adapt fields
        adapted.fields = {}
        for (var f in template.fields) {
          f = template.fields[f];
          if (f === 'name' || (f === 'data' && adapted.type === 'value')) {
            adapted.name = element.fields[f];
          } else {
            adapted.fields[f] = element.fields[f];
          }
        }
        // adapt children
        adapted.children = {};
        for (var c in template.children) {
          c = template.children[c];
          if (element.fields[c] && element.fields[c].length > 0) {
            adapted.children[c] = [];
            for (var i in element.fields[c]) {
              adapted.children[c][i] = this._stripURL(element.fields[c][i]);
            }
          }
        }
        // adapt parents
        adapted.parents = {};
        for (var p in template.parents) {
          p = template.parents[p];
          if (element.fields[p]) {
            adapted.parents[p] = this._stripURL(element.fields[p]);
          }
        }
        // adapt data
        adapted.data = {}
        for (var d in template.data) {
          d = template.data[d];
          if (element.fields[d]) {
            adapted.data[d] = element.fields[d];
            if (adapted.data[d].data && typeof adapted.data[d].data === 'string')
              adapted.data[d].data = this._stripURL(adapted.data[d].data);
          }
        }
      }
      adapted_data.push(adapted);
    }
    return adapted_data;
  };
  
  /* Extracts only the path part of a url.
   * For internal use only.
   * 
   * Parameter:
   *  - url: String       The url to strip
   *  
   * Return value:
   *  - The path part of the url without leading '/'
   */
  ResourceAdapter.prototype._stripURL = function(url) {
    var tmp = url.split('://');
    // remove protocol host and port if present
    if (tmp.length > 1) {
      tmp = tmp.slice(1, tmp.length).join('');
      tmp = tmp.split('/');
      tmp = tmp.slice(1, tmp.length).join('/');
    } else {
      tmp = tmp.join('');
    }
    // remove parameter
    return tmp.split('?')[0];
  }

  //-------------------------------------------------------------------------------------
  // Helper functions and objects
  //-------------------------------------------------------------------------------------


  function _getCategory(type) {
    if (_DATA_OBJECTS.metadata.hasOwnProperty(type))
      return 'metadata';
    else if (_DATA_OBJECTS.data.container.hasOwnProperty(type))
      return 'electrophysiology';
    else if (_DATA_OBJECTS.data.plotable.hasOwnProperty(type))
      return 'electrophysiology';
    else
      return null;
  }

  function _getTemplate(type) {
    if (_DATA_OBJECTS.metadata.hasOwnProperty(type))
      return _DATA_OBJECTS.metadata[type];
    else if (_DATA_OBJECTS.data.container.hasOwnProperty(type))
      return _DATA_OBJECTS.data.container[type];
    else if (_DATA_OBJECTS.data.plotable.hasOwnProperty(type))
      return _DATA_OBJECTS.data.plotable[type];
    else
      return null;
  }

  function _isPlotable(type) {
    return _DATA_OBJECTS.data.plotable.hasOwnProperty(type);
  }

  _DATA_OBJECTS = {
    metadata : {
      section : {
        fields : ['name', 'description', 'odml_type', 'tree_position'],
        children : ['property_set', 'block_set', 'datafile_set', 'section_set'],
        parents : ['parent_section']},
      property : {
        fields : ['name', 'definition', 'dependency', 'dependency_value', 'mapping',
                'unit', 'dtype', 'uncertainty', 'comment'], 
        children : ['value_set'],
        parents : ['section']},
      value : {
        fields : ['data'], 
        children : [], 
        parents : ['parent_property']}},
    data : {
      container : {
        block : {
          fields : ['name', 'index', 'description', 'file_origin', 'filedatetime',
                  'recdatetime'],
          children : ['segment_set', 'recordingchannelgroup_set'], 
          parents : ['']},
        segment : {
          fields : ['name', 'index', 'description', 'file_origin', 'filedatetime',
                  'recdatetime'],
          children : ['analogsignal_set', 'irsaanalogsignal_set',
                  'analogsignalarray_set', 'spiketrain_set', 'spike_set', 'event_set',
                  'eventarray_set', 'epoch_set', 'epocharray_set'], 
          parents : ['block']},
        /* move to plotable ? */
        eventarray : {
          fields : ['name', 'labels', 'description', 'file_origin'],
          data : ['times'], 
          children : ['event_set'], 
          parents : ['segment']},
        /* move to plotable ? */
        epocharray : {
          fields : ['name', 'labels', 'description', 'file_origin'],
          data : ['times', 'durations'], 
          children : ['epoch_set'], 
          parents : ['segment']},
        /* move to plotable ? */
        analogsignalarray : {
          fields : ['name', 'description', 'file_origin'],
          data : ['analogsignal_set', 'sampling_rate', 't_start'],
          children : ['analogsignal_set'], 
          parents : ['segment']},
        unit : {
          fields : ['name', 'description', 'file_origin'],
          children : ['spiketrain_set', 'spike_set'], 
          parents : ['recordingchannel']},
        recordingchannel : {
          fields : ['name', 'description', 'file_origin', 'coordinate', 'index'],
          children : ['unit_set', 'analogsignal_set', 'irsaanalogsignal_set'],
          parents : ['recordingchannelgroup']},
        recordingchannelgroup : {
          fields : ['name', 'description', 'file_origin', 'channel_names',
                  'channel_indexes'],
          children : ['recordingchannel_set', 'analogsignalarray_set'],
          parents : ['block']}},
      plotable : {
        spike : {
          fields : ['name', 'description', 'file_origin'],
          data : ['time', 'waveform', 'sampling_rate', 'left_sweep'], 
          children : [],
          parents : ['segment', 'unit']},
        spiketrain : {
          fields : ['name', 'description', 'file_origin'],
          data : ['times', 'waveforms', 'sampling_rate', 't_start', 't_stop',
                  'left_sweep'], 
          children : [], 
          parents : ['segment', 'unit']},
        event : {
          fields : ['name', 'description', 'file_origin', 'label'],
          data : ['time'], 
          children : [], 
          parents : ['segment', 'eventarray']},
        epoch : {
          fields : ['name', 'description', 'file_origin', 'label'],
          data : ['duration', 'time'], 
          children : [], 
          parents : ['segment', 'epocharray']},
        analogsignal : {
          fields : ['name', 'description', 'file_origin'],
          data : ['signal', 'sampling_rate', 't_start'], 
          children : [],
          parents : ['segment', 'analogsignalarray', 'recordingchannel']},
        irsaanalogsigal : {
          fields : ['name', 'description', 'file_origin'],
          data : ['times', 'samples'], 
          children : [], 
          parents : ['segment']
        }
      }
    }
  }; // end of _DATA_OBJECTS
  NetworkResource.DATA_OBJECTS = _DATA_OBJECTS;
  ResourceAdapter.DATA_OBJECTS = _DATA_OBJECTS;
}());
