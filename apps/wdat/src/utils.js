// ---------- file: utils.js ---------- //

//-------------------------------------------------------------------------------------
// IMPORTANT: This file defines functions and name spaces that can and should be used
// by every other part of the project. Make sure that the definitions in this file are
// always available (see Makefile).
//-------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------
// Helper functions
// TODO remove mixins
//-------------------------------------------------------------------------------------

// deprecated
String.prototype.startsWith = function(leader) {
  return this.substr(0, leader.length) === leader;
};

/**
 * Evaluates if a string starts with a certain substring.
 *
 * @param str (String)    The string to check.
 * @param cmp (String)    The putative start sequence
 *
 * @returns True if str starts with cmp, false otherwise.
 */
function strStartsWith(str, cmp) {
  return str.substr(0, cmp.length) == cmp;
}

/**
 * Capitalizes the first character of a string or the first characters of all
 * words of a string.
 *
 * @param str (String)      The string to capitalize.
 * @param sep (String)      Definition of word separators. If this is a falsy value only
 *                          the first character of the string is capitalized. If it is true
 *                          all words separated by ' ' are capitalized. If it is a string or
 *                          regex this will be used to separate words (See string.split())
 *
 * @return A copy of str with capitalized first character(s).
 */
function strCapitalizeWords(str, sep) {
  var tmp;
  if (sep) {
    if (sep === true)
      tmp = str.split(/\ /);
    else
      tmp = str.split(sep);
  } else {
    tmp = [str];
  }
  for ( var i in tmp) {
    var s = tmp[i];
    tmp[i] = s[0].toUpperCase() + s.slice(1);
  }
  return tmp.join(' ');
}

/**
 * Removes leading and trailing white space characters.
 *
 * @param str (String)    The string to trim.
 *
 * @return Copy of the string without leading and trailing white space characters.
 */
function strTrim(str) {
  return (str || '').replace(/^\s+|\s+$/g, '');
}

/**
 * Traverses the object and its child objects recursively and
 * returns the value of the first property with the given name. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object (Obj)      The object to search in.
 * @param prop (String)     The name of the property to find.
 * @param children (Array)  Only search this subset of children (if present)
 *
 * @return The value of the first found property with the given name or null if no
 *          matching property was found.
 */
function objGetRecursive(object, prop, children) {
  var found = null;
  var stack = [];
  stack.push(object);
  while (stack.length > 0 && !found) {
    var obj = stack.pop();
    for ( var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (i === prop) {
          found = obj[i];
          break;
        } else if (children && children.indexOf(i) > -1 && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        } else if (!children && typeof obj[i] === 'object') {
          stack.push(obj[i]);
        }
      }
    }
  }
  return found;
}

/**
 * Traverse the object and its child objects recursively and
 * set all properties with a matching name to the given value. Optionally
 * a set of names of child objects can be defined in order of limiting the
 * scope of the search.
 *
 * @param object (Obj)      The object to search in.
 * @param prop (String)     The name of the property to find.
 * @param val               The value to set
 * @param children (Array)  Only search this subset of children (if present)
 *
 * @return The number of properties found with the given name.
 */
function objSetRecursive(object, prop, val, children) {
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
}

/**
 * Merges the properties of the first object into the second one.
 * Side effect! Changes the object passed as the second parameter.
 *
 * @param from (Obj)        The source object.
 * @param to (Obj)          The target object.
 * @param override (Bool)   Override existing attributes in the target.
 * @param blacklist (Array) Exclude these attributes.
 *
 * @return The merged object (to).
 */
function objMerge(from, to, override, blacklist) {
  if (from) {
    for ( var i in from) {
      if (from.hasOwnProperty(i) && (!blacklist || blacklist.indexOf(i) == -1)) {
        if (override || !to.hasOwnProperty(i))
          to[i] = from[i];
      }
    }
  }
  return to;
}

/**
 * More expressive inheritance.
 *
 * @param Sub (function)      Constructor of the subclass
 * @param Super  (function)   Constructor of the super class
 */
function inherit(Sub, Super) {
  Sub.prototype = new Super();
  Sub.prototype.constructor = Sub;
  Sub.parent = Super.prototype;
}

//-------------------------------------------------------------------------------------
// Name spaces
//-------------------------------------------------------------------------------------
var WDAT = WDAT || {};
/* TODO remove unused name spaces */
WDAT.api = WDAT.api || {}; // name space related to the RESTfull API
WDAT.app = WDAT.app || {}; // name space for application specific parts
WDAT.ui = WDAT.ui || {}; // name space for UI base classes

WDAT.debug = true;

//-------------------------------------------------------------------------------------
// Data model definition
//-------------------------------------------------------------------------------------

