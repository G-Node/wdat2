// ---------- file: mod/definitions.js ---------- //


// Add objects defining the data model of the API to the
// module 'mod'.
var wdat; (function(wdat, mod) {

  // A define the model in mod.def.
  mod.def = {};

  /**
   * Define the model for metadata.
   *
   * @define {Object}
   */
  mod.def.metadata = {

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

  }; // end mod.def.metadata

  /**
   * Define the model for ephys data.
   */
  mod.def.ephys = {

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

  }; // end mod.def.ephys

})(wdat || (wdat = {}), wdat.mod || (wdat.mod = {}));

