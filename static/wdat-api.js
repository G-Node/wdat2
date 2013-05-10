// ---------- file: object.js ---------- //


/**
 * Traverses the object and its child objects recursively and
 * returns the value of the first property with the given name. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object {Object}      The object to search in.
 * @param prop {string}     The name of the property to find.
 * @param children {Array}  Only search this subset of children (if present)
 *
 * @return The value of the first found property with the given name or null if no
 *          matching property was found.
 */
objGetRecursive = function(object, prop, children) {
  var found = null;
  var stack = [];
  stack.push(object);
  while (stack.length > 0 && !found) {
    var obj = stack.pop();
    for ( var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          found = obj[i];
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
};

/**
 * Traverse the object and its child objects recursively and
 * set all properties with a matching name to the given value. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object {Object}   The object to search in.
 * @param prop {string}     The name of the property to find.
 * @param val               The value to set
 * @param children {Array}  Only search this subset of children (if present)
 *
 * @return {number} The number of properties found with the given name.
 */
objSetRecursive = function(object, prop, val, children) {
  var found = 0;
  var stack = [];
  stack.push(object);
  while (stack.length > 0) {
    var obj = stack.pop();
    for ( var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          obj[i] = val;
          found++;
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
};

/**
 * Merges the properties of the first object into the second one.
 * Side effect! Changes the object passed as the second parameter.
 *
 * @param from {Object}        The source object.
 * @param to {Object}          The target object.
 * @param override {Boolean}   Override existing attributes in the target.
 * @param blacklist {Array} Exclude these attributes.
 *
 * @return {Object} The merged object (to).
 */
objMerge = function(from, to, override, blacklist) {
  if (from) {
    for ( var i in from) {
      if (from.hasOwnProperty(i) && (!blacklist || blacklist.indexOf(i) == -1)) {
        if (override || !to.hasOwnProperty(i))
          to[i] = from[i];
      }
    }
  }
  return to;
};

// ---------- file: string.js ---------- //


/**
 * Evaluates if a string starts with a certain substring (mixin).
 * @deprecated
 *
 * @param cmp {string}    The string to commpare with.
 *
 * @returns {Boolean} True if the string starts with cmp, false otherwise.
 */
String.prototype.startsWith = function(cmp) {
  return this.substr(0, cmp.length) === cmp;
};

/**
 * Evaluates if a string starts with a certain substring.
 *
 * @param s {string}    The string to check.
 * @param cmp {string}    The putative start sequence
 *
 * @returns True if str starts with cmp, false otherwise.
 */
strStartsWith = function(s, cmp) {
  return s.substr(0, cmp.length) == cmp;
};

/**
 * Capitalizes the first character of a string or the first characters of all
 * words of a string.
 *
 * @param s {string}      The string to capitalize.
 * @param sep {string}      Definition of word separators. If this is a falsy value only
 *                          the first character of the string is capitalized. If it is true
 *                          all words separated by ' ' are capitalized. If it is a string or
 *                          regex this will be used to separate words (See string.split())
 *
 * @return A copy of s with capitalized first character(s).
 */
strCapitalWords = function(s, sep) {
  var tmp;
  if (sep) {
    if (typeof(sep) == 'string')
      tmp = s.split(sep);
    else
      tmp = s.split(/[_\-\ \.:]/);
  } else {
    tmp = [s];
  }
  for ( var i in tmp) {
    var s = tmp[i];
    tmp[i] = s[0].toUpperCase() + s.slice(1);
  }
  return tmp.join(' ');
};

/**
 * Removes leading and trailing white space characters.
 *
 * @param s {string}    The string to trim.
 *
 * @return Copy of the string without leading and trailing white space characters.
 */
strTrim = function(s) {
  return (s || '').replace(/^\s+|\s+$/g, '');
};

// ---------- file: version.js ---------- //


// Define version and debug mode in the
// wdat main module.
var wdat; (function(wdat) {
  "use strict";

  /**
   * The version of the crayon library.
   *
   * @define {string}
   */
  wdat.version = "0.16.0";

  /**
   * Activate or deactivate debug mode.
   *
   * @define {Boolean}
   */
  wdat.debug = true;

})(wdat || (wdat = {}));

// ---------- file: mod/definitions.js ---------- //


// Add objects defining the data model of the API to the
// module 'mod'.
var wdat; (function(wdat) {

  // A define the model in wdat.model.
  wdat.model = {};

  /**
   * Define the model for metadata.
   *
   * @define {Object}
   */
  wdat.model.metadata = {

          section : {
            fields : {
              name: {type: 'text', obligatory: true, min: 3, max: 100},
              description: {type: 'ltext'},
              odml_type: {type: 'int', label: 'Type', obligatory: true, min: 0, value: 0},
              tree_position: {type: 'int', label: 'Position', obligatory: true, min: 0, value: 0}
            },
            children : {
              property_set: {type: 'property', label: 'Properties'},
              block_set: {type: 'block', label: 'Blocks'},
              //datafile_set: {type: 'file', label: 'Files'},
              section_set: {type: 'section', label: 'Sections'}
            },
            parents : {
              parent_section: {type: 'section', label: 'Section'},
            },
          },

          property : {
            fields : {
              name: {type: 'text', obligatory: true, min: 3, max: 100},
              unit: {type: 'text', max: 10 },
              uncertainty: {type: 'text'},
              dtype: {type: 'text', label: 'Data Type'},
              //dependency: {type: 'text'},
              //dependency_value: {type: 'text'},
              //mapping: {type: 'text'},
              definition: {type: 'ltext'},
              //comment: {type: 'ltext'},
            },
            children : {
              value_set: {type: 'value', label: 'Values'}
            },
            parents : {
              section: {type: 'section'}
            },
          },

          value : {
            fields : {
              name:  {type: 'text', obligatory: true, min: 1, max: 100}
            },
            children : {},
            parents : {
              parent_property: {type: 'property'}
            },
          }

  }; // end wdat.model.metadata

  /**
   * Define the model for ephys data.
   */
  wdat.model.ephys = {

          container : {

            block : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                index: {type: 'int', obligatory: true, min: 0, value: 0},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
                filedatetime: {type: 'date'},
                recdatetime: {type: 'date'}
              },
              children : {
                segment_set: {type: 'segment'},
                recordingchannelgroup_set: {type: 'recordingchannelgroup'},
              },
              parents : {
                section: {type: 'section'}
              }
            },

            segment : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                index: {type: 'int', obligatory: true, min: 0, value: 0},
                file_origin: {type: 'text'},
                filedatetime: {type: 'date'},
                recdatetime: {type: 'date'}
              },
              children : {
                analogsignal_set: {type: 'analogsignal'},
                irsaanalogsignal_set: {type: 'irsaanalogsignal'},
                analogsignalarray_set: {type: 'analogsignalarray'},
                spiketrain_set: {type: 'spiketrain'},
                spike_set: {type: 'spike'},
                event_set: {type: 'event'},
                eventarray_set: {type: 'eventarray'},
                epoch_set: {type: 'epoch'},
                epocharray_set: {type: 'epocharray'}
              },
              parents : {
                block: {type: 'block'}
              }
            },

            unit : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'}
              },
              children : {
                spiketrain_set: {type: 'spiketrain'},
                spike_set: {type: 'spike'},
                recordingchannel: {type: 'recordingchannel'}
              },
              parents : {}
            },

            recordingchannel : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
                coordinate: {type: 'text'},
                index: {type: 'int', min: 0 , value: 0}
              },
              children : {
                unit_set: {type: 'unit'},
                analogsignal_set: {type: 'analogsignal'},
                irsaanalogsignal_set: {type: 'irsaanalogsignal'}
              },
              parents : {
                recordingchannelgroup: {type: 'recordingchannelgroup'}
              }
            },

            recordingchannelgroup : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
                channel_names: {type: 'text'},
                channel_indexes: {type: 'text'}
              },
              children : {
                recordingchannel_set: {type: 'recordingchannel'},
                analogsignalarray_set: {type: 'analogsignalarray'}
              },
              parents : {
                block: {type: 'block'}
              }
            }

          },

          plotable : {

            spike: {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'}
              },
              data: {
                time: {type: 'num'},
                waveform: {type: 'datafile'},
                sampling_rate: {type: 'num'},
                left_sweep: {type: 'num'}
              },
              children: {},
                parents: {
                  segment: {type: 'segment'},
                  unit: {type: 'unit'}
                }
            },

            spiketrain: {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'}
              },
              data: {
                times: {type: 'num'},
                waveforms: {type: 'datafile'},
                sampling_rate: {type: 'num'},
                t_start: {type: 'num'},
                t_stop: {type: 'num'},
                left_sweep: {type: 'num'}
              },
              children: {},
              parents: {
                segment: {type: 'segment'},
                unit: {type: 'unit'}
              }
            },

            event: {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
                label: {type: 'text'}
              },
              data: {
                time: {type: 'num'}
              },
              children: {},
              parents: {
                segment: {type: 'segment'},
              }
            },

            epoch : {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
                label: {type: 'text'}
              },
              data : {
                duration: {type: 'num'},
                time: {type: 'num'},
              },
              children: {},
              parents: {
                segment: {type: 'segment'},
              }
            },

            analogsignal : {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
              },
              data : {
                signal: {type: 'datafile'},
                sampling_rate: {type: 'num'},
                t_start: {type: 'num'}
              },
              children : {},
              parents : {
                segment: {type: 'segment'},
                recordingchannel: {type: 'recordingchannel'}
              }
            },

            irsaanalogsignal : {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
              },
              data: {
                times: {type: 'num'},
                samples: {type: 'datafile'},
              },
              children: {},
              parents: {
                segment: {type: 'segment'},
              }
            },

            eventarray : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                labels: {type: 'text'},
                description: {type: 'ltext'},
                file_origin: {type: 'text'}
              },
              data : {
                times: {type: 'num'}
              },
              children: {
              },
              parents: {
                segment: {type: 'segment'}
              },
            },

            epocharray : {
              fields: {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                labels: {type: 'text'},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
              },
              data: {
                times: {type: 'datafile'},
                durations: {type: 'datafile'},
              },
              children: {
              },
              parents: {
                segment: {type: 'segment'},
              }
            },

            analogsignalarray : {
              fields : {
                name: {type: 'text', obligatory: true, min: 3, max: 100},
                description: {type: 'ltext'},
                file_origin: {type: 'text'},
              },
              data : {
                analogsignal_set: {type: 'datafile'},
                sampling_rate: {type: 'num'},
                t_start: {type: 'num'},
              },
              children : {
              },
              parents : {
                segment: {type: 'segment'},
              },
            }
          }

  }; // end wdat.model.ephys

  wdat.model.all = {
          fields: {
            safety_level: {type: 'option',  options: {'public': 'Public', 'friendly': 'Friendly', 'private': 'Private'}},
            date_created: {type: 'text', readonly: true}
          }
  };

})(wdat || (wdat = {}));

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

// ---------- file: bus.js ---------- //

var wdat; (function(wdat) {

  /****************************************************************************************
   * Class Bus. The event bus can be used to register and fire events.
   *
   * Logging:
   *    If wdat.debug = true the bus will write every event to the console.
   *
   * Error handling:
   *    If the event data object contains a field 'error' with a not falsy value
   *    the object will be passed to the method 'onerror(event, data)' and publishing of
   *    the event will be caceled if 'onerror' returns a falsy value.
   *
   * @returns {Bus}
   ***************************************************************************************/
  wdat.Bus = (function() {

    /**
     * Constructor for the class Bus.
     *
     * @constructor @this {Bus}
     */
    function Bus() {
      // used by the uid generator
      this._counter = 1;
      this.onerror = function(event, data) {
        if (data && data.error && console) {
          console.log('Bus (ERROR): event = ' + event.type + ' // error' + data.response || data.error);
          return false;
        }
        return true;
      };
    }

    /**
     * Subscribe a function to a specific event.
     *
     * @param event {string}    The event name.
     * @param fn {Function}     The function to call when events are published.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     *
     * @return The event name (with concatenated id)
     */
    Bus.prototype.subscribe = function(event, fn, uid) {
      var e = event;
      if (uid) e += uid;
      if (wdat.debug && console)
        console.log('Bus (DEBUG): subscribe event ' + e);
      $(this).bind(e, fn);
      return e;
    };

    /**
     * Unsubscribe a specific event.
     *
     * @param event {string}    The event name.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     */
    Bus.prototype.unsubscribe = function(event, uid) {
      var e = event;
      if (uid) e += uid;
      if (wdat.debug && console)
        console.log('Bus (DEBUG): unsubscribe event ' + e);
      $(this).unbind(e);
    };

    /**
     * Fire a specific event.
     *
     * @param event {string}    The event name.
     * @param data         The data that will be passed to the event handler function
     *                          along with the event.
     * @param uid {string}      A unique id that is concatenated to the event, in order
     *                          to create unique event names.
     *
     * @return The event name (with concatenated id)
     */
    Bus.prototype.publish = function(event, data, uid) {
      var e = event;
      if (uid) e += uid;
      if (this.onerror(event, data)) {
        if (wdat.debug && console) {
          var d = data || 'none';
          console.log('Bus (DEBUG): publish event ' + e + ' // data = ' + JSON.stringify(d));
        }
        $(this).trigger(e, data);
      } else if (console) {
        var d = data || 'none';
        console.log('Bus (DEBUG): event not published due to errors // data = ' + JSON.stringify(d));
      }
      return e;
    };

    /**
     * Create a new unique id (uid).
     *
     * @return The new unique identifier {string}.
     */
    Bus.prototype.uid = function() {
      return (this._counter++).toString();
    };

    return Bus;
  })(); // end class Bus

}(wdat || (wdat = {}))); // end module wdat

// ---------- file: data_api.js ---------- //