WDAT.model = {};
WDAT.model.metadata = {
  section : {
    fields : {
      name: {type: 'text', obligatory: true, min: 3, max: 100},
      description: {type: 'ltext'},
      odml_type: {type: 'int', label: 'Type', obligatory: true, min: 0, value: 0},
      tree_position: {type: 'int', label: 'Position', obligatory: true, min: 0, value: 0}
    },
    children : {
      property_set: {type: 'property', label: 'Properties'},
      block_set: {type: 'block', label: 'Properties'},
      datafile_set: {type: 'file', label: 'Files'},
      section_set: {type: 'section', label: 'Sections'}
    },
    parents : {
      parent_section: {type: 'section', label: 'Section'},
    },
  },
  property : {
    fields : {
      type: {type: 'hidden', value: 'property'},
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
  },
};
WDAT.model.data = {};
WDAT.model.data.container = {
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
    parents : {}
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
  /* move to plotable ? */
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
      event_set: {type: 'event'}
    },
    parents: {
      segment: {type: 'segment'}
    },
  },
  /* move to plotable ? */
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
      epoch_set: {type: 'epoch'},
    },
    parents: {
      segment: {type: 'segment'},
    }
  },
  /* move to plotable ? */
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
      analogsignal_set: {type: 'analogsignal'},
    },
    parents : {
      segment: {type: 'segment'},
    },
  },
  unit : {
    fields : {
      name: {type: 'text', obligatory: true, min: 3, max: 100},
      description: {type: 'ltext'},
      file_origin: {type: 'text'}
    },
    children : {
      spiketrain: {type: 'spiketrain'},
      spike_set: {type: 'spike'},
    },
    parents : {
      recordingchannel: {type: 'recordingchannel'}
    }
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
};
WDAT.model.data.plotable = {
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
      eventarray: {type: 'eventarray'}
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
      epocharray: {type: 'epocharray'}
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
      analogsignalarray: {type: 'analogsignalarray'},
      recordingchannel: {type: 'recordingchannel'}
    }
  },
  irsaanalogsigal : {
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
  }
};
WDAT.model.all = {
  safety_level: {type: 'option',  options: {'public': 'Public', 'friendly': 'Friendly', 'private': 'Private'}},
  date_created: {type: 'text', readonly: true}
};


//-------------------------------------------------------------------------------------
// Helper functions for the data model
//-------------------------------------------------------------------------------------

/**
 * Find the matching category for specific type using WDAT.model.
 *
 * @param type (String)     The type of a data object e.g. section, segment or analogsignal
 *
 * @return The corresponding category e.g. metadata or electrophysiology
 */
function modCategory(type) {
  var t = type.toString().toLowerCase();
  if (WDAT.model.metadata.hasOwnProperty(t))
    return 'metadata';
  else if (WDAT.model.data.container.hasOwnProperty(t))
    return 'electrophysiology';
  else if (WDAT.model.data.plotable.hasOwnProperty(t))
    return 'electrophysiology';
}

/**
 * Get the matching template for a specific type defined in WDAT.model.
 *
 * @param type (String)   The type of a data object e.g. section, segment or analogsignal
 *
 * @return The corresponding template object defined in WDAT.model or undefined if no such type
 *         is specified.
 */
function modTemplate(type) {
  if (type) {
    var t = type.toString().toLowerCase();
    if (WDAT.model.metadata.hasOwnProperty(t))
      return WDAT.model.metadata[t];
    else if (WDAT.model.data.container.hasOwnProperty(t))
      return WDAT.model.data.container[t];
    else if (WDAT.model.data.plotable.hasOwnProperty(t))
      return WDAT.model.data.plotable[t];
  }
}

/**
 * Get all defined fields for a specific type described in WDAT.model
 *
 * @param type (String)   Object with all defined fields or 'undefined' if no such type or no fields
 *                        are specified.
 *
 * @return Object with all defined fields or 'undefined' if no such type or no fields
 *         are specified.
 */
function modFields(type) {
  var fields = {}, count = 0, tmpl = modTemplate(type);
  if (tmpl) {
    for (var i in tmpl.fields) {
      var elem = tmpl.fields[i];
      if (typeof elem !== 'function') {
        fields[i] = elem;
        count += 1;
      }
    }
    for (var i in WDAT.model.all) {
      var elem = WDAT.model.all[i];
      if (typeof elem !== 'function') {
        fields[i] = elem;
        count += 1;
      }
    }
    if (count > 0)
      return fields;
  }
}

/**
 * Get all defined data fields for a specific type described in WDAT.model
 *
 * @param type (String)   The type of a data object.
 *
 * @return Object with all defined fields or 'undefined' if no such type or no data
 *         are specified.
 */
function modData(type) {
  var data = {}, count = 0, tmpl = modTemplate(type);
  if (tmpl) {
    for (var i in tmpl.data) {
      var elem = tmpl.data[i];
      if (typeof elem !== 'function') {
        data[i] = elem;
        count += 1;
      }
    }
    if (count > 0)
      return data;
  }
}

/**
 * Get all defined parents for a specific type described in WDAT.model
 *
 * @param type (String)   The type of a data object.
 *
 * @return Object with all defined parents or 'undefined' if no such type or no parents
 *         are specified.
 */
function modParents(type) {
  var par = {}, count = 0, tmpl = modTemplate(type);
  if (tmpl) {
    for (var i in tmpl.parents) {
      var elem = tmpl.parents[i];
      if (typeof elem !== 'function') {
        par[i] = elem;
        count += 1;
      }
    }
    if (count > 0)
      return par;
  }
}

/**
 * Get all defined children for a specific type described in WDAT.model
 *
 * @param type (String)   The type of a data object.
 *
 * @return Object with all defined children or 'undefined' if no such type or no children
 *         are specified.
 */
function modChildren(type) {
  var children = {}, count = 0, tmpl = modTemplate(type);
  if (tmpl) {
    for (var i in tmpl.children) {
      var elem = tmpl.children[i];
      if (typeof elem !== 'function') {
        children[i] = elem;
        count += 1;
      }
    }
    if (count > 0)
      return children;
  }
}

/**
 * Determine by its type if a data object is plotable, using the definitions
 * in WDAT.model.
 *
 * @param type (String)     The type of a data object e.g. section, segment or analogsignal
 *
 * @return True if the object is plotable, false otherwise
 */
function modPlotable(type) {
  var t = type.toString().toLowerCase();
  return WDAT.model.data.plotable.hasOwnProperty(t);
}

