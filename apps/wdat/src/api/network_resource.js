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
  "use strict";

  //-------------------------------------------------------------------------------------
  // Class: NetworkResource
  //-------------------------------------------------------------------------------------

  /**
   * Constructor of the class NetworkResource. NetworkResource provides methods to
   * access a web resource, in this case the G-Node RESTfull API.
   *
   * FIXME results in object by id and not as array
   */
  WDAT.NetworkResource = NetworkResource;
  function NetworkResource() {
    this._xhr = new XMLHttpRequest();
  }

  /**
   * Get data from the G-Node RESTfull API by search specifiers. See DataAPI.get() for
   * further explanation.
   *
   * @param specifier (Obj)   An object containing multiple search specifier.
   *
   * @return The requested data as a JSON string as specified by the G-Node RESTfull API.
   *
   * TODO handle 'OR' specifiers
   */
  NetworkResource.prototype.get = function(specifier) {
    var depth;
    if (specifier instanceof Array && specifier.length > 0) {
      var partialResults = [];
      for (var i in specifier) {
        if (specifier[i].hasOwnProperty('depth')) {
          if (specifier[i].depth) {
            depth = parseInt(specifier[i].depth);
          }
          delete specifier[i].depth;
        }
      }
      for (var i in specifier) {
        var part = this._getSingle(specifier[i], depth);
        if (part.error) {
          partialResults = [part];
          break;
        }
        partialResults.push(part);
      }
      var result = partialResults.pop();
      if (!result.error) {
        for (var i in partialResults) {
          var part = partialResults[i];
          result.response.selected = result.response.selected.concat(part.response.selected);
        }
      }
      return result;
    } else if (typeof specifier == 'object') {
      if (specifier.hasOwnProperty('depth')) {
        if (specifier.depth) {
          depth = parseInt(specifier.depth);
        }
        delete specifier.depth;
      }
      return this._getSingle(specifier, depth);
    }
  };

  /**
   * Get data from the G-Node RESTfull API by URL.
   *
   * @param url (String)    The URL to request from the API.
   *
   * @return The requested data as a JSON string as specified by the G-Node RESTfull API.
   */
  NetworkResource.prototype.getByURL = function(url) {
    var result = {url: url};
    // This is a synchronous call.
    this._xhr.open('GET', url, false);
    this._xhr.send();

    if (this._xhr.status == 200) {
      result.status = 200;
      result.response = JSON.parse(this._xhr.responseText);
    } else if (this._xhr.status == 500) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Internal server error (500)";
    } else if (this._xhr.status == 404) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Not found (404)";
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error during request: (" + this._xhr.status + ")";
    }
    return result;
  };

  /**
   * Creates or updates an object on the G-Node RESTfull API.
   *
   * @param url (String)    The url to an object or to the object type. The URL determines
   *                        if the operation is an update or create operation.
   * @param data (Obj)      The object data. See G-Node API documentaion for further information.
   *
   * @return The changed object.
   */
  NetworkResource.prototype.setByURL = function(url, data) {
    var result = {url: url};
    // Synchronous call to the data api
    this._xhr.open('POST', url, false);
    this._xhr.send(JSON.stringify(data));

    if (this._xhr.status === 200 || this._xhr.status === 201) {
      result.status = this._xhr.status;
      result.response = JSON.parse(this._xhr.responseText);
    } else if (this._xhr.status == 500) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Internal server error (500)";
    } else if (this._xhr.status == 404) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Not found (404)";
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error during request: (" + this._xhr.status + ")";
    }
    return result;
  };

  /**
   * Deletes one single object.
   *
   * @param url (String)  The url to the object to delete.
   *
   * @return Response object with success or error message.
   */
  NetworkResource.prototype.delByURL = function(url) {
    var readyUrl = url;
    if (!strStartsWith(url, 'http://') && !strStartsWith(url, '/')) {
      readyUrl = '/' + url;
    }
    var result = {url: readyUrl};
    // Synchronous call to the data api
    this._xhr.open('DELETE', readyUrl, false);
    this._xhr.send();

    if (this._xhr.status === 200) {
      result.status = 200;
      var msg = JSON.parse(this._xhr.responseText);
      result.response = msg.message;
    } else if (this._xhr.status == 500) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Internal server error (500)";
    } else if (this._xhr.status == 404) {
      result.status = this._xhr.status;
      result.error = true;
      result.response = "Not found (404)";
    } else {
      result.status = this._xhr.status;
      result.error = true;
      var errmsg = JSON.parse(this._xhr.responseText);
      result.response = errmsg.details || errmsg.message || "Error during request: (" + this._xhr.status + ")";
    }
    return result;
  };

  /**
   * Get data from the G-Node RESTfull API using one single set of search specifiers.
   *
   * @param specifier (Obj)   An object containing multiple search specifier.
   * @param depth (Number)    The depth of the search to perform.
   *
   * @return The requested data as a JSON string as specified by the G-Node RESTfull API.
   */
  NetworkResource.prototype._getSingle = function(specifier, depth) {
    var result = null;
    if (depth) {
      var d  = (depth > 2) ? 2 : depth;
      // do first request
      var url = this._specToURL(specifier);
      result = this.getByURL(url);
      if (!result.error) {
        // parse response
        var response = result.response;
        var subrequest_error = undefined;
        var other_responses = [];
        var stack = [];             // stack with elements to process
        for (var i in response.selected) {
          stack.push({data: response.selected[i], depth: 0});
        }
        while(stack.length > 0 && !subrequest_error) {
          var elem = stack.pop();
          if (elem.depth < d) {
            var type = elem.data.model.split('.');
            type = type[type.length - 1];
            var childfields = modChildren(type);
            var id = _stripURL(elem.data.permalink);
            for (var i in childfields) {
              var field = childfields[i];
              if (field.type && elem.data.fields[i].length > 0) {
                var tmp = this.get({type: field.type, parent: id});
                if (!tmp.error) {
                  var children = tmp.response;
                  other_responses.push(children);
                  for (var j in children.selected) {
                    if (elem.depth + 1 < d) {
                      stack.push({data: children.selected[j], depth: elem.depth + 1});
                    }
                  }
                } else {
                  subrequest_error = tmp.response;
                  break;
                }
              }
            }
          }
        }
        // collect results
        if (!subrequest_error) {
          for (var i in other_responses) {
            var resp = other_responses[i];
            response.selected = response.selected.concat(resp.selected);
          }
          result.response = response;
        } else {
          // TODO more generous error handling??
          result.response = subrequest_error;
          result.error = true;
        }
        //console.log(JSON.stringify(response, null, 4));
      }
    } else {
      var url = this._specToURL(specifier);
      result = this.getByURL(url);
    }
    return result;
  };

  /**
   * Creates a URL from a set of given search specifiers. See NetworkResource.get()
   * for further explanation. This function is for internal use only.
   *
   * @param spec (Obj)     A set of search specifiers
   *
   * @return A URL that performs a search as defined by the specifiers.
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
      var tmp = [];
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
        spec.category = modCategory(spec.type);
      }
      url = '/' + spec.category + '/' + spec.type + '/' + spec.id + '?q=full';
    } else {
      // if no id or permalink is specified additional parameters are evaluated
      if (!spec.category) {
        spec.category = modCategory(spec.type);
      }
      // TODO maybe handle errors when category and type are unset
      url = '/' + spec.category + '/' + spec.type + '/?q=full&';
      for (var i in spec) {
        if (i !== 'type' && i !== 'category') {
          var key = i;
          var val, op;
          if (spec[i] instanceof Array) {
            if (spec[i].length > 1) {
              val = spec[i][0];
              op  = spec[i][1];
            } else if (spec[i].length = 1) {
              val = spec[i][0];
              op  = '=';
            } else {
              val = '';
              op  = '=';
            }
          } else {
            val = spec[i];
            op  = '=';
          }
          url += this._specToComp(spec.type, key, val, op); // TODO other operators
        }
      }
    }
    return 'http://' + location.hostname + ':' + location.port + url;
  };

  /**
   * Creates a string representing a component of a URI query string from a key,
   * a value and an operator (optional). This is for internal use only.
   *
   *  Example:
   *   'name', 'foo' ==> name__icontains=foo&
   *
   * @param type (String)         The type to search for
   * @param key (String)          The key of the search specifier
   * @param value (String, Num)   The value of the search specifier
   * @param operator (String)     The operator e.g. '=', '>', '<' (optional)
   *
   * @return A String representing a query component
   */
  NetworkResource.prototype._specToComp = function(type, key, value, operator) {
    var result = '';
    var template = modTemplate(type);
    // local function that converts an operator to its equivalent in the URL
    var opToString = function(op) {
      switch (op) {
        case '>':
          return '__gt=';
        case '<':
          return '__le=';
        default:
          return '__icontains=';
      }
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
        var tmp = [];
        for (var i in split) {
          if (split[i] && split[i] != "") tmp.push(split[i]);
        }
        split = tmp;
        if (split.length === 3) {
          var parent_type = split[1];
          var parent_id = split[2];
          var parent_name;
          for (var i in template.parents) {
            //i = template.parents[i];
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
              result += encodeURIComponent(i) + '__isnull=1&';
            }
          }
        }
        break;
      default:
        var op = opToString(operator);
        if (value && value != "")
          result = encodeURIComponent(key) + op + encodeURIComponent(value) + '&';
        else
          result = encodeURIComponent(key) + '__isnull=1&';
        break;
    }
    return result;
  };

  //-------------------------------------------------------------------------------------
  // Class: ResourceAdapter
  //-------------------------------------------------------------------------------------

  /**
   * Constuctor of the class ResourceAdapter. The Resource adapter is needed in order to
   * convert data from the G-Node RESTfull API specific format into a format used by
   * the application and vice versa.
   */
  WDAT.ResourceAdapter = ResourceAdapter;
  function ResourceAdapter() {
    // nothing to do
  }

  /**
   * Converts data from NetworkResource into a format that can easily be used
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
   * @param data (Obj, String)    A response object as specified in the
   *                              Documentation of the RESTfull api
   *
   * @return An array of converted objects
   */
  ResourceAdapter.prototype.adapt = function(data) {
    var adapted_data = {}, raw_data = data;
    if (typeof raw_data  === 'string') raw_data = JSON.parse(raw_data);
    // iterate over results
    for (var index in raw_data.selected) {
      var element = raw_data.selected[index];
      // the adapted result
      var adapted = {};
      // adapt general data
      var tmp = _stripURL(element.permalink).split('/');
      adapted.id = tmp.join('/');
      adapted.type = tmp[1];
      adapted.category = modCategory(adapted.type);
      adapted.plotable = modPlotable(adapted.type);
      adapted.date_created = element.fields.date_created;
      adapted.owner = _stripURL(element.fields.owner);
      switch (element.fields.safety_level) {
        case 1:
          adapted.safety_level = 'public';
          break;
        case 2:
          adapted.safety_level = 'friendly';
          break;
        default:
          adapted.safety_level = 'private';
          break;
      }
      // set template
      var template = modTemplate(adapted.type);
      if (template) {
        // adapt fields
        adapted.fields = {};
        for (var f in template.fields) {
          if (f === 'name') {
            if (adapted.type === 'value') {
              adapted.name = element.fields.data;
            } else {
              adapted.name = element.fields.name;
            }
          } else {
            adapted.fields[f] = element.fields[f];
          }
        }
        // adapt children
        adapted.children = {};
        for (var c in template.children) {
          if (element.fields[c] && element.fields[c].length > 0) {
            adapted.children[c] = [];
            for (var i in element.fields[c]) {
              adapted.children[c][i] = _stripURL(element.fields[c][i]);
            }
          }
        }
        // adapt parents
        adapted.parents = {};
        for (var p in template.parents) {
          if (element.fields[p]) {
            adapted.parents[p] = _stripURL(element.fields[p]);
          }
        }
        // adapt data
        adapted.data = {};
        for (var d in template.data) {
          if (element.fields[d]) {
            adapted.data[d] = element.fields[d];
          }
        }
      }
      adapted_data[adapted.id] = adapted;
    }
    return adapted_data;
  };

  /**
   * Adapts objects used inside the application to an object that can be used by the data
   * api. The resule is an object with two fields 'url' contains a url for the update/create
   * request and 'data' holds an object for the request body.
   *
   * @param data (Obj)      The data object to adapt.
   *
   * @return Object with url and request data.
   */
  ResourceAdapter.prototype.adaptUpdate = function(data) {
    var adapted = {}, url, type = null, cat = null, id = '';
    // prepare url
    if (data.type && modCategory(data.type)) {
      type = data.type;
      cat = modCategory(data.type);
    }
    if (data.id) {
      var tmp = data.id.split('/');
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
      adapted.name = data.data;
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
    for (var i in data.parents) {
      if (data.parents[i]) {
        var tmp = data.parents[i].split('/');
        adapted[i] = tmp[tmp.length - 1];
      }
    }
    return {'data': adapted, 'url': url};
  };

  /**
   * Extracts only the path part of a URL.
   * For internal use only.
   *
   * @param url (String)       The URL to strip
   *
   * @return The path part of the URL without leading '/'
   */
  function _stripURL(url) {
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

}());


