// ---------- file: resource_helper.js ---------- //

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

// create anonymous name space
(function() {

  /* Constructor for a simple helper class used by the network resource
   * and resource adapter.
   */
  WDAT.api.ResourceHelper = ResourceHelper();
  function ResourceHelper() {
    // nothing to do
  }

  /* Extracts only the path part of a url.
   * For internal use only.
   * 
   * Parameter:
   *  - url: String       The url to strip
   *  
   * Return value:
   *  - The path part of the url without leading '/'
   */
  ResourceHelper.prototype.stripURL = function(url) {
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

  ResourceHelper.prototype.DATA_OBJECTS = {
    metadata : {
      section : {
        fields : ['name', 'description', 'odml_type', 'tree_position'],
        children : ['property_set', 'block_set', 'datafile_set', 'section_setcd'],
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
  }; // end of DATA_OBJECTS

}());