var wdat; (function(wdat) {

  /****************************************************************************************
   * Class DataAPI.
   * DataAPI is a interface to access a web data source. The basic concept of DataAPI is
   * to provide a uniform interface e.g. to a RESTfull API. To access the source the
   * DataAPI needs a NetworkResource. A ResurceAdapter is needed in order to convert data
   * from a resource specific format into a format used by the application and vice versa.
   *
   * Response: every method of the DataAPI delivers an asynchronous response by publishing
   * the data to an event that is specified by the first parameter of each method. A
   * response data object has always the following structure:
   *  {
   *    url: string,          // The url that was requested internally (debugging)
   *    status: number,       // The HTTP request status
   *    response: response,   // Array with results or Message string
   *    error: bool,          // true if an error has occurred, undefined otherwise
   *    param: object,        // All parameter from the original request
   *    action: string        // The action from the original request
   *  }
   *
   * Depends on: wdat.Bus and the used resource and adapter class.
   *
   * @returns {DataAPI}
   ***************************************************************************************/
  wdat.DataAPI = (function() {

    /**
     * Constructor for the class DataAPI.
     *
     * @param resource {string}   Class name of a network resource, the constructor must be
     *                            defined in the file 'network_resource.js' and has to be in the
     *                            module wdat.
     * @param adapter {string}    Class name for a resource adapter, the constructor must be
     *                            defined in the file 'network_resource.js' and has to be in the
     *                            module wdat.
     * @param bus {Bus}           A bus used for event driven data access.
     */
    function DataAPI(resource, adapter, bus) {
      this._bus = bus;
      // create a worker
      if (Worker) { // if worker is defined in the browser
        this._worker = new Worker('/site_media/static/data_api.js.worker');
        // send worker init message
        var init = {'resource' : resource, 'adapter' : adapter, 'action' : 'init',
                    'event' : 'init-event'};
        this._worker.postMessage(init);
        // callback for messages from the worker
        var that = this;
        this._worker.onmessage = function(msg) {
          that._bus.publish(msg.data.event, msg.data.data);
        };
        // callback for errors inside the worker
        this._worker.onerror = function(err) {
          console.log("Error in Worker at: " + err.filename + ": " + err.lineno + ": " +
                      err.message + ".");
        };
      } else { // if web workers are not available
        this._worker = false;
      }
      // create resource and adapter from class names
      this._resource = new wdat[resource]();
      this._adapter = new wdat[adapter]();
    }

    /**
     * Get get data by search specifiers.
     *
     * Supported search specifiers:
     *  - permalink:  category/type/number
     *  - id:         permalink or number
     *  - type:       'section', 'value', 'analogsignal' etc.
     *  - category:   'data' or 'metadata'
     *  - parent:     permalink or ''
     *  - name:       string
     *
     * @param event {string}      Event id for published data.
     * @param specifiers {Object} Object containing all specifiers.
     * @param info                Additional information that might be evaluated
     *                            when the request returns.
     */
    DataAPI.prototype.get = function(event, specifiers, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'get', specifiers, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.get(specifiers);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'get';
        result.param = specifiers;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Get get data by url.
     *
     * @param event {string}    Event id for published data.
     * @param url {string}      The URL to request.
     * @param info         Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.getByURL = function(event, url, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'get_by_url', url, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.getByURL(url);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'get_by_url';
        result.param = url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Update or create an object.
     *
     * @param event {string}    Event id for published data.
     * @param data {Object}     The object data for the update.
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.set = function(event, data, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'set', data, info);
      } else { // if Worker is not available we have to do this here
        var tmp = this._adapter.adaptUpdate(data);
        var result = this._resource.setByURL(tmp.url, tmp.data);
        if (!result.error) {
          result.response = this._adapter.adapt(result.response);
        }
        result.action = 'set';
        result.param = tmp.url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Delete an object.
     * TODO Maybe prevent bulk deletes.
     *
     * @param event {string}    Event id for published data.
     * @param url {string}      The URL to the object to delete (see RESTful API doc for info).
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     */
    DataAPI.prototype.del = function(event, url, info) {
      if (this._worker && !wdat.debug) { // if Worker is available just notify it
        this._notifyWorker(event, 'del', url, info);
      } else { // if Worker is not available we have to do this here
        var result = this._resource.delByURL(url);
        result.action = 'del';
        result.param = url;
        result.info = info;
        this._bus.publish(event, result);
      }
    };

    /**
     * Send a message to the worker. This method is for internal use only. Messages sent
     * to the worker have always the following structure:
     *  {
     *    event: string,   // the event that recieves the result
     *    action: string,  // 'get', 'update', 'delete', 'save' or 'test'
     *    data: object     // data like search parameter or data of the object to save
     *    info: any        // Additional information
     *  }
     *
     * @param event {string}    The event that is used by the worker to return data.
     * @param action {string}   The requested action.
     * @param param {Object}    Object containing all data for this request.
     * @param info              Additional information that might be evaluated
     *                          when the request returns.
     *
     * @return The message object sent to the worker.
     */
    DataAPI.prototype._notifyWorker = function(event, action, param, info) {
      var worker_msg = {};
      worker_msg.event = event;
      worker_msg.action = action;
      worker_msg.param = param;
      worker_msg.info = info;
      this._worker.postMessage(worker_msg);
      return worker_msg;
    };

    return DataAPI;
  })();

})(wdat || (wdat = {}));
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
var wdat; (function(wdat) {
  "use strict";

  /****************************************************************************************
   * Class NetworkResource. A NetworkResource provides methods to access a web resource,
   * in this case the G-Node RESTfull API.
   *
   * @returns {NetworkResource}
   ****************************************************************************************/
  wdat.NetworkResource = (function() {

    /**
     * Constructor of the class NetworkResource.
     *
     * @constructor @this {NetworkResource}
     * FIXME results in object by id and not as array
     */
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
          if (part.error && part.status != 404) {
            partialResults = [part];
            break;
          }
          partialResults.push(part);
        }
        var result = partialResults.pop();
        if (!result.error) {
          if (!result.response.selected)
            result.response.selected = [];
          for (var i in partialResults) {
            var part = partialResults[i];
            if (!part.error && part.response.selected)
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
      if (depth) {  // FIXME some part of this code returns null values in the result
        var d  = (depth > 2) ? 2 : depth;
        // do first request
        var url = this._specToURL(specifier);
        result = this.getByURL(url);
        if (!result.error) {
          // parse response
          var response = result.response;
          var subrequest_error = false;
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
              var childfields = wdat.modelChildren(type);
              var id = wdat.stripURL(elem.data.permalink);
              for (var i in childfields) {
                var field = childfields[i];
                if (field.type && field.type != type && elem.data.fields[i].length > 0) {
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
          spec.category = wdat.modelCategory(spec.type);
        }
        url = '/' + spec.category + '/' + spec.type + '/' + spec.id + '?q=full';
      } else {
        // if no id or permalink is specified additional parameters are evaluated
        if (!spec.category) {
          spec.category = wdat.modelCategory(spec.type);
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
      var template = wdat.modelTemplate(type);
      var fields = wdat.modelFields(type);
      // local function that converts an operator to its equivalent in the URL
      var opToString = function(op) {
        switch (op) {
          case '>':
            return '__gt=';
          case '<':
            return '__le=';
          default:
            if (fields[key]  && fields[key].type) {
              var ftype = fields[key].type;
              if (ftype == 'int' || ftype == 'num')
                return '__exact=';
            }
            return '__icontains=';
        }
      };
      // handle different types of key specifiers
      switch (key) {
        case 'category':  // ignore key category
          break;
        case 'type':      // ignore key type
          break;
        case 'parent':    // search for objects with specific parent
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
            if (parent_name) {
              result = encodeURIComponent(parent_name) + '=' + encodeURIComponent(parent_id) + '&';
            }
          } else {
            result = '';
            if (!value || vlaue == "") {
              for (var i in template.parents) {
                result += encodeURIComponent(i) + '__isnull=1&';
              }
            }
          }
          break;
        case 'safety_level': // search for safety level
          var slevel = parseInt(value);
          if (!slevel > 0) {
            switch (value) {
              case 'public':
                slevel = 1;
                break;
              case 'friendly':
                slevel = 2;
                break;
              default:
                slevel = 3;
                break;
            }
          }
          result = encodeURIComponent(key) + '__exact=' + encodeURIComponent(slevel) + '&';
          break;
        case 'owner':        // search for owner
          if (value != null && value != undefined && value !== "") {
            var v = value.toString().split('/').pop();
            result = encodeURIComponent(key) + '__exact=' + encodeURIComponent(v) + '&';
          } else {
            result = encodeURIComponent(key) + '__isnull=1&';
          }
          break;
        default:
          var op = opToString(operator);
          if (value != null && value != undefined && value !== "")
            result = encodeURIComponent(key) + op + encodeURIComponent(value) + '&';
          else
            result = encodeURIComponent(key) + '__isnull=1&';
          break;
      }
      if (operator == '!=')
        result = 'n__' + result;
      return result;
    };

    return NetworkResource;
  })(); // end class NetworkResource


  /****************************************************************************************
   * Class NetworkResource. The Resource adapter is needed in order to
   * convert data from the G-Node RESTfull API specific format into a format used by
   * the application and vice versa.
   *
   * @returns {ResourceAdapter}
   ****************************************************************************************/
  wdat.ResourceAdapter = (function() {

    /**
     * Constuctor of the class ResourceAdapter.
     *
     * @constructor @this {ResourceAdapter}
     */
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
        var tmp = wdat.stripURL(element.permalink).split('/');
        adapted.id = tmp.join('/');
        adapted.type = tmp[1];
        adapted.category = wdat.modelCategory(adapted.type);
        adapted.plotable = wdat.isPlotable(adapted.type);
        adapted.date_created = element.fields.date_created;
        adapted.owner = wdat.stripURL(element.fields.owner);
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
        var template = wdat.modelTemplate(adapted.type);
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
                adapted.children[c][i] = wdat.stripURL(element.fields[c][i]);
              }
            }
          }
          // adapt parents
          adapted.parents = {};
          for (var p in template.parents) {
            if (element.fields[p]) {
              adapted.parents[p] = wdat.stripURL(element.fields[p]);
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
      if (data.type && wdat.modelCategory(data.type)) {
        type = data.type;
        cat = wdat.modelCategory(data.type);
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

    return ResourceAdapter;
  })(); // end class ResourceAdapter

})(wdat || (wdat = {})); // end module wdat

// ---------- file: api/url_tools.js ---------- //

// Add functions that are needed to transform search strings and
// parameter into URLs to the wdat module.
var wdat; (function(wdat) {

  /**
   * Remove everything but the path part from a URL.
   * Example: 'http://host/foo/bar?param' = 'foo/bar'
   *
   * @param url {string}    A string representing a URL.
   *
   * @returns {sting} The path part of the URL.
   */
  wdat.stripURL = function(url) {
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

  /**
   * Turn a search string into a set of search parameter.
   *
   * @param str {string}    A search string.
   *
   * @returns {Array} An array with all search parameters extracted
   *                  from the search string.
   */
  wdat.stringToSearch = function(str) {
    var splitOR, splitAND, splitOp, error;
    var result = [];
    splitOR = str.split(/\s+[Oo][Rr]\s+|\|/);
    for (var i in splitOR) {
      var partResult = {};
      splitAND = splitOR[i].split(/\s+[Aa][Nn][Dd]\s+|,|&/);
      for (var j in splitAND) {
        splitOp = splitAND[j].split(/([<>=:])/);
        if (splitOp.length == 3) {
          var key = strTrim(splitOp[0]);
          var op  = strTrim(splitOp[1]);
          var val = strTrim(splitOp[2]);
          if (op == ':') op = '=';
          partResult[key] = [val, op];
        } else {
          error = 'Parsing of search parameters failes at substring "' +
                  splitAND[j] + '".';
          throw error;
        }
      }
      result.push(partResult);
    }
    return result;
  };

  /**
   * Turn a set of search parameter into a set of URLs.
   *
   * @param search {Array}   Array of search parameters.
   *
   * @returns {Array} Array of URLs.
   *
   * TODO
   * also generate urls for deep search like
   * http://localhost:8000/metadata/value/?parent_property__section=15
   */
  wdat.searchToURL = function(search) {
    // TODO implement
  };


  /**
   *
   */
  function _specifierToURL(spec) {
    // TODO implement
  }

  /**
   *
   */
  function _specifierToURLComp(type, key, value, operator) {
    // TODO implement
  }

})(wdat || (wdat = {}));// ---------- file: base.js ---------- //

/* IMPORTANT!
 * This file contains some base classes for other UI elements. Please make sure that
 * this file is included in all tests and production files before the definition of
 * other classes in the wdat name space.
 */

var wdat; (function(wdat, $) {
  'use strict';

  /****************************************************************************************
   * Class Widget. This is a base class for all kinds of UI elements. Each widget has a property _jq
   * that represents a jQuery object that refers to the HTML element that represents the
   * widget. Further more a widget has an id that can be used to select the widget.
   * A key feature of a Widget is the facht that it adds itself to ists own jQuery
   * object (widget.jq().data() === widget).
   *
   * Depends on: jQuery
   *
   * @returns {Widget}
   ***************************************************************************************/
  wdat.Widget = (function () {

    /**
     * Constructor of the class Widget.
     *
     * @param id {string|jQuery}      An id or and jQuery object, that defines the widget.
     * @param template {string}       HTML code that is used to instantiate the structure
     *                                of the widget (optional).
     * @param clazz {string}          The class that is added to HTML representation of
     *                                the widget (optional).
     *
     * @constructor @this {Widget}
     */
    function Widget(id, template, clazz) {
      var tmpl = template || '<div>';
      if (id) {
        if (typeof id == 'string') { // id is a string
          this._jq = $(tmpl);
          this._jq.attr('id', id);
          this._id = id;
        } else if (typeof id === 'object') { // id is a jQuery object
          this._jq = id;
          this._id = this._jq.attr('id');
          this._jq.empty().append($(tmpl).html());
        }
      } else {
        this._id = '';
        this._jq = $(tmpl);
      }
      if (clazz)
        this._jq.addClass(clazz);
      this._jq.data(this);
    }

    /**
     * Get the id of the widget.
     *
     * @returns The id of the widget.
     */
    Widget.prototype.id = function() {
      return this._id;
    };

    /**
     * Returns the jQuery object that represents the widget.
     * Use this method to add the widget to the DOM tree.
     *
     * @returns The jQuery object that represents the widget
     */
    Widget.prototype.jq = function() {
      this._jq.data(this);
      return this._jq;
    };

    /**
     * Generates an ID within the name space of the widget. This ID should be used
     * in order to avoid multiple identical IDs in one HTML document.
     *
     * @param data (String, Obj)    Id string or an object with the property 'id'.
     * @param suffix (String)       Suffix, that will be appended to the id.
     *
     * @returns The generated id string
     */
    Widget.prototype.toID = function(data, suffix) {
      var id = null;
      if (data) {
        if (typeof data === 'object') {
          if (data.id)
            id = this._id + '-' + data.id.toString().replace(/[\.\\\/_]+/g, '-');
        } else {
          id = this._id + '-' + data.toString().replace(/[\.\\\/_]+/g, '-');
        }
      }
      if (id && suffix)
        id += '-' + suffix;
      return id;
    };

    /**
     * Remove the widget from the DOM tree (side effect).
     * Don't reatach the wiget after calling this method.
     */
    Widget.prototype.remove = function() {
      this._jq.remove();
    };

    /**
     * Detach the widget from the DOM tree (side effect).
     */
    Widget.prototype.detach = function() {
      this._jq.detach();
    };

    return Widget;
  })(); // end class Widget

  // TODO refresh methods: provide a more generic way to display elements using wdat.model

  /****************************************************************************************
   * A container element, that displays objects returned by the DataAPI. The container
   * distinguishes between primary and secondary attributes. Primary attributes of
   * the presented object are shown permanently whereas secondary attributes are only visible
   * when the container is expanded.
   * Primary and secondary attributes can be configured using the setAttr() method or the
   * attrconf parameter of the constructor.
   *
   * Depends on: wdat.Bus, wdat.Widget, wdat.Button, jQuery, jQuery-UI button
   *
   * @returns {Container}
   ***************************************************************************************/
  wdat.Container = (function() {

    Container.inherits(wdat.Widget);
    /**
     * Constructor of the class Container.
     *
     * @param id (String, Obj)        String or jQuery object that represents the container.
     * @param bus (Bus)               Bus for handling events.
     * @param actions (Obj, Array)    Definitions of all actions.
     * @param clazz (String)          Class used for the containers HTML representation.
     * @param template (String)       Template for the container. If a custom template is used
     *                                the refresh method has to be overridden.
     * @param empty (String)          Content displayed in empty containers.
     * @param attrconf (Obj)          Definition of primary and secondary attributes.
     */
    function Container(id, bus, actions, clazz, template, empty, attrconf) {
      // prepare container structure
      var tmpl = template || Container.TEMPLATE;
      Container.parent.constructor.call(this, id, tmpl, 'wdat-container');
      if (clazz)
        this._jq.addClass(clazz);
      this._empty = empty || "No data selected";
      // set attributes
      this._bus = bus;
      this._data = null;
      // prepare actions
      this._actions = {};
      if (actions) {
        if (actions instanceof Array) {
          for (var i in actions) {
            this._actions[actions[i]] = this.toID(actions[i]);
          }
        } else if (typeof actions === 'object') {
          for (var i in actions) {
            if (actions[i])
              this._actions[i] = actions[i];
            else
              this._actions[i] = this.toID(i);
          }
        }
      }
      // prepare attrconf
      this._attrconf = {};
      if (attrconf) {
        for ( var i in attrconf) {
          if (i === 'prim')
            this._attrconf[i] = attrconf[i] || ['name'];
          else
            this._attrconf[i] = attrconf[i];
        }
      } else {
        this._attrconf = {prim : ['name']};
      }
      // add this to html container
      this._jq.data(this);
    }

    /**
     * Set the data object of the container.
     *
     * @param data (Obj)       The data object of the container.
     *
     * @returns The data object
     */
    Container.prototype.set = function(data) {
      this._data = data;
      this.refresh();
      return data;
    };

    /**
     * Get the main data object of the container.
     *
     * @returns The main data object of the container.
     */
    Container.prototype.get = function() {
      return this._data;
    };

    /**
     * Clear the container content and refresh it.
     */
    Container.prototype.clear = function() {
      this._data = null;
      this.refresh();
    };

    /**
     * Get the event for a specific action.
     *
     * @param action (String)    The action name.
     *
     * @returns The event for the specific action or undefined.
     */
    Container.prototype.event = function(action) {
      var act = this._actions[action];
      if (act && typeof action !== 'function')
        return act;
    };

    /**
     * Configure the primary or secondary attributes for the main data object or
     * its children.
     *
     * @param type (String)     The type of attributes ('prim', 'sec', 'child_prim'
     *                          or 'child_sec').
     * @param attrlist (Array)  Array with attributes that replaces the existing list
     *                          of attributes.
     *
     * @returns {Array}
     */
    Container.prototype.attrconf = function(type, attrlist) {
      if (attrlist)
        this._attrconf[type] = attrlist;
      return this._attrconf[type] || [];
    };

    /**
     * Refresh or create the whole content of the container.
     */
    Container.prototype.refresh = function() {
      // create primary content
      var html = this._jq.children('.primary').empty();
      var count = 0;
      var attrconf = this._genAttrconf();
      for ( var i in attrconf.prim) {
        var val = objGetRecursive(this._data, attrconf.prim[i]);
        if (val) {
          switch (count) {
            case 0:
              html.append($('<span class="head">').text(val));
              break;
            case 1:
              html.append($('<span class="head-add">').text(val));
              break;
            default:
              html.children('.head-add').append(', ' + val);
              break;
          }
        }
      }
      // create secondary content
      html = this._jq.children('.secondary').empty();
      for ( var i in attrconf.sec) {
        var key = attrconf.sec[i];
        var val = objGetRecursive(this._data, key) || 'n.a.';
        key = strCapitalWords(key, /[_\-\ \.:]/) + ':';
        html.append($('<dt>').text(key)).append($('<dd>').text(val));
      }
      // create buttons
      html = this._jq.children('.buttons').empty();
      var btn;
      if (attrconf.sec.length > 0) {
        btn = new wdat.Button(null, 'more', this._bus, this._expandHandler());
        html.append(btn.jq());
      }
      for ( var i in Container.ACTIONS) {
        var act = Container.ACTIONS[i];
        if (this._actions.hasOwnProperty(act)) {
          var click = this._actions[act];
          btn = new wdat.Button(null, act + '_small', this._bus, click, this._data);
          html.append(btn.jq());
        }
      }
    };

    /**
     * Generates a attrconf.
     *
     * @returns {Object}
     */
    Container.prototype._genAttrconf = function() {
      var data = this._data;
      var attrconf = {};
      if (this._attrconf.prim && this._attrconf.prim.length > 0) {
        attrconf.prim = this._attrconf.prim;
      } else {
        attrconf.prim = ['name'];
      }
      if (this._attrconf.sec) {
        attrconf.sec = this._attrconf.sec;
      } else {
        attrconf.sec = [];
        var fields = wdat.modelFields(data.type);
        if (fields) {
          for (var i in fields) {
            attrconf.sec.push(i);
          }
        } else {
          for (var i in data) {
            attrconf.sec.push(i);
          }
        }
      }
      return attrconf;
    };

    /**
     * Returns a handler for expand events (for internal use only)
     *
     * @returns {Function}
     */
    Container.prototype._expandHandler = function() {
      var that = this;
      return function() {
        var sec = that._jq.children('.secondary');
        sec.toggleClass('hidden');
      };
    };

    /**
     * HTML template for container
     */
    Container.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                         '<dl class="secondary hidden"></dl></div>';

    /**
     * Possible container actions.
     */
    Container.ACTIONS = ['add', 'del', 'sel', 'edit'];

    return Container;
  })(); // end class container


  /****************************************************************************************
   * Class ParentContainer. A container element, that displays objects returned by the DataAPI. The container
   * stores a main data object (parent) as well as a set of children.
   *
   * Depends on: wdat.Bus, wdat.Container, wdat.Button, jQuery, jQuery-UI button
   *
   * @returns {ParentConatiner}
   ***************************************************************************************/
  wdat.ParentContainer = (function() {

    ParentContainer.inherits(wdat.Container);
    /**
     * Constructor of the class ParentContainer.
     *
     * @param id (String, Obj)        String or jQuery object that represents the container.
     * @param bus (Bus)               Bus for handling events.
     * @param actions (Obj, Array)    Definitions of all actions.
     * @param clazz (String)          Class used for the containers HTML representation.
     * @param template (String)       Template for the container. If a custom template is used
     *                                the refresh method has to be overridden.
     * @param empty (String)          Content displayed in empty containers.
     * @param attrconf (Obj)          Definition of primary and secondary attributes.
     *
     * @constructor @this {ParentContainer}
     */
    function ParentContainer(id, bus, actions, clazz, template, empty, attrconf) {
      // prepare container structure
      var tmpl = template || ParentContainer.TEMPLATE;
      ParentContainer.parent.constructor.call(this, id, bus, actions, clazz, tmpl, empty, attrconf);
      // array with children
      this._children = [];
      // add this to html container
      this._jq.data(this);
    }

    /**
     * Set child objects for the data object represented by the container.
     * If the data parameter is an Array, all children will be replaced by
     * the objects contained in data. If data is an Object the object repaces
     * all existing children.
     *
     * @param data (Array, Obj)     Child objects of the main data object represented by
     *                               the container.
     */
    ParentContainer.prototype.setChildren = function(data) {
      delete this._children;
      if (data instanceof Array) {
        this._children = data;
      } else {
        this._children = [data];
      }
      this.refreshChildren();
    };

    /**
     * Get the child objects of the main data object of the container.
     *
     * @return {Array} All children of the main data object.
     */
    ParentContainer.prototype.getChildren = function() {
      return this._children;
    };

    /**
     * Get a specific child.
     *
     * @param data (String, Obj)    The id of the child or an object with an attribut 'id'.
     *
     * @return The found child or undefined if nothig was found.
     */
    ParentContainer.prototype.getChild = function(data) {
      var id = data.id || data;
      var result = undefined;
      for (var i in this._children) {
        var child = this._children[i];
        if (child.id == id) {
          result = child;
          break;
        }
      }
      return result;
    };

    /**
     * Update an existing child.
     *
     * @param data (Obj)    The child element to set.
     *
     * @return True if an element was updated, false otherwise.
     */
    ParentContainer.prototype.setChild = function(data) {
      if (data.id) {
        for (var i in this._children) {
          var child = this._children[i];
          if (child.id == data.id) {
            this._children[i] = data;
            return true;
          }
        }
      }
    };

    /**
     * Add a new child to the list of existing children.
     *
     * @param data (Obj)
     *
     * @returns The added child or udefined if nothing was added.
     */
    ParentContainer.prototype.addChild = function(data) {
      if (!data.id) data.id = this._bus.uid();
      var exists = false;
      for (var i in this._children) {
        var child = this._children[i];
        if (child.id == data.id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        this._children.push(data);
        return true;
      }
    };

    /**
     * Refresh or create the whole content of the container.
     */
    ParentContainer.prototype.refresh = function() {
      ParentContainer.parent.refresh.call(this);
      this.refreshChildren();
    };

    /**
     * Refresh only the part of the container, that displays the children. In this
     * implementation it just does noting.
     */
    ParentContainer.prototype.refreshChildren = function() {
      // nothing to do
    };

    ParentContainer.TEMPLATE = '<div><div class="buttons"></div><div class="primary"></div>' +
                               '<dl class="secondary hidden"></dl></div>';

    return ParentContainer;
  })(); // end class parent container.


  /****************************************************************************************
   * A container that holds multiple elements.
   *
   * Depends on: wdat.Bus, wdat.Widget
   *
   * @returns {MultiContainer}
   ***************************************************************************************/
  wdat.MultiContainer = (function() {

    MultiContainer.inherits(wdat.Widget);
    /**
     * Class MultiContainer.
     *
     * @param id (String, Obj)      String or jQuery object that represents the container.
     * @param bus (Bus)             Bus for handling events.
     * @param actions (Obj., Array) Definitions of all actions.
     * @param clazz (String)        Class used for the containers HTML representation.
     * @param template (String)     Template for the container. If a custom template is used
     *                              the refresh method has to be overridden.
     *
     * @constructor @this {MultiContainer}
     */
    function MultiContainer(id, bus, actions, clazz, template) {
      // prepare container structure
      var tmpl = template || wdat.Container.TEMPLATE;
      MultiContainer.parent.constructor.call(this, id, tmpl, 'wdat-container');
      if (clazz)
        this._jq.addClass(clazz);
      // set attributes
      this._bus = bus;
      this._data = {};
      // prepare actions
      this._actions = {};
      if (actions) {
        if (actions instanceof Array) {
          for ( var i in actions) {
            var act = actions[i];
            this._actions[act] = this.toID(act);
          }
        } else if (typeof actions === 'object') {
          for ( var i in actions) {
            this._actions[i] = actions[i];
          }
        }
      }
      // add this to html container
      this._jq.data(this);
    }

    /**
     * Add a new element to the container.
     *
     * @param data (Obj.)     The data object to add.
     * @param position        The position where to add the element.
     *
     * @returns The added object or null if nothing was added.
     */
    MultiContainer.prototype.add = function(data, position) {
      if (!data.id)
        data.id = this._bus.uid();
      if (!this.has(data)) {
        this._data[data.id] = {data : data, position : position};
        return data;
      }
    };

    /**
     * Update an existing element of the container.
     *
     * @param data (Obj.)     The data object to update.
     * @param position        The position of the element (optional).
     *
     * @returns The updated element or null if no such element was found.
     */
    MultiContainer.prototype.set = function(data, position) {
      if (this.has(data)) {
        var pos = position || this._data[data.id].position;
        this._data[data.id] = {data : data, position : pos};
        return data;
      }
    };

    /**
     * Get an existing element by its id.
     *
     * @param data (String)     The id of the element to get.
     *
     * @returns The element matching the id or undefined.
     */
    MultiContainer.prototype.get = function(data) {
      if (data) {
        var id = data.id || data;
        if (this._data.hasOwnProperty(id)) {
          return this._data[id].data;
        }
      }
    };

    /**
     * Check if an element is in the container.
     *
     * @param data (Obj., String) The element to check or the id of this element.
     *
     * @returns True if the element exists, false otherwise.
     */
    MultiContainer.prototype.has = function(data) {
      if (data) {
        var id = data.id || data;
        return (id && this._data.hasOwnProperty(id));
      }
    };

    /**
     * Clear the container and refresh its content.
     */
    MultiContainer.prototype.clear = function() {
      delete this._data;
      this._data = {};
      this.refresh();
    };

    /**
     * Delete an element from the container.
     *
     * @param data (Obj., String) The element to delete or the id of this element.
     *
     * @returns True if the element was deleted, false otherwise.
     */
    MultiContainer.prototype.del = function(data) {
      var id = data.id || data;
      if (this.has(id)) {
        delete this._data[id];
        return true;
      }
    };

    /**
     * Get the event for a specific action.
     *
     * @param action (String)    The action name.
     *
     * @returns The event for the specific action or undefined.
     */
    MultiContainer.prototype.event = function(action) {
      var act = this._actions[action];
      if (act && typeof action !== 'function')
        return act;
    };

    return MultiContainer;
  })(); // end class MultiContainer
})(wdat || (wdat = {}), jQuery);

// ---------- file: bread_crumb.js ---------- //

var wdat; (function(wdat, $) {
  'use strict';

  /****************************************************************************************
   * Class BreadCrumb: BreadCrumb implements a bread crumb
   * navigation bar. Elements can be added to the navigation bar. Each element
   * is represented by a button which sends a selection event when clicked.
   *
   * Elements are Objects with the following properties:
   *
   *  - Minimal element: {id: <id>, name: <name>}
   *
   * Depends on:jQuery, jQuery-UI, wdat.Bus, wdat.Widget
   *
   * @returns {BreadCrumb}
   ***************************************************************************************/
  wdat.BreadCrumb = (function() {

    BreadCrumb.inherits(wdat.Widget);

    /**
     * Constructor for the class BreadCrumb.
     *
     * @param id {string|Object}        The id of the list or a jQuery object.
     * @param bus {Bus}                 Bus for handling events.
     * @param action {string|Function}  Event name or callback function for selection events (click)
     *
     * @constructor @this {BreadCrumb}
     */
    function BreadCrumb(id, bus, action) {
      BreadCrumb.parent.constructor.call(this, id, '<div>', 'wdat-bread-crumb');
      this._bus = bus;
      this.action = action || this._id + '-select';
      this._datasets  = [];
      this._jq.data(this);
      this._jq.buttonset();
      var that = this;
      this._selectHandler = function() {
        var d = that.selected();
        if (typeof that.action  === 'function') {
          that.action(d);
        } else {
          that._bus.publish(that.action, d);
        }
      };
    }

    /**
     * Add a new element to the navigation bar. If pos is not set the element will
     * be appended after the currentlx selected element. If the position is specified
     * all elements beginning at this position will be removed and the element
     * will be appended to the end of the navigation bar.
     *
     * @param data {Object}         Object representing the navigation bar element.
     * @param position {number}     The position where to add the new element. All elements after the
     *                              specified position will be deleted (optional).
     *
     * @return The inserted element or null if nothing has been inserted.
     */
    BreadCrumb.prototype.add = function(data, position) {
      var pos = position || this.selectedPos() + 1;
      if (!data.id) data.id = this._bus.uid();
      // prepare datasets
      this._datasets.splice(pos, this._datasets.length);
      this._datasets.push(data);
      // remove old radio buttons
      this._jq.empty();
      // create new ratio buttons
      for (var i in this._datasets) {
        var d = this._datasets[i];
        var input = $('<input type="radio">').attr('name', this._id).attr('id', this.toID(d));
        var label = $('<label>').attr('for', this.toID(d)).text(d.name);
        if (i == (this._datasets.length - 1))
          label.addClass('ui-state-active');
        this._jq.append(input).append(label);
      }
      this._jq.buttonset('refresh');
      this._jq.children('input').click(this._selectHandler);
      return data;
    };

    /**
     * Remove all elements from the bread crumb bar beginning at the given position.
     *
     * @param position {number}    The position from where to delete all elements.
     */
    BreadCrumb.prototype.del = function(position) {
      var pos = position || 0;
      // prepare datasets
      this._datasets.splice(pos, this._datasets.length);
      // remove old radio buttons
      this._jq.empty();
      // create new ratio buttons
      for (var i in this._datasets) {
        var d = this._datasets[i];
        var input = $('<input type="radio">').attr('name', this._id).attr('id', this.toID(d));
        var label = $('<label>').attr('for', this.toID(d)).text(d.name);
        if (i == (this._datasets.length - 1))
          label.addClass('ui-state-active');
        this._jq.append(input).append(label);
      }
      this._jq.buttonset('refresh');
      this._jq.children('input').click(this._selectHandler);
    };

    /**
     * Checks if an element is in the bread crumb bar.
     *
     * @param data {string|Object}  The id of an element or the element itself.
     *
     * @return True if the element is in the bread crumb bar, false otherwise.
     */
    BreadCrumb.prototype.has = function(data) {
      return (data && this._jq.children('#' + this.toID(data)).length > 0);
    };

    /**
     * Get the position of an element inside the bread crumb bar.
     *
     * @param data {string|Object}  The id of an element or the element itself.
     *
     * @return The position of the element inside the bar or -1 if not found.
     */
    BreadCrumb.prototype.pos = function(data) {
      var pos = -1;
      if (data) {
        var id = this.toID(data);
        this._jq.children('input').each(function(i) {
          if (pos < 0 && $(this).attr('id') == id) pos = i;
        });
      }
      return pos;
    };

    /**
     * Get the position of the selected element.
     *
     * @returns {number} The position of the element inside the bar or -1 if not found.
     */
    BreadCrumb.prototype.selectedPos = function() {
      var pos = (this._datasets.length - 1);
      this._jq.children('label').each(function(i) {
        if (pos > i && $(this).is('.ui-state-active')) pos = i;
      });
      return pos;
    };

    /**
     * Get the currently selected element.
     *
     * @return The currently selected element.
     */
    BreadCrumb.prototype.selected = function() {
      return this._datasets[this.selectedPos()];
    };

    return BreadCrumb;
  })(); // end class BreadCrumb

})(wdat || (wdat = {}), jQuery); // end module wdat

// ---------- file: button2.js ---------- //


var wdat; (function(wdat, $){


  /****************************************************************************************
   * A button widget. This is basically a wrapper for a jQuery UI button
   * object.
   *
   * Depends on: WDAT.Widget, WDAT.Bus, jQuery, jQuery UI
   *
   * @returns {Button}
   ***************************************************************************************/
  wdat.Button = (function() {

    Button.inherits(wdat.Widget);
    /**
     * Constructor for the class Button.
     *
     * @param id (String, Obj)          Id or jQuery object that represents the button (optional).
     * @param label (String)            The label for the button. This might also be a name of a
     *                                  predefined button class (see PREDEF_BUTTONS).
     * @param bus (Bus)                 Bus for events.
     * @param click (String, Function)  Event string or function that is propagated by clicks.
     *                                  If click is an event the whole button object is passed
     *                                  to the event.
     * @param data (Any)                Some data that is passed along with events.
     *
     * @constructor @this {Button}
     */
    function Button(id, label, bus, click, data) {
      Button.parent.constructor.call(this, id, '<button>', 'wdat-button');
      this._bus = bus;
      this._data = data;
      if (Button.PREDEF_BUTTONS.hasOwnProperty(label)) {
        var pre = Button.PREDEF_BUTTONS[label];
        this._jq.button(pre.def);
        if (pre.click) this._jq.click(pre.click);
      } else {
        this._jq.button({text: true, label: label});
      }
      this.click(click || this._id);
    }

    /**
     * Getter and setter for data, that is associated with the button.
     *
     * @param data (Any)    New data (optional).
     *
     * @return The data associated with the button.
     */
    Button.prototype.data = function(data) {
      var tmp = this._data;
      if (data !== undefined)
        this._data = data;
      return tmp;
    };

    /**
     * Getter or setter for click events.
     *
     * @param click (String, Function)    Event string or function that is propagated by
     *                                    clicks. If click is an event the whole button
     *                                    object is passed to the event.
     *
     * @return The function that handles the click event.
     */
    Button.prototype.click = function(click) {
      if (click) {
        // remove old handler
        if (this._click) this._jq.unbind('click', this._click);
        // add new one
        if (typeof click === 'function') {
          this._click = click;
          this._jq.click(click);
        } else {
          var that = this;
          this._click = function() { that._bus.publish(click.toString(), that.data()); };
          this._jq.click(this._click);
        }
      }
      return this._click;
    };

    Button.prototype.disable = function(disabled) {
      this._jq.button("option", "disabled", disabled);
    };

    /* Some predefined buttons */
    Button.PREDEF_BUTTONS = {
      add:        {def: {text: true, label: "Add", icons: { primary: "ui-icon-plusthick"}}},
      add_small:  {def: {text: false, icons: { primary: "ui-icon-plusthick"}}},
      del:        {def: {text: true, label: "Remove", icons: { primary: "ui-icon-minusthick"}}},
      del_small:  {def: {text: false, icons: { primary: "ui-icon-minusthick"}}},
      sel:        {def: {text: true, label: "Select", icons: { primary: "ui-icon-check"}}},
      sel_small:  {def: {text: false, icons: { primary: "ui-icon-check"}}},
      edit:       {def: {text: true, label: "Edit", icons: { primary: "ui-icon-wrench"}}},
      edit_small: {def: {text: false, icons: { primary: "ui-icon-wrench"}}},
      ok:         {def: {text: true, label: "OK"}},
      save:       {def: {text: true, label: "Save"}},
      quit:       {def: {text: true, label: "Cancel"}},
      more:       {def: {text: false, icons: { primary: "ui-icon-triangle-1-s"}},
                   click: _toggleimg("ui-icon-triangle-1-s", "ui-icon-triangle-1-n")}
    };

    /**
     * Toggle images. For internal use only
     *
     * @param first (String)     CSS identifier (jQuery UI button) for the first image.
     * @param second (String)   CSS identifier (jQuery UI button) for the second image.
     *
     * @returns {Function}
     */
    function _toggleimg(first, second) {
      return function() {
        var b = $(this);
        if (b.button("option", "icons").primary == first)
          b.button("option", "icons", { primary: second});
        else
          b.button("option", "icons", { primary: first});
      };
    }

    return Button;
  })(); // end class Button

})(wdat || (wdat = {}), jQuery); // end module wdat

// ---------- file: form.js ---------- //

var wdat; (function(wdat, $) {
  'use strict';

  /****************************************************************************************
   * Class Form.
   *
   * @returns {Form}
   ***************************************************************************************/
  wdat.Form = (function() {

    Form.inherits(wdat.Container);

    /**
     * Constructor for the Form base class.
     *
     * @param id (String, Obj)        String or jQuery object that represents the container.
     * @param bus (Bus)               Bus for handling events.
     * @param actions (Obj, Array)    Definitions of all actions (e.g. save or response).
     * @param model (String, Obj)     Model for the form. This can be a name of a model
     * @param isModal (Boolean)       If true then this form can be shown in a modal window.
     *
     * Depends on: jQuery, jQuery-UI, WDAT.Bus, WDAT.Container, WDAT.model
     *
     * @constructor @this {Form}
     *
     * TODO Fix bug in test
     */
    function Form(id, bus, actions, model, isModal) {
      Form.parent.constructor.call(this, id, bus, actions, 'wdat-form', Form.FORM_TEMPLATE);
      this._isModal = isModal;                      // true if this is a form for modal dialogs
      // get model and type
      if (typeof model == 'string') {
        this._type = model;
        this._model = wdat.modelFields(model);
      } else if (typeof model == 'object') {
        this._model = wdat.modelFields(model.type);
        if (this._model)
          this._type = model.type;
        else
          this._model = model;
      }
      // if not modal create a save button
      if (!isModal && this._actions.save) {
        // create buttons and actions
        var savebtn = $('<button>').button({text : true, label : "Save"});
        var that = this;
        savebtn.click(function() {
          var data = that.get();
          //if (data)
            that._bus.publish(that._actions.save, data);
        });
        this._jq.children('.buttonset').append(savebtn);
      }
      // attach self to dom
      this._jq.data(this);
      // build the form
      this.refresh();
    }

    /**
     * Refresh the form.
     */
    Form.prototype.refresh = function() {
      if (this._model) {
        // clear form
        this._jq.children('.errorset').empty();
        var fieldset = this._jq.children('.fieldset');
        fieldset.empty();
        // generate fields
        for (var name in this._model) {
          // search for field in data
          var val = undefined;
          if (this._data) {
            val = objGetRecursive(this._data, name, ['fields', 'parents', 'data']);
            val = (val != null && val.data) ? val.data : val;
          }
          // if value has a value, get input element and set val
          var field = this._genField(name, this._model[name], val);
          fieldset.append(field);
        }
      }
    };

    /**
     * Creates a jQuery object representing an input field with label.
     * For internal use only.
     *
     * @param name (String) Id for the input.
     * @param def (Obj)     The definition object for the input (see WDAT.type), it must
     *                      specify a type and can have additionally the following fields:
     *                      obligatory, min, max, value and label, options, readonly. Valid
     *                      types are: text, file, email, ltext, num, int, password, option,
     *                      boolean, hidden.
     * @param value (Obj)   The value of the field (optional);
     *
     * @return A jQuery object that represents the input element and a label.
     */
    Form.prototype._genField = function(name, def, value) {
      // create template
      var html = $(Form.FIELD_TEMPLATE).attr('id', this.toID(name));
      var htmlLabel = html.children('.field-label');
      var htmlInput = html.children('.field-input');
      // generate label
      if (def.type != 'hidden') {
        var label = (def.label ? def.label : strCapitalWords(name, /[_\-\ \.:]/)) + ':';
        htmlLabel.text(label);
      } else {
        html.addClass('hidden');
      }
      // generate input
      var ftype = Form.FIELD_TYPES[def.type];
      var input = null;
      if (ftype) {
        input = $('<input>').attr('type', ftype.type);
        if (ftype.create)
          ftype.create(input);
        if (!ftype.nowidth)
          input.addClass('fixed-width');
      } else if (def.type === 'ltext' || def.type === 'textarea') {
        input = $('<textarea rows="6"></textarea>');
        input.addClass('fixed-width');
          input.attr('value', def.value);
      } else if (def.type === 'option') {
        input = $('<select size="1"></select>');
        for (var i in def.options) {
          input.append($('<option></option>').attr('value', i).text(def.options[i]));
        }
      } else {
        throw new Error('field has no valid type: field.type = ' + type);
      }
      if (value) {
        input.attr('value', value);
      } else if (def.value != undefined && def.value != null) {
        input.attr('value', def.value);
      }
      if (def.readonly) {
        input.attr('readonly', 'readonly');
      }
      input.attr('name', this.toID(name));
      htmlInput.append(input);
      return html;
    };

    /**
     * Validates the form and marks errors inside the form.
     *
     * @return True if the form is valid false otherwise.
     */
    Form.prototype.validate = function() {
      // reset errors
      var valid = true;
      this._jq.find('.error').remove();
      // iterate over input definitions
      for (var name in this._model) {
        var def   = this._model[name];
        var html  = this._jq.find('#' + this.toID(name));
        var input = html.children('.field-input').contents();
        var value = input.val();
        var error = $(Form.ERROR_TEMPLATE);
        // test if value is empty
        if (value.match(/^\s*$/)) {
          // check if not empty when obligatory
          if (def.obligatory) {
            error.children('.field-error').text('this field is obligatory');
            html.after(error);
            valid = false;
            continue;
          }
        } else {
          // get type definition an do type specific checks
          var typedef = Form.FIELD_TYPES[def.type];
          if (typedef && typedef.check && !value.match(typedef.check)) {
            error.children('.field-error').text(typedef.fail);
            html.after(error);
            valid = false;
            continue;
          }
          // check bounds
          if (typedef && (def.type === 'num' || def.type === 'int')) {
            value = parseFloat(value);
            if (def.min !== undefined && value < def.min) {
              error.children('.field-error').text('value must be larger than ' + def.min);
              html.after(error);
              valid = false;
              continue;
            } else if (def.max !== undefined && value > def.max) {
              error.children('.field-error').text('value must be less than ' + def.max);
              html.after(error);
              valid = false;
              continue;
            }
          } else {
            value = value.toString();
            if (def.min !== undefined && value.length < def.min) {
              error.children('.field-error').text('value must be longer than ' + def.min);
              html.after(error);
              valid = false;
              continue;
            } else if (def.max !== undefined && value.length > def.max) {
              error.children('.field-error').text('value must be less than ' + def.max);
              html.after(error);
              valid = false;
              continue;
            }
          }
        }
      }
      return valid;
    };

    /**
     * Set the data object of the form.
     *
     * @param data (Obj)       The data object of the container.
     *
     * @returns The data object or undefined if the data don't match the form type.
     */
    Form.prototype.set = function(data) {
      var newdata = undefined;
      if (data) {
        if (this._type && data.type == this._type) {
          newdata = data;
        } else if (!this._type) {
          newdata = data;
        }
      } else {
        if (this._type) {
          newdata = wdat.modelCreate(this._type);
        } else {
          newdata = {};
        }
      }
      if (newdata) {
        this._data = newdata;
      }
      this.refresh();
      return newdata;
    };

    /**
     * Validates the form and read all data from the form.
     *
     * @returns {Object} The data of the form as object or null if the form is not valid.
     */
    Form.prototype.get = function() {
      if (this.validate()) {
        for ( var field in this._model) {
          var def = this._model[field];
          var input = this._jq.find('#' + this.toID(field) + ' :input');
          var val = (input.val());
          if (val === '') {
            val = null;
          } else if (def.type === 'num') {
            val = parseFloat(val);
          } else if (def.type === 'int') {
            val = parseInt(val);
          }
          var set = objSetRecursive(this._data, field, val, ['fields', 'parents', 'data']);
          if (!set)
            this._data[field] = val;
        }
        return this._data;
      }
    };

    /**
     * Opens the form in a modal window.
     */
    Form.prototype.open = function() {
      if (this._isModal && this._jq) {
        var title = strCapitalWords(this._type, /[_\-\ \.:]/) || 'Form';
        var that = this;
        this._jq.dialog({               // jQuery-UI dialog
          autoOpen : true, width : 610, modal : true,
          draggable: false, resizable: false, title: title,
          buttons : {
            Cancel : function() {         // callback for cancel actions
              $(this).dialog('close');
            },
            Save : function() {           // callback for save actions
              var data = that.get();
              if (data) {
                that._bus.publish(that.event('save'), data);
                $(this).dialog('close');
              }
            }
          }
        });
      }
    };

    /**
     * Some template strings.
     */
    Form.FORM_TEMPLATE = '<div class="wdat-form"><div class="errorset"></div>' +
                         '<div class="fieldset"></div><div class="buttonset"></div></div>';

    Form.FIELD_TEMPLATE = '<div class="field"><div class="field-label"></div>' +
                          '<div class="field-input"></div></div>';

    Form.ERROR_TEMPLATE = '<div class="error"><div class="field-label"></div>' +
                          '<div class="field-error"></div></div>';

    /**
     * Internal constant that defines properties for several input types.
     */
    Form.FIELD_TYPES = {
            text:   { type: 'text' },
            file:   { type: 'file' },
            hidden: { type: 'hidden'},
            password: { type: 'password' },
            date:   { type: 'text',
                      create: function(input) { input.datepicker({dateFormat : "yy/mm/dd"}); },
                      nowidth: true },
            num:    { type: 'text',
                      check: /^[-+]?[0-9]{1,16}\.?[0-9]{0,16}([eE][-+]?[0-9]+)?$/,
                      fail: 'is not a valid number (floeatingpoint)' },
            int:    { type: 'text',
                      check: /^[0-9]{1,16}?$/,
                      fail: 'is not a valid number (integer)' },
            email:  { type: 'text',
                      check: /^[a-zA-Z][\w\.\-]{1,128}@[a-zA-Z][\w\.\-]{1,128}\.[a-zA-Z]{2,4}$/,
                      fail: 'is not a valid email address' },
            boolean:  { type: 'checkbox',
                        nowidth: true }
    };

    return Form;
  })();


})(wdat || (wdat = {}), jQuery) // end module wdat;

// ---------- file: list.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Class List. List implements view to a dynamic list. Elements can
   * be added, removed and selected. The list expects all elements to have at least
   * the attribute 'name'.
   *
   * Minimal list element:
   *   { name: <name> }
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.MultiContainer, wdat.Container
   *
   * @returns {List}
   */
  wdat.List = (function() {

    List.inherits(wdat.MultiContainer);

    /**
     * Constructor for the class List.
     *
     * @param id (String, Obj)      The id of the list or a jQuery object.
     * @param bus (Bus)             Bus handling events.
     * @param actions (Obj, Array)  Set of actions with their respective events or callbacks.
     * @param categories (Array)    Array of all categories / groups of the list (optional).
     *
     * @constructor @this {List}
     */
    function List(id, bus, actions, categories) {
      List.parent.constructor.call(this, id, bus, actions, 'wdat-list', '<div>');
      // categories
      this._categories = {};
      for (var i in categories) {
        var cat = categories[i].toLowerCase();
        this._categories[cat] = strCapitalWords(cat, /[_\-\ \.:]/);
      }
      // actions for container elements
      this._contActions = {};
      for ( var i in actions) {
        var act = actions[i];
        if (wdat.Container.ACTIONS.indexOf(act) >= 0 && act != 'add') {
          this._contActions[act] = this._id + '-' + act;
        }
      }
      // apend self to dom
      this._jq.data(this);
      // refresh layout
      this.refresh();
    }

    /**
     * Add a new element to the list. If the element doesn't has id, a unique identifier
     * will be created.
     *
     * @param data (Obj)          The element to add to the list.
     * @param category (String)   The category (optional).
     *
     * @return The inserted element.
     */
    List.prototype.add = function(data, category) {
      var elem = List.parent.add.call(this, data, category);
      if (elem) {
        // create a container
        var id = this.toID(elem.id);
        var cont = new wdat.Container($('<li>').attr('id', id), this._bus, this._contActions);
        cont.set(elem);
        // get the right category
        var cat = category || 'default';
        cat = cat.toLowerCase();
        if (this._categories[cat]) {
          // found a matching category
          cat = this._jq.find('#' + this.toID(category));
        } else {
          // no category found, create a new one
          var label = strCapitalWords(cat, /[_\-\ \.:]/);
          this._categories[cat] = label;
          var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
          html.attr('id', this.toID(cat));
          html.find('.category-name').text(label);
          // create add button if add event is present
          if (this._actions.add) {
            var b = new wdat.Button(null, 'add_small', this._bus, this._actions.add, {
              name : label, id : cat});
            html.find('.category-name').before(b.jq());
          }
          // append everything
          var position = this._jq.find('#' + this.toID('default'));
          if (position.length > 0)
            position.before(html);
          else
            this._jq.append(html);
          cat = html;
        }
        // append container to the right category
        cat.append(cont.jq());
      }
      return elem;
    };

    /**
     * Add a new element to the list that is already wrapped into a container
     * TODO check call of parent add!
     *
     * @param cont (Container)   The element to add to the list.
     * @param category (String)  The category (optional).
     *
     * @return The inserted element.
     */
    List.prototype.addContainer = function(cont, category) {
      var data = cont.get();
      data = List.parent.add.call(this, data, category);
      if (data) {
        cont.jq().attr('id', this.toID(data));
        // get the right category
        var cat = category || 'default';
        cat = cat.toLowerCase();
        if (this._categories[cat]) {
          // found a matching category
          cat = this._jq.find('#' + this.toID(category));
        } else {
          // no category found, create a new one
          var label = strCapitalWords(cat, /[_\-\ \.:]/);
          this._categories[cat] = label;
          var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
          html.attr('id', this.toID(cat));
          html.find('.category-name').text(label);
          // create add button if add event is present
          if (this._actions.add) {
            var b = new wdat.Button(null, 'add_small', this._bus, this._actions.add, {
              name : label, id : cat});
            html.find('.category-name').before(b.jq());
          }
          // append everything
          var position = this._jq.find('#' + this.toID('default'));
          if (position.length > 0)
            position.before(html);
          else
            this._jq.append(html);
          cat = html;
        }
        // append container and return data object
        cat.append(cont.jq());
        return data;
      }
    };

    /**
     * Add new items to the list.
     *
     * @param datasets (Array)  The elements to add to the list.
     * @param category (String) The category (optional).
     *
     * @return The elements added to the list.
     */
    List.prototype.addAll = function(datasets, category) {
      var added = [];
      for ( var i in datasets) {
        var data = this.add(datasets[i], category);
        if (data) added.push(data);
      }
      return added;
    };

    /**
     * Update the content of an existing list element.
     *
     * @param data (Object)    The element to update.
     * @param category
     *
     * @return The updated element or null if no such element was found.
     */
    List.prototype.set = function(data, category) {
      if (this._data[data.id]) {
        var oldcat = this._data[data.id].position;
        var elem = List.parent.set.call(this, data, category);
        var newcat = this._data[data.id].position;
        if (elem) {
          var html = this._jq.find('#' + this.toID(elem));
          var cont = html.data();
          cont.set(elem);
          if (oldcat != newcat) {
            cont.detach();
            var cat;
            if (newcat && newcat != 'default') {
              cat = this._jq.find('#' + this.toID(newcat));
            } else {
              cat = this._jq.find('#' + this.toID('default'));
            }
            cat.append(cont.jq());
          }
        }
      }
    };

    /**
     * Remove an element from the list.
     *
     * @param data (String, Obj)    The element to remove or the id of this
     *                              element.
     *
     * @return The removed element or null if no such element was found.
     */
    List.prototype.del = function(data) {
      var deleted = List.parent.del.call(this, data);
      if (deleted) {
        var elem = this._jq.find('#' + this.toID(data));
        elem.remove();
        return true;
      }
    };

    /**
     * Select an element in the list. If the element is already selected
     * the selection will be removed (toggle).
     *
     * @param data (String, Obj)    The elements to select or the id of this
     *                              element.
     * @param single (Boolean)      Set to true if the selected element should be the
     *                              only selected element in the whole list.
     *
     * @return True if the element is now selected false otherwise.
     */
    List.prototype.select = function(data, single) {
      var selected = false;
      if (this.has(data)) {
        var html = this._jq.find('#' + this.toID(data));
        selected = html.is('.selected');
        if (single) {
          this._jq.find('.wdat-container').removeClass('selected');
        }
        html.toggleClass('selected', !selected);
        selected = !selected;
      }
      return selected;
    };

    /**
     * Clear the container and refresh its content.
     */
    List.prototype.clear = function() {
      delete this._data;
      delete this._categories;
      this._data = {};
      this._categories = {};
      this.refresh();
    };


    /**
     * Refresh or create the whole content of the container.
     */
    List.prototype.refresh = function() {
      // remove all content
      this._jq.empty();
      // crate category representation
      for ( var i in this._categories) {
        var cat = i;
        var label = this._categories[i];
        var html = $('<ul><lh class="category"><div class="category-name"></div></lh></ul>');
        html.attr('id', this.toID(cat));
        html.find('.category-name').text(label);
        // create add button if add event is present
        if (this._actions.add) {
          var b = new wdat.Button(null, 'add_small', this._bus, this._actions.add, {name : label, id : cat});
          html.find('.category-name').before(b.jq());
        }
        // append everything
        this._jq.append(html);
      }
      // add elements to list
      for (var i in this._data) {
        var elem = this._data[i].data;
        var category = this._data[i].position;
        // create a container
        var id = this.toID(elem.id);
        var cont = new wdat.Container($('<li>').attr('id', id), this._bus, this._contActions);
        cont.set(elem);
        // get the right category
        if (category && category != 'default') {
          html = this._jq.find('#' + this.toID(category));
        } else {
          html = this._jq.find('#' + this.toID('default'));
        }
        // append container to the right category
        html.append(cont.jq());
      }
    };

    /**
     * Crates a default handler function for select events.
     *
     * @return A default handler.
     */
    List.prototype.selHandler = function() {
      var that = this;
      return function(event, data) {
        that.select(data, true);
      };
    };

    /**
     * Crates a default handler function for delete events.
     *
     * @return A default handler.
     */
    List.prototype.delHandler = function() {
      var that = this;
      return function(event, data) {
        that.del(data);
      };
    };

    return List;
  })(); // end class List

})(wdat || (wdat = {}), jQuery); // end module wdat;

// ------------------ file: search_bar.js ---------//

var wdat; (function (wdat, $) {
  'use strict';

  /**
   * Class SearchBar
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button
   *
   * @returns {SearchBar}
   */
  wdat.SearchBar = (function() {
    SearchBar.inherits(wdat.Widget);

    /**
     * Constructor for the class SearchBar
     *
     * @param id
     * @param bus
     * @param search
     * @param activate
     *
     * @constructor @this {SearchBar}
     */
    function SearchBar(id, bus, search, activate) {
      SearchBar.parent.constructor.call(this, id, SearchBar.TEMPLATE, 'wdat-search');
      this._bus = bus;
      // initiate actions
      this._actions = {
              search: search || this._id + '-search',
              activate: activate || this._id + '-search',
              type: this._id + '-type',
              compose: this._id + '-compose'
      };
      this._presets = {};
      // initialize dom
      this._searchbar = $('<textarea rows="2" cols="30">');
      this._jq.find('.search-field').append(this._searchbar);
      this._searchbtn = new wdat.Button('search-btn', 'Search', bus,
                                        this._searchButtonHandler());
      this._jq.find('.search-btn').append(this._searchbtn.jq());
      this._activebox = $('<input type="checkbox" value="active" checked="checked">');
      this._activebox.click(this._activateBoxHandler());
      this._jq.find('.activate-btn').append(this._activebox).append('Apply filter rules');
    }

    /**
     * Get the event for a specific action.
     *
     * @param action (String)    The action name.
     *
     * @returns The event for the specific action or undefined.
     */
    SearchBar.prototype.event = function(action) {
      var act = this._actions[action];
      if (act && typeof action !== 'function')
        return act;
    };

    /**
     * Returns an object with information about the state and content of the search bar.
     *
     * Information object: {active: boolean, param: search_parameter }
     *
     * @return Object with information about the search field.
     */
    SearchBar.prototype.get = function() {
      // get active state
      var active = (this._activebox.val() == 'active') ? true : false;
      // parse params
      var str = this._searchbar.val();
      try {
        var param = this.parse(str);
        if (param.length == 0) {
          param = null;
        }
        return {active: active, param: param};
      } catch (e) {
        return {active: active, param: null, error: e};
      }
    };

    /**
     * Parse strings to search parameter suited for the DataAPI
     *
     * @param str (String)    The string to parse.
     *
     * @returns Array of search parameters.
     */
    SearchBar.prototype.parse = function(str) {
      var splitOR, splitAND, splitOp, error;
      var result = [];
      splitOR = str.split(/\s+[Oo][Rr]\s+|\|/);
      for (var i in splitOR) {
        var partResult = {};
        splitAND = splitOR[i].split(/\s+[Aa][Nn][Dd]\s+|,|&/);
        for (var j in splitAND) {
          splitOp = splitAND[j].split(/([<>=:])/);
          if (splitOp.length == 3) {
            var key = strTrim(splitOp[0]);
            var op  = strTrim(splitOp[1]);
            var val = strTrim(splitOp[2]);
            if (op == ':') op = '=';
            partResult[key] = [val, op];
          } else {
            error = 'Parsing of search parameters failes at substring "' +
                    splitAND[j] + '".';
            throw error;
          }
        }
        result.push(partResult);
      }
      return result;
    };

    SearchBar.prototype._searchButtonHandler = function() {
      var that = this;
      return function() {
        that._bus.publish(that._actions.search, that.get());
      };
    };

    SearchBar.prototype._activateBoxHandler = function() {
      var that = this;
      return function() {
        var val = that._activebox.val();
        if (val == "active") {
          that._searchbtn.disable(true);
          that._searchbar.attr('readonly', true);
          that._activebox.val('inactive');
        } else {
          that._searchbtn.disable(false);
          that._searchbar.attr('readonly', null);
          that._activebox.val('active');
        }
        that._bus.publish(that._actions.search, that.get());
      };
    };

    SearchBar.prototype._composeButtonHandler = function() {
      return function() {
        console.log('SearchBar._composeButtonHandler(): not implemented yet');
      };
    };

    SearchBar.TEMPLATE = '<div class="wdat-search"><div class="top-row">' +
                         '<div class="search-field"></div><div class="search-btn"></div>' +
                         '</div><div class="bottom-row"><div class="activate-btn"></div>' +
                         '<div class="compose-btn"></div></div></div>';

    return SearchBar;
  })(); // end class SearchBar

})(wdat || (wdat = {}), jQuery); // end module wdat

// ---------- file: section_container.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /*****************************************************************************************
   * Class SectionContainer.
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.Container
   *
   * @returns {SectionContainer}
   ****************************************************************************************/
  wdat.SectionContainer = (function() {

    SectionContainer.inherits(wdat.Container);

    /**
     * Constructor for class SectionContainer.
     *
     * @param id {string,Object}  Name/ID for this individual section view or a jQuery object representing
     *                            an empty div that will be used as the container for the view.
     * @param bus {Bus}           A bus handling events.
     *
     * @constructor @this {SectionContainer}
     */
    function SectionContainer(id, bus) {
      var empty = "No section selected";
      SectionContainer.parent.constructor.call(this, id, bus, null, 'section-container',
                                               SectionContainer.TEMPLATE, empty);
    }

    /**
     * Refresh the content (see wdat.Container).
     */
    SectionContainer.prototype.refresh = function() {
      // section overview
      var html = this._jq.children('.section').empty();
      if (this._data) {
        var val = objGetRecursive(this._data, 'name') || 'n.a.';
        var field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Name:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'odml_type') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Type:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'tree_position') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Position:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'description') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Description:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'safety_level') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Savety Level:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'date_created') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Date Created:');
        field.children('.field-val').text(val);
        html.append(field);
      } else {
        var field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-val').text(this._empty);
        html.append(field);
      }
    };

    SectionContainer.TEMPLATE = '<div><h1>Section</h1><div class="section"></div>' +
                                '<div class="properties"></div></div>';

    SectionContainer.FIELD_TEMPLATE = '<div class="field"><div class="field-name"></div>' +
                                    '<div class="field-val"></div></div>';

    return SectionContainer;
  })();

  /*****************************************************************************************
   * Constructor for the class PropertyContainer.
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.Container
   *
   * @returns {PropertyContainer}
   ****************************************************************************************/
  wdat.PropertyContainer = (function() {

    PropertyContainer.inherits(wdat.ParentContainer);

    /**
     * Constructor for the class PropertyContainer.
     *
     * @param id (String, Obj)   Name/ID for this property container or a jQuery object representing
     *                           an empty div that will be used as the container for the view.
     * @param bus (Bus)          A bus handling events.
     * @param act
     *
     * @constructor @this {PropertyContainer}
     */
    function PropertyContainer(id, bus, act) {
      PropertyContainer.parent.constructor.call(this, id, bus, act, 'property-container');
    }

    /**
     * Refresh the content (see wdat.ParentContainer).
     */
    PropertyContainer.prototype.refresh = function() {
      // create primary content
      var html = this._jq.children('.primary').empty();
      var val = this._data.name;
      html.append($('<span class="head">').text(val));
      html.append($('<span class="head-add">').text(' = '));
      for ( var i in this._children) {
        val = this._children[i].name;
        html.children('.head-add').append(i == 0 ? val : ', ' + val);
      }
      val = objGetRecursive(this._data, 'uncertainty');
      if (val)
        html.children('.head-add').append('; +/- ' + val);
      // create secondary content
      html = this._jq.children('.secondary').empty();
      val = '';
      for ( var i in this._children) {
        val += (i == 0 ? this._children[i].name : ', ' + this._children[i].name);
      }
      var field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Values:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'unit') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Unit:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'uncertainty') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Uncertainty:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'data_type') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Data Type:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'definition') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Definition:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'date_created') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Date Created:');
      field.children('.field-val').text(val);
      html.append(field);
      // create buttons
      html = this._jq.children('.buttons').empty();
      var btn;

      btn = new wdat.Button(null, 'more', this._bus, this._expandHandler());
      html.append(btn.jq());

      for ( var i in wdat.Container.ACTIONS) {
        var act = wdat.Container.ACTIONS[i];
        if (this._actions.hasOwnProperty(act)) {
          var click = this._actions[act];
          btn = new wdat.Button(null, act + '_small', this._bus, click, this._data);
          html.append(btn.jq());
        }
      }
    };

    /**
     * Refresh the content (see wdat.ParentContainer).
     */
    PropertyContainer.prototype.refreshChildren = function() {
      this.refresh();
    };

    return PropertyContainer;
  })();

})(wdat || (wdat = {}), jQuery);
// ---------- file: tab_folder.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Class TabFolder. A tab folder can display one of multiple
   * contents (tabs) inside a defined area. The folder provides functionality to switch
   * between all tabs and to remove and add tabs.
   *
   * Depends on: jQuery, wdat.Bus
   *
   * @returns {TabFolder}
   */
  wdat.TabFolder = (function() {

    TabFolder.inherits(wdat.MultiContainer);

    /**
     * Constructor for the class TabFolder.
     *
     * @param id (String, Obj)    The id of the list or a jQuery object.
     * @param bus (Bus)           Bus handling events.
     * @param hasControl (Bool)   If true the tab folder shows controls that allow to switch
     *                            between tabs.
     *
     * @constructor @this {TabFolder}
     */
    function TabFolder(id, bus, hasControl) {
      TabFolder.parent.constructor.call(this, id, bus, ['sel'], 'wdat-tab-folder', '<div>');
      this._hasControl = hasControl;
      if (this._hasControl) {
        this._control = $('<ul class="tab-navigation"></ul>');
        this._jq.append(this._control);
      }
      this._jq.data(this);
    }

    /**
     * Add a new tab to the folder.
     *
     * @param tab (jQuery)  jQuery object representing a block element as
     *                      the content of the tab.
     * @param id (String)   Individual identifier for the of the tab.
     *
     * @return The id of the new tab.
     */
    TabFolder.prototype.add = function(tab, id) {
      var data = TabFolder.parent.add.call(this, {id: id});
      if (data) {
        var label = strCapitalWords(id, /[_\-\ \.:]/);
        tab.addClass('tab-content');
        tab.attr('id', this.toID(id));
        this._jq.append(tab);
        // create control if needed and append tab
        if (this._control) {
          var control = $('<li></li>').text(label).attr('id', this.toID(id, 'control'));
          var that = this;
          control.click(function() {
            that._bus.publish(that.event('sel'), id);
          });
          this._control.append(control);
        }
        this.select(id);
        return id;
      }
    };

    /**
     * Replace the content of an existing tab.
     *
     * @param tab (jQuery)  jQuery object representing a block element as
     *                      the content of the tab.
     * @param id (String)   Individual identifier for the of the tab.
     */
    TabFolder.prototype.set = function(tab, id) {
      if (this.has(id)) {
        var html = this._jq.children('#' + this.toID(id));
        var selected = html.is('.selected');
        html.replaceWith(tab);
        tab.addClass('tab-content').toggleClass('selected', selected);
        tab.attr('id', this.toID(id));
      }
    };

    /**
     * Remove an existing tab.
     *
     * @param id (String)   Individual identifier for the of the tab.
     *
     * @return True if the tab was deleted, false otherwise.
     */
    TabFolder.prototype.del = function(id) {
      var deleted = TabFolder.parent.del.call(this, id);
      if (deleted) {
        var html = this._jq.children('#' + this.toID(id));
        var selected = html.is('.selected');
        html.remove();
        if (selected)
          this._jq.children('.tab-content').first().addClass('selected');
        if (this._control) {
          var control = this._control.children('#' + this.toID(id, 'control'));
          control.remove();
          if (selected)
            this._control.children().first().addClass('selected');
        }
      }
      return deleted;
    };

    /**
     * Select the tab to display.
     *
     * @param id (String)   Individual identifier for the of the tab.
     */
    TabFolder.prototype.select = function(id) {
      // deselect all other tabs
      this._jq.children('.tab-content').removeClass('selected');
      this._jq.children('#' + this.toID(id)).addClass('selected');
      if (this._control) {
        this._control.children().removeClass('selected');
        this._control.children('#' + this.toID(id, 'control')).addClass('selected');
      }
    };

    /**
     * Default select handler for selection events fired by the control panel.
     *
     * @return A handler function for select events.
     */
    TabFolder.prototype.selectHandler = function() {
      var that = this;
      return function(event, data) {
        that.select(data);
      };
    };

    return TabFolder;
  })(); // end class TabFolder

})(wdat || (wdat = {}), jQuery); // end module wdat

