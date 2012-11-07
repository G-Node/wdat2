// ---------- file: resource_adapter.js ---------- //

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

/* Adapter that provides conversion methods. 
 */
WDAT.api.data.GNodeResourceAdapter = function() {
  
};

// define methods of ResourceAdapter
(function(){

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
  WDAT.api.data.GNodeResourceAdapter.prototype.adapt = function(data) {
    var adapted_data = [];
    if (typeof data  === 'string') data = JSON.parse(data);
    // iterate over results
    for (var index in data.selected) {
      var element = data.selected[index];
      // the adapted result
      var adapted = {}
      // adapt general data
      var tmp = _stripURL(element.permalink).split('/');
      adapted.id = tmp.join('/');
      adapted.type = tmp[1];
      adapted.category = tmp[0] === 'electrophysiology' ? 'data' : 'metadata';
      if (adapted.category === 'data' && DATA_OBJECTS.data.plotable[adapted.type])
        adapted.plotable = true;
      else
        adapted.plotable = false;
      adapted.date_created = element.fields.date_created;
      adapted.owner = _stripURL(element.fields.owner);
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
      var template;
      if (adapted.category === 'data') {
        if (adapted.plotable)
          template = DATA_OBJECTS.data.plotable[adapted.type]
        else
          template = DATA_OBJECTS.data.container[adapted.type]
      } else {
        template = DATA_OBJECTS.metadata[adapted.type]
      }
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
              adapted.children[c][i] = _stripURL(element.fields[c][i]);
            }
          }
        }
        // adapt parents
        adapted.parents = {};
        for (var p in template.parents) {
          p = template.parents[p];
          if (element.fields[p]) {
            adapted.parents[p] = _stripURL(element.fields[p]);
          }
        }
        // adapt data
        adapted.data = {}
        for (var d in template.data) {
          d = template.data[d];
          if (element.fields[d]) {
            adapted.data[d] = element.fields[d];
            if (adapted.data[d].data && typeof adapted.data[d].data === 'string')
              adapted.data[d].data = _stripURL(adapted.data[d].data);
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
  };

  // data model description
  // TODO description for metadata objects
  DATA_OBJECTS = {
    metadata: {
      section: {
          fields: ['name', 'description', 'odml_type', 'tree_position'],
          children: ['property_set', 'block_set','datafile_set'],
          parents: ['parent_section']
        },
      property: {
          fields: ['name', 'definition', 'dependency', 'dependency_value', 
                   'mapping', 'unit', 'dtype', 'uncertainty', 'comment'],
          children: ['value_set'],
          parents: ['section']
        },
      value: {
          fields: ['data'],
          children: [],
          parents: ['parent_property']
        }
    },
    data: {
      container: {
        block: {
          fields: ['name', 'index', 'description', 'file_origin', 'filedatetime', 'recdatetime'],
          children: ['segment_set', 'recordingchannelgroup_set'],
          parents: ['']
        },
        segment: {
          fields: ['name', 'index', 'description', 'file_origin', 'filedatetime', 'recdatetime'],
          children: ['analogsignal_set', 'irsaanalogsignal_set', 'analogsignalarray_set', 'spiketrain_set', 
                     'spike_set', 'event_set', 'eventarray_set', 'epoch_set', 'epocharray_set'],
          parents: ['block']
        },
        /* move to plotable ? */
        eventarray: {
          fields: ['name', 'labels', 'description', 'file_origin'],
          data: ['times'],
          children: ['event_set'],
          parents: ['segment']
        },
        /* move to plotable ? */
        epocharray: {
          fields: ['name', 'labels', 'description', 'file_origin'],
          data: ['times', 'durations'],
          children: ['epoch_set'],
          parents: ['segment']
        },
        /* move to plotable ? */
        analogsignalarray: {
          fields: ['name', 'description', 'file_origin'],
          data: ['analogsignal_set', 'sampling_rate', 't_start'],
          children: ['analogsignal_set'],
          parents: ['segment']
        },
        unit: {
          fields: ['name', 'description', 'file_origin'],
          children: ['spiketrain_set','spike_set'],
          parents: ['recordingchannel']
        },
        recordingchannel: {
          fields: ['name', 'description', 'file_origin', 'coordinate', 'index'],
          children: ['unit_set', 'analogsignal_set', 'irsaanalogsignal_set'],
          parents: ['recordingchannelgroup']
        },
        recordingchannelgroup: {
          fields: ['name', 'description', 'file_origin', 'channel_names', 'channel_indexes'],
          children: ['recordingchannel_set', 'analogsignalarray_set'],
          parents: ['block']
        }
      },
      plotable: {
        spike: {
          fields: ['name', 'description', 'file_origin'],
          data: ['time', 'waveform', 'sampling_rate', 'left_sweep'],
          children: [],
          parents: ['segment', 'unit']
        },
        spiketrain: {
          fields: ['name', 'description', 'file_origin'],
          data: ['times', 'waveforms', 'sampling_rate', 't_start', 't_stop', 'left_sweep'],
          children: [],
          parents: ['segment', 'unit']
        },
        event: {
          fields: ['name', 'description', 'file_origin', 'label'],
          data: ['time'],
          children: [],
          parents: ['segment', 'eventarray']
        },
        epoch: {
          fields: ['name', 'description', 'file_origin', 'label'],
          data: ['duration', 'time'],
          children: [],
          parents: ['segment', 'epocharray']
        },
        analogsignal: {
          fields: ['name', 'description', 'file_origin'],
          data: ['signal', 'sampling_rate', 't_start'],
          children: [],
          parents: ['segment', 'analogsignalarray', 'recordingchannel']
        },
        irsaanalogsigal: {
          fields: ['name', 'description', 'file_origin'],
          data: ['times', 'samples'],
          children: [],
          parents: ['segment']
        }
      }
    }
  }; // end data model description
  WDAT.api.data.GNodeResourceAdapter.DATA_OBJECTS = DATA_OBJECTS;
}());
