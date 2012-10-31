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

WDAT.api.data.GNodeResourceAdapter = function() {
  // nothing to be done here
  this.x = 'y';
};

// define methods of ResourceAdapter
(function(){

  /* Converts a from GNodeNetworkResource into a format that can easily be used 
   * inside the wdat application. The result is always an array of objects. Each object 
   * has the following form.
   * 
   * { 
   *   id: <id>,                // path part of the permalink
   *   name: <name>,
   *   date_created: <date>,
   *   owner: <str>,            // id to the owner
   *   safety_level: <int>,     // 1 = public, 2 = friendly, 3 = private
   *   ... ,                    // other optional attributes 
   *   children: {},            // all child objects as a list of ids
   *   parents: {},             // all parent objects as a list of ids
   *   data: {},                // data as key value pairs
   * }
   */
  WDAT.api.data.GNodeResourceAdapter.prototype.adapt = function(data) {
    if (typeof data  === 'string') data = JSON.parse(data);
    return data;
  };
  
  /* Extracts only the path part of a url.
   * 
   */
  WDAT.api.data.GNodeResourceAdapter.prototype._stripURL = function(url) {
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
  WDAT.api.data.GNodeResourceAdapter.DATA_OBJECTS = {
    metadata: {
      section: {
          attr: [],
          children: [],
          parents: []
        },
      property: {
          attr: [],
          children: [],
          parents: []
        },
      value: {
          attr: [],
          children: [],
          parents: []
        }
    },
    data: {
      container: {
        block: {
          attr: ['name', 'index', 'description', 'file_origin', 'file_datetime', 'rec_datetime'],
          children: ['segment', 'recordingchannelgroup'],
          parents: []
        },
        segment: {
          attr: ['name', 'index', 'description', 'file_origin', 'file_datetime', 'rec_datetime'],
          children: ['analogsignal_set', 'irsaanalogsignal_set', 'analogsignalarray_set', 'spiketrain_set', 
                     'spike_set', 'event_set', 'eventarray_set', 'epoch_set', 'epocharray_set'],
          parents: ['block']
        },
        /* move to plotable ? */
        eventarray: {
          attr: ['name', 'labels', 'description', 'file_origin'],
          data: ['times'],
          children: ['event'],
          parents: ['segment']
        },
        /* move to plotable ? */
        epocharray: {
          attr: ['name', 'labels', 'description', 'file_origin'],
          data: ['times', 'durations'],
          children: ['epoch'],
          parents: ['segment']
        },
        /* move to plotable ? */
        analogsignalarray: {
          attr: ['name', 'description', 'file_origin', 'sampling_rate', 't_start'],
          data: ['analogsignal_set'],
          children: ['analogsignal'],
          parents: ['segment']
        },
        unit: {
          attr: ['name', 'description', 'file_origin'],
          children: ['spiketrain','spike'],
          parents: ['recordingchannel']
        },
        recordingchannel: {
          attr: ['name', 'description', 'file_origin', 'coordinate', 'index'],
          children: ['unit', 'analogsignal', 'irsaanalogsignal'],
          parents: ['recordingchannelgroup']
        },
        recordingchannelgroup: {
          attr: ['name', 'description', 'file_origin', 'channel_names', 'channel_indexes'],
          children: ['recordingchannel', 'analogsignalarray'],
          parents: ['block']
        }
      },
      plotable: {
        spike: {
          attr: ['name', 'description', 'file_origin', 'sampling_rate', 'left_sweep'],
          data: ['time', 'waveform'],
          children: [],
          parents: ['segment', 'unit']
        },
        spiketrain: {
          attr: ['name', 'description', 'file_origin', 'sampling_rate', 't_start', 't_stop', 'left_sweep'],
          data: ['times', 'waveforms'],
          children: [],
          parents: ['segment', 'unit']
        },
        event: {
          attr: ['name', 'description', 'file_origin', 'label'],
          data: ['time'],
          children: [],
          parents: ['segment', 'eventarray']
        },
        epoch: {
          attr: ['name', 'description', 'file_origin', 'label'],
          data: ['duration', 'time'],
          children: [],
          parents: ['segment', 'epocharray']
        },
        analogsignal: {
          attr: ['name', 'description', 'file_origin', 'sampling_rate', 't_start'],
          data: ['signal'],
          children: [],
          parents: ['segment', 'analogsignalarray', 'recordingchannel']
        },
        irsaanalogsigal: {
          attr: ['name', 'description', 'file_origin'],
          data: ['times', 'samples'],
          children: [],
          parents: ['segment']
        }
      },
      all: ''
    },
    all: ''
  }; // end data model description

}());
