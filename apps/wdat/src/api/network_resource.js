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

// create anonymous name space
(function(){

  //-------------------------------------------------------------------------------------
  // Class: NetworkResource
  //-------------------------------------------------------------------------------------

  /* Constructor of the class NetworkResource. NetworkResource provides methods to
   * access a web resource, in this case the G-Node RESTfull API.
   *
   * Parameter:
   *    None
   *
   * Depends on:
   *    Nothing
   */
  WDAT.api.NetworkResource = NetworkResource;
  function NetworkResource() {
    this._xhr = new XMLHttpRequest();
  };

  /* Get data from the G-Node RESTfull API by search specifiers. See DataAPI.get() for
   * further explanation.
   *
   * Parameter:
   *  - specifier: Obj.     An object containing multiple search specifier.
   *
   * Return value:
   *    The requested data as a JSON string as specified by the G-Node RESTfull API.
   */
  NetworkResource.prototype.get = function(specifier) {
    var url = this._specToURL(specifier);
    return this.getByURL(url);
  };

  /* Get data from the G-Node RESTfull API by URL.
   *
   * Parameter:
   *  - url: String         The URL to request from the API.
   *
   * Return value:
   *    The requested data as a JSON string as specified by the G-Node RESTfull API.
   */
  NetworkResource.prototype.getByURL = function(url) {
    var result = {url: url};
    // This is a synchronous call.
    this._xhr.open('GET', url, false);
    this._xhr.send();

    if (this._xhr.status === 200) {
      result.status = 200;
      result.response = this._xhr.responseText;
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error during request: (" + this._xhr.status + ")";
    }
    return result;
  };
  
  /* Creates or updates an object on the G-Node RESTfull API.
   *
   * Parameter:
   *  - url: String      The url to an object or to the object type. The URL determines
   *                     if the operation is an update or create operation.
   *
   *  - data: Obj        The object data. See G-Node API documentaion for further information.
   *
   * Return value:
   *    The changed object.
   */
  NetworkResource.prototype.setByURL = function(url, data) {
    var result = {url: url};
    // Synchronous call to the data api
    this._xhr.open('POST', url, false);
    this._xhr.send(JSON.stringify(data));

    if (this._xhr.status === 200 || this._xhr.status === 201) {
      result.status = this._xhr.status;
      result.response = this._xhr.responseText;
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error while updating: (" + this._xhr.status + ")";
    }
    return result;
  };
  
  /* Deletes one single object.
   *
   * Parameter:
   *  - url: String       The url to the object to delete.
   *
   * Return value:
   *    Resonse object with success or error message.
   */
  NetworkResource.prototype.delByURL = function(url) {
    var result = {url: url};
    // Synchronous call to the data api
    this._xhr.open('DELETE', url, false);
    this._xhr.send();

    if (this._xhr.status === 200) {
      result.status = 200;
      var msg = JSON.parse(this._xhr.responseText);
      result.response = msg.message;
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error while deleting: (" + this._xhr.status + ")";
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
      var split = spec.id.toString().split('/');
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
        if (i !== 'type' && i !== 'category') {
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
    // local function that converts an operator to its equivalent in the URL
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
        var split = value.toString().split('/');
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
            i = template.parents[i];
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

  /* Constuctor of the class ResourceAdapter. The Resource adapter is needed in order to
   * convert data from the G-Node RESTfull API specific format into a format used by
   * the application and vice versa.
   *
   * Parameter:
   *    None
   *
   * Depends on:
   *    Nothing
   */
  WDAT.api.ResourceAdapter = ResourceAdapter;
  function ResourceAdapter() {
    // nothing to do
  };

  /* Converts data from NetworkResource into a format that can easily be used
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

  /* Adapts objects used inside the application to an object that can be used by the data
   * api. The resule is an object with two fields 'url' contains a url for the update/create
   * request and 'data' holds an object for the request body.
   *
   * Parameter:
   *  - data: Obj         The data object to adapt.
   *
   * Return value:
   *    Object with url and request data
   */
  ResourceAdapter.prototype.adaptUpdate = function(data) {
    var adapted = {}, url, type, cat, id = '';
    // prepare url
    if (data.type && _getCategory(data.type)) {
      type = data.type;
      cat = _getCategory(data.type);
    }
    if (data.id) {
      var tmp = data.id.split('/')
      if (tmp.length == 1) {
        id = data.id;
      } else if (tmp.length == 3) {
        id = tmp[2];
        if (!type && !cat) {
          cat = tmp[0];
          type = tmp[1];
        }
      } else {
        throw new Error('data has an invalid id: ' + id);
      }
    }
    url = [cat, type, id].join('/');
    if (url[0] !== '/')
      url = '/' + url;
    // adapt data
    objMerge(data, adapted, true, ['id', 'type', 'category', 'plotable','date_created', 
        'owner', 'safety_level', 'name', 'fields', 'parents', 'data', 'children']);
    if (type === 'value')
      adapted.value = data.name;
    else
      adapted.name  = data.name;
    adapted.safety_level = data.safety_level || 'private';
    switch (adapted.safety_level) {
      case 'public':
        adapted.safety_level = 1;
        break;
      case 'friendly':
        adapted.safety_level = 2;
        break;
      default:
        adapted.safety_level = 3;
        break;
    }
    // merge fields and data into adapted
    adapted = objMerge(data.fields, adapted);
    adapted = objMerge(data.data, adapted);
    // merge parents 
    for (i in data.parents) {
      if (data.parents.hasOwnProperty(i)) {
        var tmp = data.parents[i].split('/');
        adapted[i] = tmp[tmp.length - 1];
      }
    }
    return {'data': adapted, 'url': url};
  };

  /* Extracts only the path part of a URL.
   * For internal use only.
   *
   * Parameter:
   *  - url: String       The URL to strip
   *
   * Return value:
   *  - The path part of the URL without leading '/'
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
  };

  //-------------------------------------------------------------------------------------
  // Helper functions and objects
  // For internal use only
  //-------------------------------------------------------------------------------------

  /* Find the matching category for specific type using _DATA_OBJECTS.
   *
   * Parameter:
   *  - type: String      The type of a data object e.g. section, segment or analogsignal
   *
   * Return value:
   *    The corresponding category e.g. metadata or electrophysiology
   */
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

  /* Get the matching template for a specific type defined in _DATA_OBJECTS.
   *
   * Parameter:
   *  - type: String      The type of a data object e.g. section, segment or analogsignal
   *
   * Return value:
   *    The corresponding template object defined in _DATA_OBJECTS.
   */
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

  /* Determine by its type if a data object is plotable, using the definitions
   * in _DATA_OBJECTS.
   *
   * Parameter:
   *  - type: String      The type of a data object e.g. section, segment or analogsignal
   *
   * Return value:
   *    true if the object is plotable, false otherwise
   */
  function _isPlotable(type) {
    return _DATA_OBJECTS.data.plotable.hasOwnProperty(type);
  }

  /* Specification of all objects managed by the G-Node RESTfull API
   */
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
  // NetworkResource.DATA_OBJECTS = _DATA_OBJECTS;
  // ResourceAdapter.DATA_OBJECTS = _DATA_OBJECTS;
}());