// ---------- file: tree.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";


  /*****************************************************************************************
   * Constructor for the class Tree. Tree implements view to a dynamic tree. Each node of
   * the tree can be expanded and collapsed. Further nodes can be appended and removed from
   * the tree.
   *
   * Minimal list element:
   *   {name: string}
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.MultiContainer, wdat.Container
   *
   * @returns {Tree}
   ****************************************************************************************/
  wdat.Tree = (function() {

    Tree.inherits(wdat.MultiContainer);

    /**
     * Constructor for the class Tree.
     *
     * @param id {string|Object}      The id of the list or a jQuery object.
     * @param bus {Bus}               Bus handling events.
     * @param actions {Object|Array}  Set of actions with their respective events or callbacks.
     *                                Common events are 'del', 'add', 'edit' and 'sel'.
     *                                An action 'expand' will be created automatically.
     *
     * @constructor @this {Tree}
     */
    function Tree(id, bus, actions) {
      Tree.parent.constructor.call(this, id, bus, actions, 'wdat-tree', '<div>');
      // actions for container elements
      this._contActions = {};
      for ( var i in actions) {
        var act = actions[i];
        if (wdat.Container.ACTIONS.indexOf(act) >= 0 && act != 'sel') {
          this._contActions[act] = this._id + '-' + act;
        }
      }
      // add mandatory events
      this._actions.expand = this.toID('expand');
    }

    /**
     * Add a new node to the tree. Elements of the tree are represented as a
     * object that must at least contain a property 'name'. If this object has
     * also a property 'id' this will be used as an identifier. Otherwise a unique
     * id will be chosen.
     *
     * @param data (Obj)            The element to add to the tree.
     * @param parent (String, Obj)  The is of the parent or the parent object. When
     *                              null the new element will be added to the root of
     *                              the tree (optional).
     * @param isLeaf {Boolean}     Indicates if the element should be displayed as a leaf
     *                              node. Leaf nodes don't fire expand/collapse events.
     *
     * @return The data of the element added to the tree.
     */
    Tree.prototype.add = function(data, parent, isLeaf) {
      var parent_id = null;
      if (this.has(parent)) {
        if (typeof parent ==  'object')
          parent_id = parent.id;
        else
          parent_id = parent;
      }
      var elem = Tree.parent.add.call(this, data, parent_id);
      if (elem) {
        var id = this.toID(data);
        var html = $(Tree.NODE_TEMPLATE).attr('id', id);
        var cont = new wdat.Container(null, this._bus, this._contActions, null, null, null, {prim: ['name'], sec: []});
        cont.set(elem);
        html.append(cont.jq());
        if (isLeaf)
          html.addClass('leaf-node');
        // fire expand events on click
        var that = this;
        html.children('.node-icon').click(function() {
          that._bus.publish(that._actions.expand, cont.get());
        });
        // fire select event when clicking on the node content
        if (this._actions.sel) {
          var that = this;
          cont.jq().children('.primary').click(function() {
            that._bus.publish(that._actions.sel, cont.get());
          });
        }
        // add data to the tree
        if (parent_id) {
          var p = this._jq.find('#' + this.toID(parent_id));
          p.append(html).removeClass('leaf-node');
        } else {
          this._jq.append(html);
        }
        // return element
        return elem;
      }
    };

    /**
     * Update the textual representation of a node.
     *
     * @param data (Obj)            The element to update.
     * @param parent (String, Obj)  The is of the parent or the parent object (optional).
     *                              This can be used to move a node/subtree.
     *
     * @return The updated data object or undefined if no such object was found.
     */
    Tree.prototype.set = function(data, parent) {
      var oldparent = this._data[data.id].position;
      var parent_id = null;
      if (this.has(parent)) {
        if (typeof parent ==  'object')
          parent_id = parent.id;
        else
          parent_id = parent;
      }
      var elem = Tree.parent.set.call(this, data, parent_id);
      if (elem) {
        var newparent = this._data[data.id].position;
        var node = this._jq.find('#' + this.toID(data));
        var cont = node.children('.wdat-container').data();
        cont.set(data);
        if (parent && oldparent != newparent) {
          node.detach();
          var parentnode = this._jq.find('#' + this.toID(newparent));
          parentnode.append(node).removeClass('leaf-node');
        }
        return elem;
      }
    };

    /**
     * Remove a node and all his children from the tree.
     *
     * @param data (Obj., String)   The element to delete or the id of this element.
     *
     * @returns True if the element was deleted, false otherwise.
     */
    Tree.prototype.del = function(data) {
      if (this.has(data)) {
        var removed = this.get(data);
        var node = this._jq.find('#' + this.toID(removed));
        var subtree = this._subtree(removed);
        for (var i in subtree) {
          delete this._data[subtree[i].id];
        }
        node.remove();
        return removed;
      }
    };

    /**
     * Remove all children of a node from the tree.
     *
     * @param data (Obj., String)   The element to delete or the id of this element.
     *
     * @returns The number of removed children.
     */
    Tree.prototype.delChildren = function(data) {
      var children = [];
      if (this.has(data)) {
        var elem = this.get(data);
        for (var i in this._data) {
          if (this._data[i].position == elem.id) {
            children.push(this._data[i].data);
          }
        }
        for (var i in children) {
          this.del(children[i]);
        }
      }
      return children.length;
    };

    /**
     * Select a specific leaf of the tree. If the element is already selected
     * it will be deselected.
     *
     * @param data (String, Obj)      The elements to select or the id of this
     *                                element.
     * @param single (Boolean)        If true all other currently selected nodes are
     *                                deselected.
     *
     * @return True if now selected, false otherwise.
     */
    Tree.prototype.select = function(data, single) {
      if (this.has(data)) {
        var node = this._jq.find('#' + this.toID(data));
        var cont = node.children('.wdat-container');
        var selected = cont.is('.selected');
        if (single) {
          this._jq.find('.tree-node').each(function() {
            var other = $(this).children('.wdat-container');
            other.removeClass('selected');
          });
        }
        cont.toggleClass('selected', !selected);
        return !selected;
      }
    };

    Tree.prototype.selected = function() {
      var html = this._jq.find('.tree-node > .selected');
      if (html.is('.wdat-container')) {
        var cont = html.data().get();
        return cont;
      }
    };

    /**
     * Expand a specific leaf of the tree. If the element is already expanded it will
     * be collapsed.
     *
     * @param data (String, Obj)  The elements to expand or the id of this
     *                            element.
     * @param single (Boolean)    If true all other currently expanded nodes are
     *                            collapsed.
     *
     * @return True if now expanded false otherwise.
     */
    Tree.prototype.expand = function(data, single) {
      // get the data and its selection status
      var node = this._jq.find('#' + this.toID(data));
      if (!node.is('.leaf-node')) {
        var collapsed = node.is('.collapsed');
        // if single, then unselect all
        if (single) {
          this._tree.find('.tree-node').each(function() {
            $(this).addClass('collapsed');
          });
        }
        node.toggleClass('collapsed', !collapsed);
        return !collapsed;
      }
    };

    /**
     * Checks if a node is expanded.
     *
     * @param data String, Obj.   The element to check or the id of the element.
     *
     * @return True if the element is expanded, false otherwise.
     */
    Tree.prototype.isExpanded = function(data) {
      // get the data and its selection status
      var node = this._jq.find('#' + this.toID(data));
      if (!node.is('.leaf-node')) {
        return !node.is('.collapsed');
      }
    };

    /**
     * Get a list of data objects/nodes that are in the subtree of another
     * data object/node (for internal use only).
     *
     * @param data (String, Obj)    The root elements of the subtree or the id of this
     *                              element.
     *
     * @return An array of data objects.
     */
    Tree.prototype._subtree = function(data) {
      var subtree = [];
      if (this.has(data)) {
        var root_id = data.id || data;
        var elem = this._data[root_id].data;
        var stack = [elem];
        while (stack.length > 0) {
          elem = stack.pop();
          for (var i in this._data) {
            if (this._data[i].position == elem.id) {
              stack.push(this._data[i].data);
            }
          }
          subtree.push(elem);
        }
      }
      return subtree;
    };

    /**
     * Crates a default handler function for select events.
     *
     * @return A default handler.
     */
    Tree.prototype.selHandler = function() {
      var that = this;
      return function(event, data) {
        that.select(data, true);
      };
    };

    /**
     * Crates a default handler function for expand events.
     *
     * @return A default handler.
     */
    Tree.prototype.expandHandler = function() {
      var that = this;
      return function(event, data) {
        that.expand(data);
      };
    };

    /**
     * Crates a default handler function for delete events.
     *
     * @return {Function} A default handler.
     */
    Tree.prototype.delHandler = function() {
      var that = this;
      return function(event, data) {
        that.del(data);
      };
    };

    Tree.NODE_TEMPLATE = '<div class="tree-node collapsed">' +
                         '<div class="node-icon"></div></div>';

    return Tree;
  })(); // end class Tree

})(wdat || (wdat = {}), jQuery); // end module wdat

