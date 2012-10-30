//---------- file: data_api.js.worker ----------//


// Import scripts for resource and adapter
importScripts( 'network_resource.js?no=cache' + Math.random(), 
               'resource_adapter.js?no=cache' + Math.random() );

// Define name space WDAT if not available (but it should be because of importScripts())
if (!WDAT) var WDAT = {};
if (!WDAT.api) WDAT.api = {};
if (!WDAT.api.data) WDAT.api.data = {};

/* Create the worker routine that handles all messages send to the worker
 * The message is expected to have the following structure (see data_api.js):
 * 
 *    { event: <event>, action: <action>, type: <type>, data: <data> }
 *    
 * Parameters:
 *  - msg: Object/Serialized object     
 *            The message can be either a JSON object or a Serialized object
 *            (JSON.stringify).  The onmessage handler is intelligent enough to
 *            figure out what is what and pass it to the routing accordingly.
 *            
 * Return value: none;
 */
WDAT.api.data.workerRoutine = function(msg_data) {
  // crate a result
  switch (msg_data.action) {
    case 'init':
      // initialize network resource and resource adapter
      WDAT.api.data.resource = new WDAT.api.data[msg_data.resource]();
      WDAT.api.data.adapter  = new WDAT.api.data[msg_data.adapter]();
      break;
    case 'get':
      // handle get requests here. The message will contain either 'url' or
      // 'specifier' not both. Note, all calls are synchronous, even though
      // some are ajax calls
      var event = msg_data.event,
          url   = msg_data.url,
          specifier = msg_data.specifier,
          raw_data, status_code, tmp, message, adapted_data;

      if (url !== undefined) {
        tmp = WDAT.api.data.resource.getByURL(url);

        raw_data = tmp.response_text;
        status_code = tmp.status_code;
      }

      if (specifier !== undefined) {
        tmp = WDAT.api.data.resource.get(specifier);

        raw_data = tmp.response_text;
        status_code = tmp.status_code;
      }

      adapted_data = WDAT.api.data.adapter.adapt(raw_data);

      message = {
        'event'  : event,
        'status' : status_code,
        'data'   : adapted_data
      };

      // Send message back to the client thread.
      postMessage(message);
      break;
    case 'update':
      // handle update requests
      break;
    case 'save':
      // handle save requests
      break;
    case 'delete':
      // handle delete requests
      break;
    default:
      // just a test to see if web worker are ok
      result.data = "Worker Test OK";
      break;
  }
};

// Attach worker routine to message events
onmessage = function(event) { 
  // Note, that in the worker API, the message object passed using postMessage
  // from the calling code will be passed as event.data to the onmessage
  // handler.
  
  if ( typeof(event.data) === 'string' ) {
    // If string, parse and call woker_routine
    var message_object = JSON.parse(event.data);
    WDAT.api.data.workerRoutine(message_object); 
  } 
    else if ( event.data.hasOwnProperty('action') ) {
    WDAT.api.data.workerRoutine( event.data );
  }
};