// ---------- file: application.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  // global events
  var events = {
          sel_section: 'global-sel-section',
          sel_value: 'global-sel-value',
          sel_value_search: 'global-sel-value-search',
          search: 'global-search',
          sel_data: 'global-sel-data',
          plot: 'global-plot',
          manage: 'global-manage'
  };

  // global presenter objects
  var metadataTree;
  var searchView;
  var tabFolder;
  var metadataView;
  var dataView;
  var fileView;
  var selValueView;
  var selDataView;

  wdat.initialize = function() {
    var bus = new wdat.Bus();
    var api = new wdat.DataAPI('NetworkResource', 'ResourceAdapter', bus);
    // add metadata tree
    metadataTree = new wdat.MetadataTree($('#metadata-tree'), api, bus, events.sel_section);
    metadataTree.load();

    // add search bar
    searchView = new wdat.SearchView($('#search-bar'), bus, events.search, events.search);

    // add tab folder
    tabFolder = new wdat.TabFolder($('#tab-folder'), bus, true);
    bus.subscribe(tabFolder.event('sel'), tabFolder.selectHandler());

    // add metadata view
    var html = $('<div id="metadata-view"></div>');
    metadataView = new wdat.MetadataView(html, api, bus, events.sel_section);
    tabFolder.add(html, 'metadata-view', 'Info');

    // add data view
    html = $('<div id="data-view"></div>');
    dataView = new wdat.DataView(html, api, bus, events.sel_section, events.search);
    tabFolder.add(html, 'data-view', 'Data');

    // add file view
    html = $('<div id="file-view"></div>');
    fileView = new wdat.FileView(html, bus, events.sel_section, events.search);
    tabFolder.add(html, 'file-view', 'Files');

    // add selected values list
    html = $('#sel-value-view');
    selValueView = new wdat.SelectedValueView(html, bus, events.sel_value, events.sel_value_search);

    // add selected data list
    html = $('#sel-data-view');
    selDataView = new wdat.SelectedDataView(html, bus, events.sel_data, events.plot);

    wdat.adjustLayout();
  };

  // values for the layout
  var VSPACE_HEAD = 158;
  var VSPACE_SEARCH = 62;
  var VSPACE_TAB = 34;
  var VSPACE_CUSHION = 6;
  var VSPACE_SEL_VALUES = 240;
  var MOD_METADATA_TREE = 40;
  var MOD_SEL_DATA = 320;
  var MOD_METADATA_VIEW = 133;
  var MOD_DATA_VIEW = 174;
  var MOD_FILE_VIEW = 141;

  wdat.adjustLayout = function() {
    // TODO remove dummy
    var dummy = VSPACE_SEARCH + VSPACE_TAB;
    dummy += 1;
    // calculate heigths
    var w = $(window);
    var vspace = w.height() - VSPACE_HEAD;
    // vspace left
    metadataTree.tree.jq().css('height', vspace - VSPACE_CUSHION - MOD_METADATA_TREE);
    // vspace center
    metadataView._jq.css('height', vspace - VSPACE_CUSHION * 2 - MOD_METADATA_VIEW);
    dataView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_DATA_VIEW);
    fileView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_FILE_VIEW);
    // vspace right
    selValueView.list.jq().css('height', VSPACE_SEL_VALUES);
    selDataView.list.jq().css('height', vspace - VSPACE_CUSHION * 2 - MOD_SEL_DATA);
  };

})(wdat || (wdat = {}), jQuery);
// ---------- file: data_view.js ---------- //

var wdat; (function(wdat, $) {
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
   *  - jQuery, wdat.EventBus, wdat.Button, wdat.Container
   */
  wdat.DataView = DataView;
  function DataView(html, api, bus, selSection, searchEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-data-view');
    var navId = id + '-bread-crumb';
    var listId = id + '-ephys-list';
    this._jq = html;
    // initialize bread crumb
    this._nav = new wdat.BreadCrumb(navId, bus);
    this._nav.add({id: 'root', name: '>>'}, 0);
    this._jq.append(this._nav.jq());
    // initialize list
    this.list = new wdat.List(listId, bus, ['edit', 'del', 'sel']);
    this._jq.append(this.list.jq());
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
      update_all: id + '-udate-all',
      update_single: id + '-update-single'
    };
    // subscribe events
    bus.subscribe(selSection, this._selectSectionHandler());
    bus.subscribe(searchEvent, this._searchEventHandler());
    bus.subscribe(this._actions.update_all, this._updateAllHandler());
    bus.subscribe(this._actions.update_single, this._updateSingleHandler());
    bus.subscribe(this.list.event('sel'), this._selectDataHandler());
    bus.subscribe(this._nav.action, this._selectDataHandler());
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
      if (!(search instanceof Array))
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
      if (data && data.id) {
        that._nav.del(1);
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
      // TODO restrict condition for performance reasons
      that._requestData(that._actions.update_all);
    };
  };

  DataView.prototype._searchEventHandler = function() {
    var that = this;
    return function(event, data) {
      if (data) {
        that._nav.del(1);
        if (data.param) {
          that._searchParam = data.param;
        } else {
          that._searchParam = null;
        }
        if (data.active) {
          that._searchActive = true;
        } else {
          that._searchActive = false;
        }
      } else {
        that._searchParam = null;
        that._searchActive = false;
      }
      // TODO restrict condition for performance reasons
      that._requestData(that._actions.update_all);
    };
  };

  DataView.prototype._updateAllHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.response) {
        that.list.clear();
        for (var i in data.response) {
          that.list.add(data.response[i], data.response[i].type);
        }
      }
    };
  };

  DataView.prototype._updateSingleHandler = function() {
    var that = this;
    return function(event, data) {
      return that;
    };
  };

  DataView.prototype._selectDataHandler = function() {
    var that = this;
    return function(event, data) {
      if (data) {
        if (data.id == 'root') {
          that._requestData(that._actions.update_all);
        } else {
          // preinitialize search
          var search = [{}];
          if (that._searchActive && that._searchParam) {
            search = that._searchParam;
            if (typeof search == 'object')
              search = [search];
          }
          // create search
          search = _createSearchByDataSelected(search, data);
          if (search) {
            that._api.get(that._actions.update_all, search);
            var selected = that._nav.selected();
            if (selected.id != data.id)
              that._nav.add(data);
          }
        }
      }
    };
  };

  DataView.prototype._deleteDataHandler = function() {
    // TODO implement
  };



  DataView.prototype._editDataHandler = function() {
    // TODO implement
  };

  /*
   * Apply search on all data.
   */
  function _createSearchNoSelection(search) {
    // all ephys type names
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
//      if (!partSearch.hasOwnProperty('parent'))
//        partSearch.parent = "";
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

  /*
   * Apply search on all public data.
   */
  function _createSearchPublicAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
//      if (!partSearch.hasOwnProperty('parent'))
//        partSearch.parent = "";
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

  /*
   * Apply search on all shared data.
   */
  function _createSearchSharedAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
//      if (!partSearch.hasOwnProperty('parent'))
//        partSearch.parent = "";
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

  /*
   * Apply search on all own data.
   */
  function _createSearchOwnAll(search, user) {
    // all ephys types
    var types = modEphyTypes();
    // prepare search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
//      if (!partSearch.hasOwnProperty('parent'))
//        partSearch.parent = "";
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

  /*
   * Apply search on all public data.
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

  function _createSearchByDataSelected(search, data) {
    // parent data
    var parentId = data.id;
    var parentChildTypes = modChildren(data.type);
    // create search
    var searchCreated = [];
    for (var i in search) {
      var partSearch = search[i];
      partSearch.parent = parentId;
      if (partSearch.type) {
        searchCreated.push(partSearch);
      } else {
        for (var j in parentChildTypes) {
          if (data.children[j] && data.children[j].length > 0) {
            var cpySearch = {};
            jQuery.extend(true, cpySearch, partSearch);
            cpySearch.type = parentChildTypes[j].type;
            searchCreated.push(cpySearch);
          }
        }
      }
    }
    if (searchCreated.length > 0) {
      return searchCreated;
    }
  }

})(wdat || (wdat = {}), jQuery);
// ---------- file: file_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /*
   * Constructor for the presenter file view.
   * TODO documentation
   */
  wdat.FileView = FileView;
  function FileView(html, bus, selSection, searchEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-file-view');
    this._jq = html;
    // add list
    var listId = id + '-file-list';
    this.list = new wdat.List(listId, bus, ['sel']);
    this._jq.append(this.list.jq());
  }

})(wdat || (wdat = {}), jQuery);// ---------- file: main_content.js ---------- //

var wdat; (function() {
  'use strict';
  /* Constructor for the presenter MainContent. The presenter is the link
   * between the DataAPI and several viewers for sections, files an (neo) data
   * objects.
   *
   * Parameter:
   *  - id: String, Obj     String (id) or jQuery object that represents the container
   *                          that should contain the tree view.
   *
   *  - api: DataAPI          An initialized DataAPI object.
   *
   *  - bus: EventBus         Bus for broadcasting events.
   *
   * TODO update documentation
   *
   * Depends on:
   *    wdat.api.EventBus, wdat.api.DataAPI, ...
   */
  wdat.MainContent = MainContent;
  function MainContent(id, api, bus, selEvent, searchEvent) {
    // create tabs
    this._tabs = new wdat.TabFolder(id, bus, true);
    this._id = this._tabs.id();
    bus.subscribe(this._tabs.action, this._tabs.selectHandler());
    // properties
    this._api = api;
    this._bus = bus;
    this._actions = {sel : selEvent, search : searchEvent,
      get_sec : this._id + '-get-section', get_prp : this._id + '-get-property',
      get_val : this._id + '-get-value'};

    // create section view
    this._section = new wdat.SectionView(this._id + 'section', bus);
    this._tabs.add(this._section.jq(), 'tab-section', 'Metadata');
    bus.subscribe(this._actions.sel, this.sectionSelHandler());
    bus.subscribe(this._actions.get_sec, this.sectionSelHandler());
    bus.subscribe(this._actions.get_prp, this.sectionSelHandler());
    bus.subscribe(this._actions.get_val, this.sectionSelHandler());
    // creae data view
    this._tabs.add($('<div>Data</div>').css('padding', 4), 'tab-data', 'Data');
    // create file view
    this._tabs.add($('<div>Files</div>').css('padding', 4), 'tab-files', 'Files');
    // buffers
    this._sectionBuffer = {};
    this._sectionReqCount = 0;
  }

  MainContent.prototype.sectionSelHandler = function() {
    var that = this;
    return function(event, data) {
      // some shortcuts
      var ev = event.type;
      var sec = that._section;
      var act = that._actions;
      var api = that._api;
      console.log('EVENT: ' + ev + ';COUNT: ' + that._sectionReqCount + '; EVENT DATA: '
              + JSON.stringify(data.response || data));
      // handle events
      switch (ev) {
        // selection event from the metadata tree
        case act.sel:
          if (data && data.fields) {
            that._sectionReqCount = 1;
            that._sectionBuffer = {};
            sec.set(data);
            sec.setChildren([]);
            api.get(act.get_prp, {type : 'property', parent : data.id});
          } else {
            that._sectionReqCount = 0;
            sec.set(null);
          }
          break;
        // event when properties are recieved from the data api
        case act.get_prp:
          that._sectionBuffer.properties = {};
          that._sectionReqCount = 0;
          for ( var i in data.response) {
            var prop = data.response[i];
            var values = objGetRecursive(prop, 'value_set');
            that._sectionBuffer.properties[prop.id] = {property : prop, values : []};
            if (values && values.length > 0) {
              that._sectionReqCount += 1;
              api.get(act.get_val, {type : 'value', parent : prop.id});
            }
          }
          break;
        // event when values are recieved from the data api
        case act.get_val:
          that._sectionReqCount -= 1;
          for ( var i in data.response) {
            var val = data.response[i];
            var parentId = val.parents.parent_property;
            if (that._sectionBuffer.properties.hasOwnProperty(parentId)) {
              that._sectionBuffer.properties[parentId].values.push(val);
            }
          }
          break;
      }
      if (that._sectionReqCount == 0) {
        console.log('SECTION BUFFER: ' + JSON.stringify(that._sectionBuffer, null, 4));
        var props = [];
        for ( var i in that._sectionBuffer.properties) {
          props.push(that._sectionBuffer.properties[i]);
        }
        sec.setChildren(props);
        that._sectionBuffer = {};
      }
    };
  };

})(wdat || (wdat = {}), jQuery);
// ---------- file: metadata_tree.js ---------- //


var wdat; (function(wdat, $){
  'use strict';

  /**
   * Constructor for the presenter MetadataTree. The presenter is the link
   * between the DataAPI and the view Tree and populates the view and manages
   * updates on the model.
   *
   * @param html (jQuery)       A jQuery object that will be filled with the content of the
   *                            metadata tree.
   * @param api (DataAPI)       An initialized DataAPI object.
   * @param bus (Bus)           Bus for broadcasting events.
   * @param selEvent(String)    Event name for publishing selection events over the
   *                            event bus.
   * @param changeEvent(String) The presenter will listen on this event for changes in
   *                            the metadata tree.
   *
   * Depends on: wdat.Bus, wdat.Tree, wdat.DataAPI, wdat.Form
   *
   * FIXME maybe add a addContainer method to tree
   * FIXME create new edit delete button on bottom of the presenter.
   *
   */
  wdat.MetadataTree = MetadataTree;
  function MetadataTree(html, api, bus, selEvent, changeEvent) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-metadata-tree');
    var treeId = id += '-mdata-tree';
    this._jq = html;
    // create header
    this._jq.append('<h1>Metadata Browser</h1>');
    // create tree
    this.tree = new wdat.Tree(treeId, bus, ['sel', 'del', 'edit', 'add']);
    this._jq.append(this.tree.jq());
    // create buttons
    // define names for internal and external events
    this._actions = {
      sel:    selEvent,                     // selection events to notify external comonents
      save:   this.tree.id() + '-save',    // save events from forms
      load:   this.tree.id() + '-load',    // DataAPI response to load events
      update: this.tree.id() + '-update'   // DataAPI response to update events
    };
    // event used internally to react on DataAPI resonses
    this._api = api;
    this._bus = bus;
    // a form for section editing and creation
    this._updateEvent = this.tree.name + '-update';
    var formId = id += '-section-form';
    this._form = new wdat.Form(formId, bus, {save: this._actions.save}, 'section', true);
    this._form.set();
    // subscribe handlers for internal events
    this._bus.subscribe(this._actions.save, this._saveHandler());
    this._bus.subscribe(this._actions.update, this._updateHandler());
    this._bus.subscribe(this._actions.load, this._loadHandler());
    // subscribe handlers for tree events
    this._bus.subscribe(this.tree.event('del'), this._deleteHandler());
    this._bus.subscribe(this.tree.event('edit'), this._editHandler());
    this._bus.subscribe(this.tree.event('add'), this._editHandler());
    this._bus.subscribe(this.tree.event('expand'), this._expandHandler());
    // publish tree selections as external event
    this._bus.subscribe(this.tree.event('sel'), this._selectHandler());
  }

  /**
   * This method fetches initial data from DataAPI and initializes all
   * events and event handlers. Call this method once on start of the
   * Application.
   */
  MetadataTree.prototype.load = function() {
    for (var node in MetadataTree.PREDEF_NODES) {
      node = MetadataTree.PREDEF_NODES[node];
      this.tree.add(node, node.parent_id, node.isleaf);
    }
  };

  /**
   * Creates a handler for select events.
   *
   * @return A function that handles select events.
   */
  MetadataTree.prototype._selectHandler = function() {
    var that = this;
    return function(event, data) {
      that.tree.select(data.id, true);
      var selected = that.tree.selected();
      that._bus.publish(that._actions.sel, selected);
    };
  };

  /**
   * Crates a handler for expand events.
   * It requests missing children of a node from the DataAPI, the response of
   * the DataAPI will trigger a load event.
   *
   * @return A function that handles expand events.
   */
  MetadataTree.prototype._expandHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id;
      var search = null, info = null;
      if (_isPredefNode(id)) {
        if (id == 'own-metadata') {
          search = {type: 'section', parent: '', owner: '1'}; // TODO get real owner
          info = 'own-metadata';
        } else if (id == 'shared-metadata') {
          search = {type: 'section', parent: '', owner: ['1', '!='], safety_level: 'friendly'}; // TODO get real owner
          info = 'shared-metadata';
        } else if (id == 'public-metadata') {
          search = {type: 'section', parent: '', owner: ['1', '!='], safety_level: 'public'}; // TODO get real owner
          info = 'public-metadata';
        }
      } else {
        if (that.tree.isExpanded(id)) {
          that.tree.delChildren(id);
        } else {
          search = {type: 'section', parent: id};
        }
      }
      if (search) {
        that._api.get(that._actions.load, search, info);
      }
      that.tree.expand(id, false);
    };
  };

  /**
   * Crates a handler for edit events.
   *
   * @return A handler for edit events.
   */
  MetadataTree.prototype._editHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id;
      var f = that._form;
      f.set();
      if (!_isPredefNode(id)) {
        if (event.type == that.tree.event('add')) {
          f.set({parents: {parent_section: id}, type: 'section'});
        } else if (event.type == that.tree.event('edit')) {
          f.set(data);
        }
        f.open();
      } else if (id == 'own-metadata') {
        f.set({parent_section: null});
        f.open();
      }
    };
  };

  /**
   * Creates a handler for save events from the form.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * @return A function that handles save events.
   */
  MetadataTree.prototype._saveHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.set(that._actions.update, data);
      else
        that._api.set(that._actions.update, data);
    };
  };

  /**
   * Creates a handler for delete events from the tree.
   * The handler passes the delete request to the DataAPI,
   * which notifies events.update.
   *
   * @return A function that handles delete events.
   */
  MetadataTree.prototype._deleteHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.id)
        that._api.del(that._actions.update, data.id, data.id);
    };
  };

  /**
   * Creates a handler for delete events from the DataAPI.
   *
   * @return A function that handles update events.
   */
  MetadataTree.prototype._updateHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.action === 'del') {
        that.tree.del(data.info);
      } else if (data.action === 'set') {
        var elements = data.response;
        for (var i in elements) {
          var elem = elements[i];
          if (elem.parents && elem.parents.parent_section) {
            that.tree.add(elem, elem.parents.parent_section);
          } else {
            that.tree.add(elem, 'own-metadata');
          }
        }
      }
    };
  };

  /**
   * Creates a handler for load events fired by the DataAPI.
   *
   * @return A function that handles load events.
   */
  MetadataTree.prototype._loadHandler = function() {
    var that = this;
    return function(event, data) {
      if (!data.error) {
        for (var i in data.response) {
          i = data.response[i];
          if (data.info && _isPredefNode(data.info)) {
            that.tree.add(i, data.info);
          } else if (i.parents.parent_section) {
            that.tree.add(i, i.parents.parent_section);
          }
        }
      }
    };
  };

  /**
   * Helper function that determines if a node is a predefined node or not.
   *
   * @param id (String)      The id of a node
   *
   * @return True if the node is a predefined node, false otherwise.
   */
  function _isPredefNode(id) {
    var predef = false;
    for (var i in MetadataTree.PREDEF_NODES) {
      if (MetadataTree.PREDEF_NODES[i].id === id) {
        predef = true;
        break;
      }
    }
    return predef;
  }

  /**
   * Some predefined nodes that are loaded into the tree
   */
  MetadataTree.PREDEF_NODES = [
          {id: 'own-metadata', name: 'Metadata', parent_id: null},
          {id: 'own-all', name: 'All Data', parent_id: null, isleaf: true},
          {id: 'shared', name: 'Shared Objects', parent_id: null},
          {id: 'shared-metadata', name: 'Metadata', parent_id: 'shared'},
          {id: 'shared-all', name: 'All Data', parent_id: 'shared', isleaf: true},
          {id: 'public', name: 'Public Objects', parent_id: null},
          {id: 'public-metadata', name: 'Metadata', parent_id: 'public'},
          {id: 'public-all', name: 'All Data', parent_id: 'public', isleaf: true}
  ];

})(wdat || (wdat = {}), jQuery);

// ---------- file: metadata_view.js ---------- //

var wdat; (function(wdat, $){
  'use strict';

  /**
   * Constructor for the presenter MetadataView. The presenter displays a section and
   * all its properties in a nice view.
   *
   * @param html (jQuery)         A jQuery object that will be filled with the content of the
   *                              metadata view.
   * @param api (DataAPI)         An initialized DataAPI object.
   * @param bus (Bus)             Event name for publishing selection events over the
   *                              event bus.
   * @param selSelection (String) Event name for incoming selection events for sections.
   * @param selValue (String)     The presenter will publich this event when a value
   *                              was selected.
   *
   * Depends on: wdat.Bus, wdat.DataAI, wdat.SectionContainer, wdat.PropertyContainer, wdat.Form
   *
   * FIXME Properties are not properly updated when a new section is selected.
   * TODO Crate handlers for all events.
   */
  wdat.MetadataView = MetadataView;
  function MetadataView(html, api, bus, selSection, selValue) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-metadata-view');
    var secContId  = id + '-section';
    var propListId = id + '-properties';
    this._jq = html;
    // section container
    this._section = new wdat.SectionContainer(secContId, bus);
    this._section.refresh();
    html.append(this._section.jq());
    // property list
    var addProp = id + '-add-prop';
    this._properties = new wdat.List(propListId, bus, {add: addProp}, ['properties']);
    this._properties.refresh();
    html.append(this._properties.jq());
    // actions for propety container
    this._propActions = {
            del: id + '-del-prop',
            edit: id + '-edit-prop',
            select_val: selValue
    };
    // other actions for the presenter
    this._actions = {
            add_prop: addProp,
            save_prop: id + '-save-prop',
            update_all: id + '-update-all',
            update_prop: id + '-update-prop',
            update_sec: selSection
    };
    // bus and api
    this._bus = bus;
    this._api = api;
    // a form for property editing events
    var formId = id += '-property-form';
    this._form = new wdat.Form(formId, bus, {save: this._actions.save_prop},
                               'property', true);
    this._form.set();
    // subscribe event handlers
    bus.subscribe(selSection, this._selectSectionHandler());
    bus.subscribe(this._actions.update_all, this._updateAllHandler());
    bus.subscribe(this._actions.add_prop, this._addPropertyHandler());
    bus.subscribe(this._propActions.edit, this._editPropertyHandler());
    bus.subscribe(this._actions.save_prop, this._savePropertyHandler());
    bus.subscribe(this._actions.update_prop, this._updatePropertyHandler());
    bus.subscribe(this._propActions.del, this._delPropertyHandler());
  }

  /**
   * Crates an event handler that reacts on external selection events for sections.
   *
   * Triggers an 'update_all' event.
   *
   * @returns A handler for select events.
   */
  MetadataView.prototype._selectSectionHandler = function() {
    var that = this;
    return function(event, data) {
      if (data && data.id) {
        that._api.get(that._actions.update_all, {id: data.id, type: "section", depth: 2});
      } else {
        that._section.set();
        that._properties.clear();
      }
    };
  };

  /**
   * Crates an event handler that reacts on 'update_all' events. As data object the handler
   * expects a section with all its properties and values as returned by the DataAPI.
   *
   * Does not trigger any further events.
   *
   * @returns A handler for 'update_all' events.
   */
  MetadataView.prototype._updateAllHandler = function() {
    var that = this;
    return function(event, data) {
      var section = null;
      var properties = [];
      for (var i in data.response) {
        var elem = data.response[i];
        if (elem.type == 'section') {
          section = elem;
        } else if (elem.type == 'property') {
          var p = {property: elem, values: []};
          for (var j in elem.children.value_set) {
            var v = elem.children.value_set[j];
            p.values.push(data.response[v]);
          }
          properties.push(p);
        }
      }
      if (section) {
        that._section.set(section);
        that._properties.clear();
        for (var j in properties) {
          var p = properties[j].property;
          var v = properties[j].values;
          var cont = new wdat.PropertyContainer(p.id, that._bus, that._propActions);
          cont.set(p);
          cont.setChildren(v);
          that._properties.addContainer(cont, 'properties');
        }
      }
    };
  };

  /**
   * Creates an event handler that reacts on 'add_prop' events. It opens a form with
   * an empty property.
   *
   * The form opened by this handler may trigger an 'save_prop' event.
   *
   * @returns A handler for 'add_property' events.
   */
  MetadataView.prototype._addPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var p = that._section.get();
      var f = that._form;
      f.set();
      if (p && p.id) {
        var elem = modCreate('property');
        elem.parents._section = p.id;
        f.set(elem);
        f.open();
      }
    };
  };

  /**
   * Creates an event handler that reacts on 'edit_prop' events. It opens a form with
   * the property data that was published with the event.
   *
   * The form opened by this handler may trigger an 'save_prop' event.
   *
   * @returns A handler for 'edit_prop' events.
   */
  MetadataView.prototype._editPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var f = that._form;
      if (data && data.id) {
        f.set(data);
        f.open();
      }
    };
  };

  /**
   * Crates an event handler that reacts on 'save_prop' events. The handler calls the
   * DataAPI and tries to save the data passed along with the event.
   *
   * If saved sucessfully the DataAPI will trigger an 'update_prop' event.
   *
   * @returns A handler for 'save_prop' events.
   */
  MetadataView.prototype._savePropertyHandler = function() {
    var that = this;
    return function(event, data) {
      if (data && data.type == 'property') {
        that._api.set(that._actions.update_prop, data);
      }
    };
  };

  /**
   * Creates an event that reacts on 'update_prop' events. The handler will update the
   * property list using the data pased along with the event.
   *
   * Does not trigger any further events.
   *
   * @returns A handler for 'update_prop' events.
   */
  MetadataView.prototype._updatePropertyHandler = function() {
    var that = this;
    return function(event, data) {
      if (data.action == 'set') {
        var elements = data.response;
        for (var i in elements) {
          var elem = elements[i];
          if (that._properties.has(elem)) {
            that._properties.set(elem);
          } else {
            var cont = new wdat.PropertyContainer(elem.id, that._bus, that._propActions);
            cont.set(elem);
            cont.setChildren([]);
            that._properties.addContainer(cont, 'properties');
          }
        }
      } else if (data.action === 'del') {
        that._properties.del(data.param);
      }
    };
  };

  /**
   * Crates an event that reacts on 'del_prop' events. The handler calls
   * DataAPI.
   *
   * If the deletion was successful the handler will trigger an 'update_prop' event.
   *
   * @returns A handler for 'del_prop' events.
   */
  MetadataView.prototype._delPropertyHandler = function() {
    var that = this;
    return function(event, data) {
      var id = data.id || data;
      if (id) {
        that._api.del(that._actions.update_prop, id);
      }
    };
  };

})(wdat || (wdat = {}), jQuery);// ---------- file: search_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Constructor for the presenter search view.
   * TODO documentation
   */
  wdat.SearchView = SearchView;
  function SearchView(html, bus, search, activate) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-search-view');
    var searchId = id + '-bread-crumb';
    this._jq = html;
    // add header
    this._jq.append('<h1>Filter Rules</h1>');
    // initialize search bar
    this._search  = new wdat.SearchBar(searchId, bus, search, activate);
    this._jq.append(this._search.jq());
  }

})(wdat || (wdat = {}), jQuery);
// ---------- file: selected_data_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Constructor for the presenter for selected data.
   * TODO documentation
   */
  wdat.SelectedDataView = SelectedDataView;
  function SelectedDataView(html, bus, dataSelect, dataPlot) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-selected-data-view');
    this._jq = html;
    // add header
    this._jq.append('<h1>Selected Data</h1>');
    // add list
    var listId = id + '-value-list';
    this.list = new wdat.List(listId, bus, ['del', 'sel']);
    this._jq.append(this.list.jq());

    this.list.add({id: 'dummy', name: 'A NEO element'});
  }

})(wdat || (wdat = {}), jQuery);// ---------- file: selected_value_view.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /**
   * Constructor for the presenter for selected values.
   * TODO documentation
   */
  wdat.SelectedValueView = SelectedValueView;
  function SelectedValueView(html, bus, valSelect, valSearch) {
    var id = html.attr('id') || bus.uid();
    html.addClass('wdat-selected-value-view');
    this._jq = html;
    // add header
    this._jq.append('<h1>Selected Values</h1>');
    // add list
    var listId = id + '-value-list';
    this.list = new wdat.List(listId, bus, ['del', 'sel']);
    this._jq.append(this.list.jq());

    this.list.add({id: 'dummy', name: 'A value'});
  }

})(wdat || (wdat = {}), jQuery);var wdat;
(function(wdat, $) {

  wdat.hardcodeInterval = 2;

  wdat.hardcodeStyles = ['stroke:rgb(230, 20, 20)',
                         'stroke:rgb(20, 230, 20)',
                         'stroke:rgb(20, 20, 230)',
                         'stroke:rgb(230, 20, 230)',
                         'stroke:rgb(20, 230, 230)'];

  wdat.hardcodeSignals = [
          [-1.2207031e+01, -7.8125000e+00, -4.8828125e-01, 1.8066406e+01, 2.5878906e+01,
                  2.5390625e+01, 1.3671875e+01, 9.7656250e-01, -2.9296875e+00,
                  -2.4414062e+00, -1.0742188e+01, -5.3710938e+00, -1.4648438e+00,
                  -2.4414062e+00, -1.8554688e+01, -3.1250000e+01, -3.6621094e+01,
                  -3.5156250e+01, -3.3203125e+01, -5.2734375e+01, -6.2988281e+01,
                  -6.7871094e+01, -6.7871094e+01, -7.3242188e+01, -8.4472656e+01,
                  -8.7890625e+01, -9.2773438e+01, -9.4726562e+01, -9.1308594e+01,
                  -9.6679688e+01, -9.7656250e+01, -9.7656250e+01, -9.7656250e+01,
                  -9.9121094e+01, -1.0253906e+02, -9.1308594e+01, -9.0820312e+01,
                  -8.9843750e+01, -8.7890625e+01, -7.6171875e+01, -6.5429688e+01,
                  -5.6152344e+01, -5.5175781e+01, -4.7851562e+01, -2.9785156e+01,
                  -2.0996094e+01, -1.7578125e+01, -1.4648438e+00, 1.1230469e+01,
                  1.4160156e+01, 9.2773438e+00, 7.3242188e+00, 4.8828125e+00,
                  7.3242188e+00, 2.9296875e+00, 0.0000000e+00, -4.3945312e+00,
                  -2.0996094e+01, -2.9785156e+01, -2.6855469e+01, -3.1738281e+01,
                  -3.6132812e+01, -4.3945312e+01, -5.8593750e+01, -6.2500000e+01,
                  -6.5917969e+01, -7.8125000e+01, -8.7890625e+01, -9.0332031e+01,
                  -9.7656250e+01, -1.1230469e+02, -1.1328125e+02, -1.0595703e+02,
                  -1.0595703e+02, -1.1718750e+02, -1.2988281e+02, -1.3476562e+02,
                  -1.2744141e+02, -1.3037109e+02, -1.2890625e+02, -1.3232422e+02,
                  -1.2841797e+02, -1.2451172e+02, -1.1865234e+02, -1.1376953e+02,
                  -1.1767578e+02, -1.1669922e+02, -1.0937500e+02, -9.5214844e+01,
                  -8.2519531e+01, -7.6171875e+01, -7.7148438e+01, -8.1054688e+01,
                  -8.1542969e+01, -8.7402344e+01, -8.8867188e+01, -9.4726562e+01,
                  -1.0449219e+02, -1.0644531e+02, -1.0205078e+02, -1.0058594e+02,
                  -1.0498047e+02, -1.1083984e+02, -1.1718750e+02, -1.1962891e+02,
                  -1.2402344e+02, -1.2988281e+02, -1.3378906e+02, -1.3037109e+02,
                  -1.3818359e+02, -1.3623047e+02, -1.3720703e+02, -1.3574219e+02,
                  -1.3720703e+02, -1.3183594e+02, -1.3476562e+02, -1.3769531e+02,
                  -1.3964844e+02, -1.4453125e+02, -1.4990234e+02, -1.4843750e+02,
                  -1.4404297e+02, -1.3964844e+02, -1.3720703e+02, -1.3427734e+02,
                  -1.3134766e+02, -1.3476562e+02, -1.3085938e+02, -1.1181641e+02,
                  -9.0332031e+01, -8.9355469e+01, -9.0820312e+01, -8.3007812e+01,
                  -7.4707031e+01, -7.1777344e+01, -7.1777344e+01, -6.4453125e+01,
                  -6.7871094e+01, -7.0312500e+01, -7.0312500e+01, -6.6894531e+01,
                  -6.4453125e+01, -5.5175781e+01, -5.0781250e+01, -4.0527344e+01,
                  -3.0761719e+01, -3.0273438e+01, -3.2714844e+01, -2.1972656e+01,
                  -1.4648438e+00, 2.9296875e+00, 5.8593750e+00, 1.4648438e+01,
                  1.6601562e+01, 1.7578125e+01, 2.2949219e+01, 2.5878906e+01,
                  2.6367188e+01, 2.9296875e+01, 4.3945312e+01, 4.3945312e+01,
                  4.9804688e+01, 5.1757812e+01, 4.2968750e+01, 3.6132812e+01,
                  3.9550781e+01, 3.1250000e+01, 2.6855469e+01, 2.1972656e+01,
                  2.4414062e+01, 3.4667969e+01, 3.6132812e+01, 4.1503906e+01,
                  3.8574219e+01, 2.1484375e+01, 9.7656250e+00, 1.1230469e+01,
                  4.3945312e+00, 9.2773438e+00, -4.3945312e+00, -4.2480469e+01,
                  -9.2285156e+01, -1.4257812e+02, -1.6748047e+02, -1.8066406e+02,
                  -1.6748047e+02, -1.3476562e+02, -9.2773438e+01, -6.7382812e+01,
                  -2.6367188e+01, 2.5390625e+01, 5.9082031e+01, 7.1289062e+01,
                  5.1269531e+01, 3.0273438e+01, 7.8125000e+00, -1.5136719e+01,
                  -4.1503906e+01, -5.9082031e+01, -5.7128906e+01, -6.5429688e+01,
                  -6.8359375e+01, -9.4726562e+01, -1.2890625e+02, -1.3330078e+02,
                  -1.4404297e+02, -1.4892578e+02, -1.5722656e+02, -1.6552734e+02,
                  -1.8945312e+02, -1.9238281e+02, -1.9531250e+02, -2.0263672e+02,
                  -2.2998047e+02, -2.3193359e+02, -2.1435547e+02, -2.2607422e+02,
                  -2.3730469e+02, -2.2753906e+02, -2.1972656e+02, -2.2265625e+02,
                  -2.2900391e+02, -2.2363281e+02, -2.1435547e+02, -2.2216797e+02,
                  -2.3339844e+02, -2.3828125e+02, -2.3339844e+02, -2.4414062e+02,
                  -2.5097656e+02, -2.5195312e+02, -2.4707031e+02, -2.3242188e+02,
                  -2.1875000e+02, -2.1582031e+02, -2.1533203e+02, -2.2900391e+02,
                  -2.3876953e+02, -2.3242188e+02, -2.2119141e+02, -2.2363281e+02,
                  -2.2851562e+02, -2.1142578e+02, -1.9287109e+02, -2.0166016e+02,
                  -2.0556641e+02, -1.7968750e+02, -1.6162109e+02, -1.6601562e+02,
                  -1.6894531e+02, -1.6552734e+02, -1.7041016e+02, -1.7187500e+02,
                  -1.6113281e+02, -1.5820312e+02, -1.5625000e+02, -1.5429688e+02,
                  -1.5039062e+02, -1.4013672e+02, -1.2353516e+02, -9.4726562e+01,
                  -7.4707031e+01, -5.5175781e+01, -4.3457031e+01, -3.9062500e+01,
                  -3.2714844e+01, -4.8828125e+00, 1.7578125e+01, 3.8574219e+01,
                  5.6152344e+01, 7.2753906e+01, 9.0820312e+01, 1.0156250e+02,
                  1.1035156e+02, 1.2109375e+02, 1.4208984e+02, 1.5234375e+02,
                  1.6357422e+02, 1.7041016e+02, 1.6845703e+02, 1.4892578e+02,
                  1.2500000e+02, 1.0351562e+02, 7.9589844e+01, 5.4199219e+01,
                  3.7109375e+01, 4.5898438e+01, 5.6152344e+01, 6.6406250e+01,
                  6.7871094e+01, 5.7128906e+01, 5.2246094e+01, 4.3945312e+01,
                  2.8808594e+01, -2.4414062e+00, -3.1738281e+01, -3.7597656e+01,
                  -3.5644531e+01, -2.5390625e+01, -1.9531250e+01, -1.6113281e+01,
                  -1.5136719e+01, -1.2695312e+01, -1.1718750e+01, -1.9042969e+01,
                  -3.4667969e+01, -5.4687500e+01, -5.1757812e+01, -2.6367188e+01,
                  -1.7089844e+01, -1.9042969e+01, -2.4902344e+01, -2.7832031e+01,
                  -3.6132812e+01, -4.2480469e+01, -3.7109375e+01, -3.8085938e+01,
                  -3.1738281e+01, -2.8320312e+01, -1.6601562e+01, 4.8828125e+00,
                  1.2695312e+01, 9.7656250e-01, -1.8066406e+01, -3.8085938e+01,
                  -5.0292969e+01, -5.7128906e+01, -6.0058594e+01, -6.1523438e+01,
                  -7.2753906e+01, -6.5917969e+01, -5.6152344e+01, -4.3457031e+01,
                  -3.3203125e+01, -3.2226562e+01, -3.7597656e+01, -5.4199219e+01,
                  -6.8359375e+01, -6.8847656e+01, -6.8359375e+01, -6.1035156e+01,
                  -4.7851562e+01, -4.2968750e+01, -4.7851562e+01, -5.4687500e+01,
                  -4.6386719e+01, -3.7597656e+01, -4.1503906e+01, -4.3945312e+01,
                  -6.3476562e+01, -5.9570312e+01, -4.1992188e+01, -3.4179688e+00,
                  2.5390625e+01, 2.5878906e+01, 1.8066406e+01, -4.8828125e-01,
                  -2.0019531e+01, -2.5878906e+01, -3.2714844e+01, -2.3925781e+01,
                  -1.8554688e+01, -2.4414062e+01, -3.7109375e+01, -2.6367188e+01,
                  -1.6113281e+01, -2.1484375e+01, -2.7343750e+01, -3.5644531e+01,
                  -3.0273438e+01, -2.3437500e+01, -1.7578125e+01, 0.0000000e+00,
                  1.9531250e+01, 2.6855469e+01, 1.7089844e+01, 3.4179688e+00,
                  1.4648438e+01, 2.7832031e+01, 4.2968750e+01, 6.1035156e+01,
                  6.1035156e+01, 6.6894531e+01, 7.0312500e+01, 6.9824219e+01,
                  6.1523438e+01, 5.8593750e+01, 5.0292969e+01, 4.3457031e+01,
                  4.7851562e+01, 4.8339844e+01, 6.2011719e+01, 4.5898438e+01,
                  2.0996094e+01, -1.4648438e+00, -2.4902344e+01, -3.0761719e+01,
                  -2.3925781e+01, -8.3007812e+00, 1.9042969e+01, 5.3710938e+01,
                  7.7636719e+01, 7.7148438e+01, 7.1289062e+01, 5.8593750e+01,
                  4.4921875e+01, 4.7851562e+01, 4.3945312e+01, 4.2480469e+01,
                  5.3222656e+01, 6.9824219e+01, 9.6191406e+01, 1.1425781e+02,
                  1.1816406e+02, 1.1230469e+02, 1.0253906e+02, 9.6679688e+01,
                  7.9101562e+01, 6.2011719e+01, 5.1757812e+01, 5.0781250e+01,
                  5.0781250e+01, 3.4179688e+01, 2.0019531e+01, 4.8828125e-01,
                  -8.3007812e+00, -6.8359375e+00, -1.2207031e+01, -1.1230469e+01,
                  1.9531250e+00, 7.8125000e+00, 5.8593750e+00, 1.7578125e+01,
                  2.5390625e+01, 2.0996094e+01, 1.3671875e+01, 1.4648438e+00,
                  -5.3710938e+00, -1.6113281e+01, -1.7578125e+01, -2.0996094e+01,
                  -2.5390625e+01, -3.0761719e+01, -1.3183594e+01, -7.8125000e+00,
                  -2.4414062e+01, -3.6132812e+01, -4.3945312e+01, -5.2734375e+01,
                  -5.5175781e+01, -6.2988281e+01, -5.7128906e+01, -4.7363281e+01,
                  -4.7363281e+01, -4.1503906e+01, -3.5644531e+01, -2.3925781e+01,
                  -1.0742188e+01, -1.2207031e+01, -6.8359375e+00, 6.3476562e+00,
                  1.9531250e+01, 1.9042969e+01, 3.3691406e+01, 5.0292969e+01,
                  5.6640625e+01, 5.6152344e+01, 5.2734375e+01, 6.1035156e+01,
                  8.1542969e+01, 8.6425781e+01, 8.8378906e+01, 8.7402344e+01,
                  1.0156250e+02, 1.1767578e+02, 1.2158203e+02, 1.2646484e+02,
                  1.4062500e+02, 1.4257812e+02, 1.3281250e+02, 1.2548828e+02,
                  1.2158203e+02, 1.0986328e+02, 1.1328125e+02, 1.3427734e+02,
                  1.3916016e+02, 1.4306641e+02, 1.4892578e+02, 1.5380859e+02,
                  1.6552734e+02, 1.5966797e+02, 1.5332031e+02, 1.6210938e+02,
                  1.5478516e+02, 1.4892578e+02, 1.3818359e+02, 1.3134766e+02,
                  1.2353516e+02, 1.2255859e+02, 1.1718750e+02],
          [-6.3476562e+00, 6.8359375e+00, 2.0019531e+01, 2.5390625e+01, 2.9785156e+01,
                  3.7109375e+01, 3.4667969e+01, 2.8808594e+01, 2.1972656e+01,
                  1.8066406e+01, 9.7656250e+00, 3.4179688e+00, 1.8554688e+01,
                  2.5390625e+01, 2.7343750e+01, 3.6621094e+01, 3.3203125e+01,
                  3.2714844e+01, 4.0039062e+01, 3.6132812e+01, 2.3925781e+01,
                  2.4902344e+01, 2.9296875e+01, 2.6367188e+01, 2.0019531e+01,
                  1.9531250e+01, 2.0507812e+01, 2.4902344e+01, 1.8554688e+01,
                  7.8125000e+00, 4.8828125e+00, -4.8828125e+00, -1.4648438e+01,
                  -2.0019531e+01, -1.9042969e+01, -2.5390625e+01, -2.9785156e+01,
                  -4.4921875e+01, -5.0781250e+01, -6.3476562e+01, -6.8359375e+01,
                  -5.5664062e+01, -5.2734375e+01, -5.2246094e+01, -4.8828125e+01,
                  -5.1269531e+01, -6.2500000e+01, -6.9824219e+01, -6.5917969e+01,
                  -6.5429688e+01, -7.5683594e+01, -8.4472656e+01, -8.8867188e+01,
                  -8.4472656e+01, -8.5937500e+01, -8.5449219e+01, -8.8378906e+01,
                  -8.8378906e+01, -8.5937500e+01, -8.2031250e+01, -7.7636719e+01,
                  -7.4218750e+01, -7.4218750e+01, -6.3964844e+01, -5.3222656e+01,
                  -3.8574219e+01, -2.7343750e+01, -2.1972656e+01, -2.5390625e+01,
                  -2.2460938e+01, -3.0761719e+01, -4.1015625e+01, -3.4179688e+01,
                  -2.7343750e+01, -2.8808594e+01, -2.2460938e+01, -2.8808594e+01,
                  -4.0527344e+01, -4.1015625e+01, -5.1757812e+01, -6.2988281e+01,
                  -6.7871094e+01, -7.6171875e+01, -7.6171875e+01, -7.1289062e+01,
                  -5.8593750e+01, -5.9570312e+01, -7.1777344e+01, -8.1542969e+01,
                  -8.4472656e+01, -8.1054688e+01, -8.2031250e+01, -8.2031250e+01,
                  -7.8613281e+01, -7.2265625e+01, -6.6406250e+01, -7.1289062e+01,
                  -7.6171875e+01, -6.6894531e+01, -6.3476562e+01, -6.0058594e+01,
                  -5.1269531e+01, -4.3945312e+01, -3.0273438e+01, -2.1972656e+01,
                  -2.0019531e+01, -1.4648438e+01, -9.7656250e+00, -4.8828125e-01,
                  5.8593750e+00, 3.9062500e+00, -4.8828125e+00, -3.4179688e+00,
                  -1.4648438e+00, -8.7890625e+00, -2.0019531e+01, -2.6367188e+01,
                  -3.2714844e+01, -3.5644531e+01, -3.1738281e+01, -2.9296875e+01,
                  -2.1972656e+01, -2.7343750e+01, -2.1972656e+01, -7.3242188e+00,
                  3.4179688e+00, -1.4648438e+00, -6.3476562e+00, -7.8125000e+00,
                  -1.7089844e+01, -2.0996094e+01, -1.9042969e+01, -1.7089844e+01,
                  -1.2207031e+01, -9.7656250e+00, -9.2773438e+00, -6.8359375e+00,
                  -6.3476562e+00, -1.4648438e+00, -9.7656250e-01, -7.3242188e+00,
                  -8.7890625e+00, -1.3671875e+01, -5.8593750e+00, -9.7656250e-01,
                  -4.8828125e-01, -4.8828125e-01, 0.0000000e+00, 9.7656250e+00,
                  1.4648438e+01, 1.9042969e+01, 3.1250000e+01, 3.1250000e+01,
                  2.7832031e+01, 3.1738281e+01, 3.1738281e+01, 1.9042969e+01,
                  1.4648438e+01, 1.1230469e+01, 1.1718750e+01, 9.2773438e+00,
                  1.0742188e+01, 1.1718750e+01, 6.8359375e+00, 2.4414062e+00,
                  -1.4648438e+00, -9.7656250e+00, -2.0996094e+01, -2.4902344e+01,
                  -3.1250000e+01, -3.8085938e+01, -3.5644531e+01, -2.7832031e+01,
                  -2.5878906e+01, -2.9785156e+01, -3.5156250e+01, -4.3945312e+01,
                  -5.5664062e+01, -6.7871094e+01, -8.6425781e+01, -1.1621094e+02,
                  -1.5820312e+02, -2.0458984e+02, -2.2949219e+02, -2.1777344e+02,
                  -2.0019531e+02, -1.7138672e+02, -1.4257812e+02, -1.4501953e+02,
                  -1.5625000e+02, -1.6943359e+02, -1.8115234e+02, -1.8017578e+02,
                  -1.6210938e+02, -1.6162109e+02, -1.5625000e+02, -1.6064453e+02,
                  -1.3769531e+02, -1.6113281e+02, -1.6357422e+02, -1.6699219e+02,
                  -1.8212891e+02, -1.7773438e+02, -1.7236328e+02, -1.6845703e+02,
                  -1.4013672e+02, -1.6064453e+02, -1.9091797e+02, -2.0556641e+02,
                  -1.9824219e+02, -1.9970703e+02, -2.0214844e+02, -1.8652344e+02,
                  -1.8896484e+02, -1.8994141e+02, -1.9628906e+02, -1.9091797e+02,
                  -1.8505859e+02, -1.8310547e+02, -1.8408203e+02, -1.9091797e+02,
                  -1.9580078e+02, -2.0849609e+02, -2.1484375e+02, -2.0703125e+02,
                  -1.9824219e+02, -1.9384766e+02, -1.8505859e+02, -1.8212891e+02,
                  -1.5917969e+02, -1.6699219e+02, -1.7773438e+02, -1.4892578e+02,
                  -1.2646484e+02, -9.9609375e+01, -9.0332031e+01, -1.0498047e+02,
                  -1.0791016e+02, -9.1308594e+01, -7.4218750e+01, -8.2031250e+01,
                  -7.9589844e+01, -7.6171875e+01, -7.8613281e+01, -7.0312500e+01,
                  -8.1542969e+01, -8.6914062e+01, -8.4472656e+01, -9.5214844e+01,
                  -1.1865234e+02, -1.3330078e+02, -1.1865234e+02, -1.0546875e+02,
                  -1.0009766e+02, -8.7402344e+01, -6.3476562e+01, -5.9570312e+01,
                  -6.0058594e+01, -5.8593750e+01, -8.2031250e+01, -9.9609375e+01,
                  -9.0332031e+01, -7.8613281e+01, -5.7128906e+01, -3.9550781e+01,
                  -2.5390625e+01, -1.6113281e+01, -2.9296875e+00, 1.5625000e+01,
                  4.2968750e+01, 5.9570312e+01, 6.4453125e+01, 8.3984375e+01,
                  9.1308594e+01, 9.7656250e+01, 9.7656250e+01, 1.0253906e+02,
                  1.0302734e+02, 1.0009766e+02, 9.5703125e+01, 8.7402344e+01,
                  7.8125000e+01, 7.6171875e+01, 8.2031250e+01, 7.9101562e+01,
                  7.7148438e+01, 7.3730469e+01, 5.9082031e+01, 5.9082031e+01,
                  5.5664062e+01, 4.8339844e+01, 3.4179688e+01, 4.1503906e+01,
                  5.1757812e+01, 5.8593750e+01, 4.9316406e+01, 4.5898438e+01,
                  5.3710938e+01, 5.9082031e+01, 5.9082031e+01, 5.9570312e+01,
                  6.6894531e+01, 7.2265625e+01, 7.3242188e+01, 8.1054688e+01,
                  1.0107422e+02, 1.1083984e+02, 1.2451172e+02, 1.2548828e+02,
                  1.1718750e+02, 1.1083984e+02, 1.1279297e+02, 1.1816406e+02,
                  1.2597656e+02, 1.4746094e+02, 1.6552734e+02, 1.7187500e+02,
                  1.6796875e+02, 1.5332031e+02, 1.3574219e+02, 1.1962891e+02,
                  1.1279297e+02, 1.1767578e+02, 1.2988281e+02, 1.2646484e+02,
                  1.1621094e+02, 9.1308594e+01, 7.1289062e+01, 5.0781250e+01,
                  2.5390625e+01, 1.2207031e+01, 4.8828125e+00, -2.4414062e+00,
                  -4.8828125e-01, 4.8828125e+00, 1.9531250e+00, -1.0253906e+01,
                  -1.8066406e+01, -1.4160156e+01, 4.8828125e+00, 2.2460938e+01,
                  3.1250000e+01, 3.0761719e+01, 3.3203125e+01, 3.9550781e+01,
                  4.0527344e+01, 3.9062500e+01, 3.9062500e+01, 4.2968750e+01,
                  3.5644531e+01, 1.7089844e+01, 5.8593750e+00, 1.9531250e+00,
                  -5.3710938e+00, -2.2460938e+01, -1.5625000e+01, -4.8828125e+00,
                  3.9062500e+00, 3.4179688e+00, 3.9062500e+00, -7.8125000e+00,
                  -1.9042969e+01, -1.4648438e+01, -1.6601562e+01, -1.2695312e+01,
                  -3.4179688e+00, -3.9062500e+00, -3.4179688e+00, -5.3710938e+00,
                  -8.3007812e+00, 1.1718750e+01, 2.7343750e+01, 3.3691406e+01,
                  3.3691406e+01, 2.8320312e+01, 2.7832031e+01, 4.1015625e+01,
                  4.2480469e+01, 3.3691406e+01, 2.3437500e+01, 1.6113281e+01,
                  3.4179688e+00, -1.8066406e+01, -3.0761719e+01, -4.2480469e+01,
                  -5.9082031e+01, -6.2500000e+01, -7.5195312e+01, -7.9589844e+01,
                  -8.1542969e+01, -9.0820312e+01, -1.0351562e+02, -1.0107422e+02,
                  -8.1542969e+01, -7.3242188e+01, -7.4707031e+01, -8.3007812e+01,
                  -9.9609375e+01, -1.0302734e+02, -1.0693359e+02, -8.2519531e+01,
                  -6.7382812e+01, -5.1269531e+01, -6.2988281e+01, -7.9589844e+01,
                  -7.4707031e+01, -8.0566406e+01, -8.8867188e+01, -9.2773438e+01,
                  -9.5703125e+01, -9.0820312e+01, -8.4960938e+01, -7.4218750e+01,
                  -6.3964844e+01, -6.9335938e+01, -8.1054688e+01, -9.0820312e+01,
                  -9.4238281e+01, -1.0205078e+02, -9.3750000e+01, -8.5449219e+01,
                  -7.4218750e+01, -5.5664062e+01, -5.4687500e+01, -5.9570312e+01,
                  -5.0292969e+01, -2.9296875e+01, -1.5625000e+01, -8.3007812e+00,
                  -4.8828125e-01, 2.9296875e+00, 2.1972656e+01, 4.0527344e+01,
                  5.1269531e+01, 5.4687500e+01, 6.9335938e+01, 8.1542969e+01,
                  8.5449219e+01, 8.8867188e+01, 9.1308594e+01, 1.0058594e+02,
                  1.1328125e+02, 1.2597656e+02, 1.3232422e+02, 1.5185547e+02,
                  1.6503906e+02, 1.6992188e+02, 1.6992188e+02, 1.7675781e+02,
                  1.7626953e+02, 1.8261719e+02, 1.9921875e+02, 2.1386719e+02,
                  2.3095703e+02, 2.3828125e+02, 2.4365234e+02, 2.5634766e+02,
                  2.5878906e+02, 2.4707031e+02, 2.3486328e+02, 2.3242188e+02,
                  2.3535156e+02, 2.4023438e+02, 2.4853516e+02, 2.4560547e+02,
                  2.4462891e+02, 2.3632812e+02, 2.3925781e+02, 2.5097656e+02,
                  2.5732422e+02, 2.7099609e+02, 2.8320312e+02, 2.8417969e+02,
                  2.8173828e+02, 2.8759766e+02, 2.8857422e+02, 2.8076172e+02,
                  2.6074219e+02, 2.3632812e+02, 2.0703125e+02, 1.8994141e+02,
                  1.8457031e+02, 1.6357422e+02, 1.4892578e+02, 1.3916016e+02,
                  1.3330078e+02, 1.3427734e+02, 1.2792969e+02, 1.0888672e+02,
                  9.9121094e+01, 1.0791016e+02, 1.2695312e+02, 1.3671875e+02,
                  1.3916016e+02, 1.4941406e+02, 1.5917969e+02, 1.5869141e+02,
                  1.6064453e+02, 1.2890625e+02, 1.0205078e+02],
          [-1.1669922e+02, -1.0253906e+02, -9.6191406e+01, -8.6425781e+01,
                  -7.2265625e+01, -6.1523438e+01, -5.4199219e+01, -5.2246094e+01,
                  -5.1269531e+01, -4.1015625e+01, -3.7597656e+01, -3.8085938e+01,
                  -3.4179688e+01, -2.2460938e+01, -8.3007812e+00, -4.8828125e-01,
                  3.4179688e+00, 9.7656250e-01, 1.0253906e+01, 1.4160156e+01,
                  2.2460938e+01, 3.3203125e+01, 3.9062500e+01, 4.6875000e+01,
                  5.9570312e+01, 6.4453125e+01, 6.5429688e+01, 7.7636719e+01,
                  9.3750000e+01, 9.9609375e+01, 1.0253906e+02, 1.0351562e+02,
                  1.0498047e+02, 1.1181641e+02, 1.0986328e+02, 1.1230469e+02,
                  1.1279297e+02, 1.1328125e+02, 1.2109375e+02, 1.3037109e+02,
                  1.3281250e+02, 1.3476562e+02, 1.4160156e+02, 1.5576172e+02,
                  1.5478516e+02, 1.5332031e+02, 1.5136719e+02, 1.5234375e+02,
                  1.5185547e+02, 1.4990234e+02, 1.4794922e+02, 1.5332031e+02,
                  1.6113281e+02, 1.6455078e+02, 1.6796875e+02, 1.6210938e+02,
                  1.5673828e+02, 1.4599609e+02, 1.5087891e+02, 1.5332031e+02,
                  1.4794922e+02, 1.3964844e+02, 1.3281250e+02, 1.3671875e+02,
                  1.4306641e+02, 1.3476562e+02, 1.1865234e+02, 1.0595703e+02,
                  1.0253906e+02, 1.0937500e+02, 1.0302734e+02, 9.4238281e+01,
                  9.7656250e+01, 9.0332031e+01, 9.0332031e+01, 9.3750000e+01,
                  8.9843750e+01, 8.3984375e+01, 7.5195312e+01, 7.3730469e+01,
                  6.3476562e+01, 6.1035156e+01, 6.6406250e+01, 6.2500000e+01,
                  6.0546875e+01, 6.2011719e+01, 4.9316406e+01, 4.2968750e+01,
                  4.6386719e+01, 4.1503906e+01, 3.3691406e+01, 3.2226562e+01,
                  2.2949219e+01, 8.3007812e+00, 1.0742188e+01, 8.3007812e+00,
                  3.4179688e+00, 5.8593750e+00, 1.0253906e+01, 6.8359375e+00,
                  4.8828125e+00, 1.0742188e+01, 1.6113281e+01, 1.2695312e+01,
                  7.3242188e+00, 3.4179688e+00, -8.3007812e+00, -1.7089844e+01,
                  -2.4902344e+01, -2.2460938e+01, -1.7578125e+01, -2.0507812e+01,
                  -2.0507812e+01, -1.0742188e+01, -6.8359375e+00, -1.2695312e+01,
                  -7.8125000e+00, -1.0742188e+01, -6.3476562e+00, 9.7656250e+00,
                  2.3925781e+01, 3.2714844e+01, 3.9550781e+01, 3.8085938e+01,
                  3.9062500e+01, 5.6640625e+01, 5.4687500e+01, 4.5410156e+01,
                  4.7363281e+01, 5.3710938e+01, 5.8593750e+01, 6.4941406e+01,
                  6.3476562e+01, 6.8359375e+01, 6.7871094e+01, 6.2988281e+01,
                  6.3476562e+01, 6.0546875e+01, 6.5917969e+01, 6.1035156e+01,
                  5.1757812e+01, 4.9804688e+01, 5.4199219e+01, 5.7128906e+01,
                  5.0781250e+01, 4.3457031e+01, 4.4433594e+01, 3.8574219e+01,
                  2.8808594e+01, 2.4414062e+01, 2.0019531e+01, 1.6113281e+01,
                  1.1230469e+01, 8.7890625e+00, 1.9531250e+00, -7.8125000e+00,
                  -1.3183594e+01, -2.4414062e+01, -2.8320312e+01, -2.3925781e+01,
                  -2.0996094e+01, -1.8554688e+01, -2.2460938e+01, -3.0273438e+01,
                  -4.0039062e+01, -5.3222656e+01, -5.4199219e+01, -4.9804688e+01,
                  -5.5664062e+01, -6.2011719e+01, -6.1035156e+01, -6.2988281e+01,
                  -6.2011719e+01, -5.9570312e+01, -6.3964844e+01, -6.5917969e+01,
                  -7.5195312e+01, -8.0566406e+01, -9.0332031e+01, -1.0693359e+02,
                  -1.5429688e+02, -2.2265625e+02, -2.8417969e+02, -3.2324219e+02,
                  -3.1445312e+02, -2.8417969e+02, -2.7832031e+02, -2.6416016e+02,
                  -2.2314453e+02, -1.7529297e+02, -1.4697266e+02, -1.4843750e+02,
                  -1.5820312e+02, -1.6601562e+02, -1.6455078e+02, -1.5283203e+02,
                  -1.5087891e+02, -1.4257812e+02, -1.1425781e+02, -1.2109375e+02,
                  -1.6992188e+02, -2.0947266e+02, -2.4511719e+02, -2.2998047e+02,
                  -2.2412109e+02, -2.3535156e+02, -2.5244141e+02, -2.5097656e+02,
                  -2.5683594e+02, -2.6904297e+02, -2.6513672e+02, -2.5781250e+02,
                  -2.4707031e+02, -2.4316406e+02, -2.5976562e+02, -2.5683594e+02,
                  -2.5976562e+02, -2.5927734e+02, -2.4462891e+02, -2.3095703e+02,
                  -2.0263672e+02, -2.0263672e+02, -2.2119141e+02, -2.0605469e+02,
                  -1.9531250e+02, -1.8750000e+02, -1.9384766e+02, -1.8798828e+02,
                  -1.8115234e+02, -1.8212891e+02, -1.8847656e+02, -1.7871094e+02,
                  -1.6113281e+02, -1.6748047e+02, -1.7138672e+02, -1.6601562e+02,
                  -1.4599609e+02, -1.4160156e+02, -1.4794922e+02, -1.6015625e+02,
                  -1.6406250e+02, -1.6992188e+02, -1.8212891e+02, -1.6748047e+02,
                  -1.4257812e+02, -1.2988281e+02, -1.1279297e+02, -8.9355469e+01,
                  -8.6425781e+01, -9.5703125e+01, -9.7656250e+01, -7.9589844e+01,
                  -7.2753906e+01, -7.3242188e+01, -6.9824219e+01, -5.5664062e+01,
                  -5.2246094e+01, -5.3222656e+01, -5.2246094e+01, -4.6386719e+01,
                  -3.7109375e+01, -5.0292969e+01, -7.3242188e+01, -8.0566406e+01,
                  -6.2988281e+01, -7.2265625e+01, -7.2753906e+01, -6.5429688e+01,
                  -6.1523438e+01, -7.5683594e+01, -8.5449219e+01, -7.8125000e+01,
                  -5.8593750e+01, -3.6621094e+01, -2.3437500e+01, -2.7343750e+01,
                  -2.8320312e+01, -2.5390625e+01, -2.0507812e+01, 5.3710938e+00,
                  3.4179688e+01, 6.2011719e+01, 6.5917969e+01, 6.1035156e+01,
                  6.0546875e+01, 5.7617188e+01, 5.7617188e+01, 5.9570312e+01,
                  6.3476562e+01, 5.1269531e+01, 2.7832031e+01, 7.8125000e+00,
                  -9.7656250e+00, -1.8554688e+01, -2.2949219e+01, -3.2226562e+01,
                  -3.8085938e+01, -3.7109375e+01, -3.1250000e+01, -5.3222656e+01,
                  -7.2265625e+01, -7.7636719e+01, -5.7617188e+01, -2.9296875e+01,
                  -1.4648438e+00, -1.1230469e+01, -2.9296875e+01, -2.7343750e+01,
                  -1.1718750e+01, 8.7890625e+00, 2.5878906e+01, 3.5156250e+01,
                  5.0292969e+01, 7.3242188e+01, 8.5449219e+01, 9.7656250e+01,
                  1.0839844e+02, 1.1035156e+02, 1.1816406e+02, 1.2597656e+02,
                  1.2500000e+02, 1.0351562e+02, 8.5937500e+01, 8.4472656e+01,
                  8.0078125e+01, 7.5683594e+01, 8.1542969e+01, 7.8613281e+01,
                  7.5195312e+01, 6.2500000e+01, 4.5410156e+01, 1.0253906e+01,
                  -1.3671875e+01, -2.7832031e+01, -2.8320312e+01, -1.9531250e+01,
                  -3.0761719e+01, -2.6367188e+01, -1.9531250e+01, -1.9531250e+01,
                  -1.9042969e+01, -9.2773438e+00, -1.9531250e+00, -5.8593750e+00,
                  -1.9042969e+01, -1.3671875e+01, -1.2695312e+01, -1.5625000e+01,
                  -1.0253906e+01, -7.8125000e+00, -2.1484375e+01, -2.8808594e+01,
                  -4.2968750e+01, -3.6621094e+01, -1.0253906e+01, 8.3007812e+00,
                  1.4648438e+01, -2.4414062e+00, -2.3925781e+01, -1.6113281e+01,
                  -7.3242188e+00, 8.7890625e+00, 1.0253906e+01, 1.6113281e+01,
                  2.7832031e+01, 2.3925781e+01, 3.1250000e+01, 2.7343750e+01,
                  3.5156250e+01, 5.6152344e+01, 6.1035156e+01, 6.5917969e+01,
                  6.7871094e+01, 5.3222656e+01, 4.8339844e+01, 3.9062500e+01,
                  3.9550781e+01, 4.4433594e+01, 5.5175781e+01, 6.4453125e+01,
                  7.7636719e+01, 8.1054688e+01, 6.9335938e+01, 5.6152344e+01,
                  5.3222656e+01, 4.1992188e+01, 3.0273438e+01, 2.9296875e+01,
                  3.2226562e+01, 1.8554688e+01, 1.9042969e+01, 2.0019531e+01,
                  1.2695312e+01, -3.9062500e+00, -2.7343750e+01, -2.5878906e+01,
                  -1.3671875e+01, 1.2207031e+01, 3.5156250e+01, 3.2226562e+01,
                  1.3183594e+01, 0.0000000e+00, -1.8066406e+01, -2.1972656e+01,
                  -1.1230469e+01, 2.9296875e+00, 1.6601562e+01, 1.9531250e+01,
                  3.4667969e+01, 4.1015625e+01, 4.1992188e+01, 4.5898438e+01,
                  4.1503906e+01, 5.3222656e+01, 6.6406250e+01, 6.7382812e+01,
                  7.8125000e+01, 9.1796875e+01, 8.8867188e+01, 9.6679688e+01,
                  9.7656250e+01, 1.0156250e+02, 9.3261719e+01, 1.0253906e+02,
                  1.1328125e+02, 1.2646484e+02, 1.4550781e+02, 1.6113281e+02,
                  1.6601562e+02, 1.6064453e+02, 1.6406250e+02, 1.6162109e+02,
                  1.5429688e+02, 1.5380859e+02, 1.5087891e+02, 1.3281250e+02,
                  1.1328125e+02, 1.0791016e+02, 1.0302734e+02, 1.0156250e+02,
                  1.1914062e+02, 1.3671875e+02, 1.5429688e+02, 1.6308594e+02,
                  1.6845703e+02, 1.7822266e+02, 1.8847656e+02, 1.8408203e+02,
                  1.8603516e+02, 1.9189453e+02, 1.8115234e+02, 1.6796875e+02,
                  1.5039062e+02, 1.3232422e+02, 1.2402344e+02, 1.2402344e+02,
                  1.3525391e+02, 1.3330078e+02, 1.3232422e+02, 1.3427734e+02,
                  1.2597656e+02, 1.3476562e+02, 1.4160156e+02, 1.6210938e+02,
                  1.8212891e+02, 1.9042969e+02, 1.9824219e+02, 2.2070312e+02,
                  2.2265625e+02, 2.1972656e+02, 2.3486328e+02, 2.4218750e+02,
                  2.4462891e+02, 2.4707031e+02, 2.3144531e+02, 1.9921875e+02,
                  1.6162109e+02, 1.2939453e+02, 1.0400391e+02, 7.8613281e+01,
                  4.6875000e+01, 1.8066406e+01, 4.8828125e-01, 4.3945312e+00,
                  2.5390625e+01, 1.9531250e+01, -1.6113281e+01, -4.9804688e+01,
                  -6.0546875e+01, -6.9824219e+01, -8.8378906e+01, -9.2773438e+01,
                  -8.8378906e+01, -8.9355469e+01, -8.3496094e+01, -7.8125000e+01,
                  -5.5664062e+01, -3.9550781e+01, -4.0039062e+01, -3.2226562e+01],
          [-1.1621094e+02, -1.1865234e+02, -1.2207031e+02, -1.2158203e+02,
                  -1.1865234e+02, -1.2744141e+02, -1.3818359e+02, -1.4257812e+02,
                  -1.3818359e+02, -1.3867188e+02, -1.2792969e+02, -1.2109375e+02,
                  -1.2646484e+02, -1.2792969e+02, -1.1914062e+02, -1.2207031e+02,
                  -1.1816406e+02, -1.0839844e+02, -9.7656250e+01, -1.0058594e+02,
                  -1.0205078e+02, -9.5214844e+01, -9.9609375e+01, -1.0107422e+02,
                  -9.4238281e+01, -8.6425781e+01, -8.0566406e+01, -8.4960938e+01,
                  -8.4960938e+01, -8.4472656e+01, -8.2031250e+01, -7.2265625e+01,
                  -7.5195312e+01, -7.8613281e+01, -7.7148438e+01, -6.9824219e+01,
                  -6.5917969e+01, -5.8593750e+01, -4.4433594e+01, -2.8808594e+01,
                  -1.2207031e+01, 2.9296875e+00, 9.2773438e+00, 1.1230469e+01,
                  1.1230469e+01, 8.7890625e+00, 1.1718750e+01, 1.1718750e+01,
                  5.3710938e+00, -4.3945312e+00, -1.1230469e+01, -2.0019531e+01,
                  -3.1250000e+01, -4.0527344e+01, -5.2246094e+01, -6.7871094e+01,
                  -7.7636719e+01, -7.7148438e+01, -7.7636719e+01, -8.7402344e+01,
                  -1.0156250e+02, -1.0742188e+02, -1.0742188e+02, -1.0546875e+02,
                  -1.0888672e+02, -1.1376953e+02, -1.1572266e+02, -1.1425781e+02,
                  -1.1572266e+02, -1.2451172e+02, -1.1132812e+02, -9.8632812e+01,
                  -9.5214844e+01, -8.4472656e+01, -6.6894531e+01, -5.5175781e+01,
                  -4.6386719e+01, -3.9550781e+01, -2.6367188e+01, -1.2695312e+01,
                  -5.3710938e+00, -6.8359375e+00, -7.8125000e+00, 0.0000000e+00,
                  5.8593750e+00, 0.0000000e+00, 5.8593750e+00, 2.1484375e+01,
                  3.7597656e+01, 4.1503906e+01, 3.9062500e+01, 4.3457031e+01,
                  4.4433594e+01, 5.4199219e+01, 5.9082031e+01, 6.3964844e+01,
                  6.3964844e+01, 6.8359375e+01, 7.2265625e+01, 7.1289062e+01,
                  6.6894531e+01, 5.7128906e+01, 5.4199219e+01, 4.7851562e+01,
                  3.4179688e+01, 3.2714844e+01, 2.3437500e+01, 1.4160156e+01,
                  -4.8828125e-01, -1.3671875e+01, -1.3671875e+01, -1.4648438e+01,
                  -2.0019531e+01, -3.6132812e+01, -4.1503906e+01, -4.2480469e+01,
                  -3.9062500e+01, -3.5644531e+01, -3.9062500e+01, -2.8808594e+01,
                  -2.4902344e+01, -2.6855469e+01, -3.0761719e+01, -3.4667969e+01,
                  -2.6367188e+01, -2.3437500e+01, -2.7343750e+01, -3.0273438e+01,
                  -2.1972656e+01, -1.0253906e+01, -1.4648438e+00, 6.3476562e+00,
                  6.8359375e+00, 1.1230469e+01, 6.8359375e+00, -1.9531250e+00,
                  -1.4648438e+00, 3.9062500e+00, -7.3242188e+00, -7.8125000e+00,
                  -6.8359375e+00, -1.8066406e+01, -3.4667969e+01, -3.9550781e+01,
                  -4.0527344e+01, -4.3945312e+01, -4.7851562e+01, -4.2480469e+01,
                  -4.6875000e+01, -5.0781250e+01, -6.0546875e+01, -7.4707031e+01,
                  -8.4960938e+01, -8.3496094e+01, -8.3984375e+01, -7.9101562e+01,
                  -7.3730469e+01, -6.8359375e+01, -5.5664062e+01, -4.6386719e+01,
                  -4.9804688e+01, -4.9316406e+01, -4.7363281e+01, -4.1015625e+01,
                  -4.1992188e+01, -3.6132812e+01, -2.0996094e+01, -9.2773438e+00,
                  4.8828125e+00, 8.3007812e+00, 5.8593750e+00, 7.8125000e+00,
                  8.7890625e+00, 1.5625000e+01, 2.1484375e+01, 1.9531250e+01,
                  4.0527344e+01, 4.3945312e+01, 4.2480469e+01, 3.6132812e+01,
                  1.4648438e+01, -2.2949219e+01, -6.6894531e+01, -1.0400391e+02,
                  -1.3183594e+02, -1.4404297e+02, -1.4160156e+02, -1.3574219e+02,
                  -1.3916016e+02, -1.3134766e+02, -1.2060547e+02, -1.0888672e+02,
                  -9.5703125e+01, -5.8105469e+01, -2.1972656e+01, 1.9531250e+00,
                  1.7089844e+01, 1.2695312e+01, 9.7656250e-01, -1.7578125e+01,
                  -4.1992188e+01, -7.0800781e+01, -9.3750000e+01, -1.1083984e+02,
                  -1.1132812e+02, -1.0546875e+02, -1.0937500e+02, -1.2207031e+02,
                  -1.5039062e+02, -1.6796875e+02, -1.4892578e+02, -1.2207031e+02,
                  -1.2841797e+02, -1.4648438e+02, -1.6748047e+02, -1.9238281e+02,
                  -2.0263672e+02, -2.0800781e+02, -2.0751953e+02, -2.1777344e+02,
                  -2.1386719e+02, -1.9726562e+02, -2.1582031e+02, -2.1972656e+02,
                  -2.3730469e+02, -2.5146484e+02, -2.6025391e+02, -2.6074219e+02,
                  -2.4853516e+02, -2.3437500e+02, -2.2900391e+02, -2.6513672e+02,
                  -2.9101562e+02, -2.8662109e+02, -2.7148438e+02, -2.5488281e+02,
                  -2.3388672e+02, -2.2851562e+02, -2.3437500e+02, -2.2900391e+02,
                  -2.2900391e+02, -2.2705078e+02, -2.3291016e+02, -2.4023438e+02,
                  -2.4218750e+02, -2.4804688e+02, -2.2900391e+02, -2.2119141e+02,
                  -2.1875000e+02, -2.1533203e+02, -2.0605469e+02, -1.9287109e+02,
                  -1.8066406e+02, -1.9140625e+02, -2.0312500e+02, -2.0410156e+02,
                  -1.7480469e+02, -1.7333984e+02, -1.8115234e+02, -1.8945312e+02,
                  -2.0068359e+02, -1.9970703e+02, -1.9384766e+02, -1.9482422e+02,
                  -2.0898438e+02, -2.0117188e+02, -1.8164062e+02, -1.7382812e+02,
                  -1.7871094e+02, -1.9824219e+02, -1.9726562e+02, -1.8652344e+02,
                  -1.7724609e+02, -1.6406250e+02, -1.5087891e+02, -1.4648438e+02,
                  -1.4990234e+02, -1.3671875e+02, -1.2304688e+02, -1.0644531e+02,
                  -8.7402344e+01, -7.4707031e+01, -6.2011719e+01, -5.2734375e+01,
                  -3.6132812e+01, -2.7832031e+01, -3.1738281e+01, -2.4414062e+01,
                  -9.7656250e+00, -1.9531250e+00, 5.8593750e+00, 1.7089844e+01,
                  1.7578125e+01, -1.4648438e+00, -1.6113281e+01, -1.0742188e+01,
                  -2.3437500e+01, -1.9042969e+01, -7.8125000e+00, 2.4414062e+00,
                  1.8066406e+01, 2.7343750e+01, 3.9062500e+01, 3.9062500e+01,
                  3.3691406e+01, 2.1484375e+01, 1.0742188e+01, -1.2207031e+01,
                  -2.7832031e+01, -1.3671875e+01, 6.8359375e+00, 2.0996094e+01,
                  3.7109375e+01, 4.1015625e+01, 3.6132812e+01, 3.8085938e+01,
                  3.7597656e+01, 2.8808594e+01, 2.3925781e+01, 1.3671875e+01,
                  -1.0742188e+01, -2.4414062e+00, 1.2207031e+01, 2.2949219e+01,
                  2.1484375e+01, -3.4179688e+00, -2.3437500e+01, -1.8554688e+01,
                  -1.0253906e+01, -4.8828125e-01, 1.9531250e+01, 1.7578125e+01,
                  8.7890625e+00, 1.3671875e+01, 2.7832031e+01, 5.4199219e+01,
                  6.5429688e+01, 4.9804688e+01, 3.7597656e+01, 4.9316406e+01,
                  5.1269531e+01, 4.5410156e+01, 3.8574219e+01, 1.9042969e+01,
                  9.2773438e+00, 8.7890625e+00, 8.7890625e+00, 8.7890625e+00,
                  1.2207031e+01, 2.0019531e+01, 2.4414062e+01, 2.5878906e+01,
                  2.8320312e+01, 2.4414062e+01, 1.2695312e+01, 5.8593750e+00,
                  8.7890625e+00, 9.2773438e+00, 1.3183594e+01, 2.1972656e+01,
                  3.2714844e+01, 3.7109375e+01, 2.8808594e+01, 8.3007812e+00,
                  1.5136719e+01, 1.7578125e+01, 2.4414062e+01, 2.8320312e+01,
                  2.2949219e+01, 1.8554688e+01, 1.1718750e+01, 2.5390625e+01,
                  3.5644531e+01, 3.6621094e+01, 2.0019531e+01, 2.9785156e+01,
                  4.8339844e+01, 6.0058594e+01, 5.2734375e+01, 4.4921875e+01,
                  6.0546875e+01, 7.7636719e+01, 8.5449219e+01, 7.8613281e+01,
                  7.2753906e+01, 8.5449219e+01, 9.4726562e+01, 9.9121094e+01,
                  8.0566406e+01, 6.1035156e+01, 6.1035156e+01, 6.1523438e+01,
                  7.3730469e+01, 8.3984375e+01, 8.8378906e+01, 8.6425781e+01,
                  7.6171875e+01, 7.6171875e+01, 8.3496094e+01, 8.2519531e+01,
                  7.1289062e+01, 6.3964844e+01, 6.2500000e+01, 5.5664062e+01,
                  3.7109375e+01, 2.2949219e+01, 1.5625000e+01, 8.7890625e+00,
                  1.6113281e+01, 2.6855469e+01, 4.5898438e+01, 5.7128906e+01,
                  5.9082031e+01, 5.8105469e+01, 4.4433594e+01, 3.0761719e+01,
                  3.3203125e+01, 4.3457031e+01, 6.2500000e+01, 8.7890625e+01,
                  1.1621094e+02, 1.4453125e+02, 1.5185547e+02, 1.4550781e+02,
                  1.4257812e+02, 1.4208984e+02, 1.2841797e+02, 1.1767578e+02,
                  1.1718750e+02, 1.2304688e+02, 1.3378906e+02, 1.3671875e+02,
                  1.5039062e+02, 1.7236328e+02, 1.7773438e+02, 1.8652344e+02,
                  1.7968750e+02, 1.7041016e+02, 1.6455078e+02, 1.4550781e+02,
                  1.3232422e+02, 1.4062500e+02, 1.4062500e+02, 1.3232422e+02,
                  1.3085938e+02, 1.1572266e+02, 1.1132812e+02, 9.1796875e+01,
                  6.3476562e+01, 4.8339844e+01, 3.1250000e+01, 2.0507812e+01,
                  1.4648438e+01, 9.2773438e+00, 5.3710938e+00, -6.3476562e+00,
                  -1.3671875e+01, -1.6113281e+01, -1.0253906e+01, -1.0742188e+01,
                  -2.4902344e+01, -3.2226562e+01, -3.1738281e+01, -4.4433594e+01,
                  -4.3945312e+01, -4.5410156e+01, -5.6152344e+01, -5.2734375e+01,
                  -4.9804688e+01, -2.9296875e+01, -1.9042969e+01, -6.8359375e+00,
                  -1.9042969e+01, -3.4667969e+01, -3.9550781e+01, -3.6621094e+01,
                  -3.4667969e+01, -3.9062500e+01, -3.4179688e+01, -2.7832031e+01,
                  -2.3925781e+01, -2.1484375e+01, -2.0019531e+01, -2.1484375e+01,
                  -2.4414062e+01, -4.8828125e+01, -6.6894531e+01, -5.7128906e+01,
                  -4.9804688e+01, -4.4921875e+01, -4.5898438e+01, -4.7363281e+01,
                  -4.8339844e+01, -4.1503906e+01, -2.3925781e+01, -1.8554688e+01,
                  -3.0761719e+01, -3.0273438e+01, -3.4667969e+01, -4.1015625e+01],
          [3.5644531e+01, 3.7109375e+01, 4.0527344e+01, 3.9062500e+01, 3.4179688e+01,
                  2.5878906e+01, 2.3925781e+01, 2.1484375e+01, 1.3671875e+01,
                  1.5136719e+01, 1.9531250e+01, 1.3183594e+01, 1.6601562e+01,
                  1.8066406e+01, 1.6601562e+01, 1.9042969e+01, 2.2949219e+01,
                  2.4414062e+01, 3.0761719e+01, 3.9062500e+01, 3.9550781e+01,
                  4.1503906e+01, 3.7109375e+01, 2.6367188e+01, 2.8808594e+01,
                  3.5156250e+01, 3.8085938e+01, 4.1992188e+01, 3.9062500e+01,
                  3.9062500e+01, 3.0273438e+01, 2.7343750e+01, 2.5878906e+01,
                  2.0507812e+01, 1.7578125e+01, 1.2695312e+01, 4.8828125e+00,
                  7.8125000e+00, 8.7890625e+00, 2.9296875e+00, -3.9062500e+00,
                  -1.3671875e+01, -2.0996094e+01, -1.4160156e+01, -1.7089844e+01,
                  -1.8554688e+01, -2.0507812e+01, -1.8066406e+01, -1.6601562e+01,
                  -1.7089844e+01, -2.2460938e+01, -2.5878906e+01, -2.0019531e+01,
                  -1.6601562e+01, -1.4648438e+01, -1.0742188e+01, -9.2773438e+00,
                  -5.8593750e+00, 0.0000000e+00, -1.4648438e+00, 0.0000000e+00,
                  7.3242188e+00, 1.0742188e+01, 1.1718750e+01, 9.7656250e+00,
                  1.0253906e+01, 1.2695312e+01, 1.4648438e+00, -2.4414062e+00,
                  -3.4179688e+00, -5.3710938e+00, -3.4179688e+00, -8.7890625e+00,
                  -9.7656250e+00, -1.8066406e+01, -1.9042969e+01, -1.2207031e+01,
                  -1.0742188e+01, -8.3007812e+00, -4.8828125e+00, -9.2773438e+00,
                  -9.2773438e+00, -2.4414062e+00, 6.8359375e+00, 1.0742188e+01,
                  6.8359375e+00, 1.2695312e+01, 1.0253906e+01, 5.3710938e+00,
                  0.0000000e+00, 3.9062500e+00, 4.8828125e+00, -4.8828125e-01,
                  -4.8828125e-01, -2.4414062e+00, 4.3945312e+00, 1.0253906e+01,
                  9.7656250e+00, 8.7890625e+00, 4.3945312e+00, 6.8359375e+00,
                  7.3242188e+00, -4.8828125e+00, -1.4160156e+01, -1.5136719e+01,
                  -1.0742188e+01, -1.1718750e+01, -1.7089844e+01, -1.8554688e+01,
                  -1.7089844e+01, -1.7578125e+01, -1.5136719e+01, -1.4648438e+01,
                  -3.4179688e+00, 3.9062500e+00, 3.4179688e+00, 6.8359375e+00,
                  1.6601562e+01, 1.9042969e+01, 1.1230469e+01, 6.3476562e+00,
                  3.4179688e+00, 4.3945312e+00, 1.4648438e+00, -9.7656250e-01,
                  9.7656250e-01, 1.0253906e+01, 1.2695312e+01, 1.3671875e+01,
                  1.9531250e+01, 2.0019531e+01, 2.5390625e+01, 2.1484375e+01,
                  2.4414062e+01, 2.4902344e+01, 2.1484375e+01, 2.0507812e+01,
                  2.3925781e+01, 2.2949219e+01, 2.2460938e+01, 1.5625000e+01,
                  9.2773438e+00, 1.0742188e+01, 9.7656250e-01, -6.3476562e+00,
                  -3.9062500e+00, -1.3183594e+01, -2.3925781e+01, -3.0761719e+01,
                  -3.9550781e+01, -3.4179688e+01, -3.5156250e+01, -4.5898438e+01,
                  -5.2246094e+01, -5.5175781e+01, -5.4687500e+01, -5.2246094e+01,
                  -6.1523438e+01, -7.1289062e+01, -6.4453125e+01, -4.7851562e+01,
                  -4.9804688e+01, -6.1035156e+01, -6.3964844e+01, -6.2011719e+01,
                  -6.3476562e+01, -6.0546875e+01, -5.2734375e+01, -5.1269531e+01,
                  -4.8828125e+01, -4.6875000e+01, -4.5898438e+01, -4.4433594e+01,
                  -5.4199219e+01, -5.2734375e+01, -4.9316406e+01, -4.8828125e+01,
                  -4.2480469e+01, -5.9082031e+01, -8.3496094e+01, -1.2792969e+02,
                  -2.0068359e+02, -2.6611328e+02, -2.9785156e+02, -2.9736328e+02,
                  -2.7685547e+02, -2.4804688e+02, -2.2021484e+02, -1.7871094e+02,
                  -1.2548828e+02, -1.0449219e+02, -1.2402344e+02, -1.5380859e+02,
                  -1.5673828e+02, -1.4306641e+02, -1.1767578e+02, -1.0742188e+02,
                  -1.1962891e+02, -1.4941406e+02, -1.7236328e+02, -1.9580078e+02,
                  -2.0117188e+02, -2.1191406e+02, -2.3828125e+02, -2.4853516e+02,
                  -2.4755859e+02, -2.4609375e+02, -2.4462891e+02, -2.4218750e+02,
                  -2.4902344e+02, -2.7587891e+02, -2.9492188e+02, -3.2177734e+02,
                  -3.3056641e+02, -3.1005859e+02, -3.0371094e+02, -2.9150391e+02,
                  -2.6367188e+02, -2.8417969e+02, -2.9492188e+02, -2.7587891e+02,
                  -2.8466797e+02, -3.0371094e+02, -2.8857422e+02, -2.6025391e+02,
                  -2.5732422e+02, -2.6806641e+02, -2.5732422e+02, -2.5097656e+02,
                  -2.4707031e+02, -2.6562500e+02, -2.6904297e+02, -2.7490234e+02,
                  -2.7294922e+02, -2.5292969e+02, -2.2607422e+02, -2.2265625e+02,
                  -2.2167969e+02, -2.2607422e+02, -2.1191406e+02, -2.0947266e+02,
                  -2.2753906e+02, -2.2949219e+02, -2.2558594e+02, -2.0410156e+02,
                  -1.9238281e+02, -1.8652344e+02, -1.8994141e+02, -2.0214844e+02,
                  -1.9677734e+02, -2.0458984e+02, -2.2460938e+02, -2.2509766e+02,
                  -2.1582031e+02, -2.1679688e+02, -2.2460938e+02, -2.2753906e+02,
                  -2.3291016e+02, -2.1972656e+02, -2.2363281e+02, -2.3144531e+02,
                  -2.2802734e+02, -2.3095703e+02, -2.3144531e+02, -2.1435547e+02,
                  -1.8212891e+02, -1.5234375e+02, -1.4697266e+02, -1.3134766e+02,
                  -1.1572266e+02, -1.1621094e+02, -1.1181641e+02, -9.9121094e+01,
                  -8.4960938e+01, -7.6660156e+01, -5.5664062e+01, -4.2968750e+01,
                  -4.1015625e+01, -3.2226562e+01, -1.9531250e+01, -1.2207031e+01,
                  -5.3710938e+00, 6.8359375e+00, 1.2207031e+01, 1.9042969e+01,
                  2.0996094e+01, 1.6113281e+01, 2.0507812e+01, 2.1484375e+01,
                  1.8066406e+01, -3.4179688e+00, -2.3437500e+01, -3.5156250e+01,
                  -3.9550781e+01, -4.2968750e+01, -3.6132812e+01, -3.1250000e+01,
                  -2.1972656e+01, -1.9531250e+01, -3.0273438e+01, -3.4179688e+01,
                  -4.0039062e+01, -5.2734375e+01, -6.6406250e+01, -6.5917969e+01,
                  -5.9082031e+01, -6.4453125e+01, -7.5683594e+01, -7.8613281e+01,
                  -7.2265625e+01, -6.1035156e+01, -5.7617188e+01, -5.5175781e+01,
                  -5.2246094e+01, -4.1015625e+01, -2.2949219e+01, -8.7890625e+00,
                  2.9296875e+00, 2.1972656e+01, 3.0273438e+01, 2.4414062e+01,
                  1.5136719e+01, 7.8125000e+00, 4.3945312e+00, 8.3007812e+00,
                  1.4648438e+01, 2.1484375e+01, 1.7089844e+01, 1.0253906e+01,
                  -4.8828125e+00, -1.5625000e+01, -3.6132812e+01, -4.7363281e+01,
                  -3.0273438e+01, 0.0000000e+00, 2.2460938e+01, 4.1503906e+01,
                  4.9804688e+01, 5.5664062e+01, 4.8828125e+01, 3.8574219e+01,
                  1.7089844e+01, 1.2207031e+01, 2.6855469e+01, 4.3945312e+01,
                  4.9316406e+01, 4.7851562e+01, 3.7597656e+01, 3.6132812e+01,
                  3.7597656e+01, 4.0039062e+01, 3.3691406e+01, 3.6132812e+01,
                  5.2734375e+01, 7.1777344e+01, 8.4472656e+01, 9.6679688e+01,
                  1.0742188e+02, 9.2773438e+01, 9.0820312e+01, 1.0107422e+02,
                  9.9121094e+01, 9.0332031e+01, 7.7636719e+01, 8.1054688e+01,
                  8.5937500e+01, 8.4472656e+01, 8.2031250e+01, 7.7636719e+01,
                  8.3007812e+01, 8.3007812e+01, 8.5937500e+01, 9.1308594e+01,
                  8.3496094e+01, 7.1289062e+01, 6.2988281e+01, 6.9335938e+01,
                  6.7382812e+01, 7.7636719e+01, 9.4726562e+01, 1.0742188e+02,
                  1.1572266e+02, 1.0986328e+02, 1.0595703e+02, 1.0400391e+02,
                  8.9355469e+01, 8.6425781e+01, 8.3496094e+01, 5.8105469e+01,
                  4.1992188e+01, 2.0996094e+01, -4.8828125e+00, -1.3183594e+01,
                  -2.0019531e+01, -2.1484375e+01, -2.8320312e+01, -4.3945312e+01,
                  -5.4199219e+01, -5.6640625e+01, -5.4687500e+01, -4.7363281e+01,
                  -3.0761719e+01, -3.2226562e+01, -2.3925781e+01, -2.9785156e+01,
                  -2.9296875e+01, -3.7597656e+01, -5.7128906e+01, -6.1035156e+01,
                  -4.8339844e+01, -5.0781250e+01, -4.9316406e+01, -3.2714844e+01,
                  -3.3691406e+01, -4.7851562e+01, -4.1992188e+01, -4.6875000e+01,
                  -6.4941406e+01, -8.2519531e+01, -6.5917969e+01, -7.0312500e+01,
                  -8.0078125e+01, -7.8613281e+01, -7.6171875e+01, -8.3496094e+01,
                  -8.9843750e+01, -9.0820312e+01, -8.6425781e+01, -7.5195312e+01,
                  -6.7871094e+01, -5.5175781e+01, -4.0039062e+01, -3.8085938e+01,
                  -3.4667969e+01, -2.2949219e+01, -5.3710938e+00, 2.4414062e+00,
                  6.8359375e+00, 1.7089844e+01, 1.8554688e+01, 1.9042969e+01,
                  1.4160156e+01, 5.3710938e+00, 9.2773438e+00, 1.2207031e+01,
                  4.3945312e+00, 1.5136719e+01, 1.2695312e+01, 1.5625000e+01,
                  1.2695312e+01, 6.8359375e+00, 1.4160156e+01, 1.9531250e+00,
                  6.8359375e+00, 3.1250000e+01, 4.3945312e+01, 5.5664062e+01,
                  5.2246094e+01, 4.3945312e+01, 3.3203125e+01, 2.4414062e+01,
                  1.7578125e+01, 1.7089844e+01, 1.7578125e+01, 2.8808594e+01,
                  2.9785156e+01, 2.7832031e+01, 4.4433594e+01, 6.0546875e+01,
                  6.6406250e+01, 7.0800781e+01, 7.4218750e+01, 7.7636719e+01,
                  7.5195312e+01, 7.6660156e+01, 6.9824219e+01, 5.6152344e+01,
                  5.9570312e+01, 5.5664062e+01, 4.9316406e+01, 4.8828125e+01,
                  4.4433594e+01, 3.5156250e+01, 2.0019531e+01, 1.4160156e+01,
                  3.2714844e+01, 4.2480469e+01, 5.0292969e+01, 5.2734375e+01,
                  5.9570312e+01, 7.1289062e+01, 8.0078125e+01, 7.7148438e+01,
                  8.3984375e+01, 7.8613281e+01, 7.7148438e+01, 7.9589844e+01,
                  9.1308594e+01, 1.0595703e+02, 1.1718750e+02]];

})(wdat || (wdat = {}), jQuery);
var wdat;
(function(wdat, $) {
  "use strict";

  wdat.SignalSourceHardcode = SignalSourceHardcode;

  SignalSourceHardcode.inherits(cry.Source);

  function SignalSourceHardcode(lower, upper) {

    SignalSourceHardcode.parent.constructor.call(this);

    var _signals = wdat.hardcodeSignals;
    var _step    = wdat.hardcodeInterval;
    var _styles  = wdat.hardcodeStyles;
    var _lower   = (lower || 0);
    var _upper   = (upper || _signals.length);

    this.load = function(callback) {
      if (!this._dataReady) {
        this._data = [];

        for (var i = _lower; i <= _upper; i += 1) {
          var s = _styles[i];
          var d = new Float32Array(_signals[i].length * 2);
          var x = 0;
          var y;

          for (var j = 1; j < d.length; j += 2) {
            y = parseFloat(_signals[i][Math.floor(j/2)]);
            d[j - 1] = x;
            d[j]     = y;
            x += _step;
          }

          this._data.push({data: d, style: s});
        }

        this._dataReady = true;
      }
    };

  }


})(wdat || (wdat = {}), jQuery);
