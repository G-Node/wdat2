from django.contrib.auth.models import User
from django.utils.encoding import smart_unicode
import datetime

meta_messages = {
    "invalid_neo_id": "The NEO_ID provided is wrong and can't be parsed. The NEO_ID should have a form 'neo-object-type_object-ID', like 'segment_12345'. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct NEO_ID and send the request again.",
    "wrong_neo_id": "The object with the NEO_ID provided does not exist.",
    "missing_neo_id": "For this type of request you should provide NEO_ID. The NEO_ID should have a form 'neo-object-type_object-ID', like 'segment_12345'. Please include NEO_ID and send the request again.",
    "invalid_method": "This URL does not support the method specified.",
    "invalid_obj_type": "You provided an invalid NEO object type parameter, or this parameter is missing. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the type and send the request again.",
    "missing_parameter": "Parameters, shown above, are missing. We need these parameters to proceed with the request.",
    "bad_parameter": "Some of the parameters provided are incorrect or object with a given ID does not exist.",
    "wrong_parent": "A parent object with this ID does not exist: ",
    "debug": "Debugging message.",
    "dict_required": "The following parameter must be of a type dict containing 'data' and 'units' keys: ",
    "no_enquery_related": "There are no related attributes for this object.",
    "not_authenticated": "Please authenticate before sending the request.",
    "not_authorized": "You don't have permissions to access the object.",
    "authenticated": "Successfully authenticated.",
    "invalid_credentials": "The credentials provided not valid.",
    "data_missing": "Some of the required parameters are missing: 'data', 'units' or 'channel_index'.",
    "units_missing": "You need to specify units (for example, 'ms' or 'mV') for following parameters.",
    "not_iterable": "Parameter must be of type 'list'",
    "bad_float_data": "The data given is not a list of comma-separated float / integer values. Please check your input.",
    "object_created": "Object created successfully.",
    "object_updated": "Object updated successfully. Data changes saved.",
    "object_selected": "Here is the list of requested objects.",
    "processed": "Your request was processed successfully.",
    "data_parsing_error": "Data, sent in the request body, cannot be parsed. Please ensure, the data is sent in JSON format.",
    "data_inconsistency": "The dimensions of the data provided do not match.",
    "wrong_params": "Parameters provided are incorrect. Please consider details in the 'details' element.",
    "retrieved": "Object retrieved successfully.",
    "no_objects_found": "No objects found.",
    "not_found": "The page you requested was not found.",
    "does_not_exist": "Object does not exist.",
    "deleted": "Object was deleted.",
    "post_data_invalid": "The structure of the POST data is invalid.",
    "wrong_reference": "You may be referencing an object you don't have access to.",
    "not_an_archive": "The file is not an archive.",
    "non_convertible": "The file cannot be converted.",
    "task_started": "The task has been started.",
    "x_progress_missing": "You must provide X-Progress-ID header or query param.",
}

meta_objects = ("block", "segment", "event", "eventarray", "epoch", "epocharray", \
    "unit", "spiketrain", "analogsignal", "analogsignalarray", \
    "irsaanalogsignal", "spike", "recordingchannelgroup", "recordingchannel",\
    "waveform")

# attribute name. underscore indicates whether attribute is mandatory
meta_attributes = {
    "block": ('_name', 'filedatetime', 'index'),
    "segment": ('_name', 'filedatetime', 'index'),
    "event": ('_label',),
    "eventarray": (),
    "epoch": ('_label',),
    "epocharray": (),
    "unit": ('_name',),
    "spiketrain": (),
    "analogsignal": ('_name',),
    "analogsignalarray": (),
    "irsaanalogsignal": ('_name',),
    "spike": (),
    "recordingchannelgroup": ('_name',),
    "recordingchannel": ('_name', 'index')}

# possible unit types: order matters!!
meta_unit_types = {
    "time": ("s", "ms", "mcs"), # *1000, *1, /1000
    "signal": ("v", "mv", "mcv"),
    "sampling": ("hz", "khz", "mhz", "1/s")} # *1, *1000, *100000, *1

# object type: data-related attributes names. waveform is a special case (2-3D).
meta_data_attrs = {
    "event": ('time',),
    "epoch": ('time', 'duration'),
    "spiketrain": ('t_start', 't_stop', 'times', 'waveforms'),
    "analogsignal": ('sampling_rate', 't_start', 'signal'),
    "irsaanalogsignal": ('t_start', 'signal', 'times'),
    "spike": ('left_sweep', 'time', 'sampling_rate', 'waveforms')}

# object type: parent objects
meta_parents = {
    "segment": ('block',),
    "eventarray": ('segment',),
    "event": ('segment','eventarray'),
    "epocharray": ('segment',),
    "epoch": ('segment','epocharray'),
    "recordingchannelgroup": ('block',),
    "recordingchannel": ('recordingchannelgroup',),
    "unit": ('recordingchannel',), # this object is special. do not add more parents
    "spiketrain": ('segment','unit'),
    "analogsignalarray": ('segment',),
    "analogsignal": ('segment','analogsignalarray','recordingchannel'),
    "irsaanalogsignal": ('segment','recordingchannel'),
    "spike": ('segment','unit')}

# object type + children
meta_children = {
    "block": ('segment','recordingchannelgroup'),
    "segment": ('analogsignal', 'irsaanalogsignal', 'analogsignalarray', 'spiketrain', 'spike', 'event', 'eventarray', 'epoch', 'epocharray'),
    "eventarray": ('event',),
    "epocharray": ('epoch',),
    "recordingchannelgroup": ('recordingchannel','analogsignalarray'),
    "recordingchannel": ('unit','analogsignal', 'irsaanalogsignal'),
    "unit": ('spiketrain','spike'), 
    "analogsignalarray": ('analogsignal',)}

# factors to align time / sampling rate units for Analog Signals
factor_options = {
  "skhz": 1000.0,
  "smhz": 1000000.0,
  "mshz": 1.0/1000.0,
  "msmhz": 1000.0,
  "mcshz": 1.0/1000000.0,
  "mcskhz": 1.0/1000.0,
}

# allowed parameters for GET requests
request_params_cleaner = {
    # signal / times group
    'start_time': lambda x: float(x), # may raise ValueError
    'end_time': lambda x: float(x), # may raise ValueError
    'start_index': lambda x: int(x), # may raise ValueError
    'end_index': lambda x: int(x), # may raise ValueError
    'duration': lambda x: float(x), # may raise ValueError
    'samples_count': lambda x: int(x), # may raise ValueError
    'downsample': lambda x: int(x), # may raise ValueError

    # data (NEO) group
    'section': lambda x: smart_unicode(x), # may raise UnicodeEncodeError?
    'property': lambda x: smart_unicode(x), # may raise UnicodeEncodeError?
    'value': lambda x: smart_unicode(x), # may raise UnicodeEncodeError?
    'datafile': lambda x: int(x), # may raise UnicodeEncodeError?

    # functional group
    'm2m_append':  lambda x: bool(int(x)), # may raise ValueError

    # common
    'bulk_update': lambda x: bool(int(x)), # may raise ValueError
    'visibility':  lambda x: visibility_options[x], # may raise IndexError
    'top':  lambda x: top_options[x], # may raise IndexError
    'owner':  lambda x: smart_unicode(x), # may raise UnicodeEncodeError?
    'created_min':  lambda x: datetime.datetime.strptime(x, "%Y-%m-%d %H:%M:%S"), # may raise ValueError
    'created_max':  lambda x: datetime.datetime.strptime(x, "%Y-%m-%d %H:%M:%S"), # may raise ValueError
    'offset': lambda x: int(x), # may raise ValueError
    'max_results':  lambda x: abs(int(x)), # may raise ValueError
    'show_kids': lambda x: bool(int(x)), # may raise ValueError
    'cascade': lambda x: bool(int(x)), # may raise ValueError
    'q': lambda x: object_filters[str(x)], # may raise ValueError or IndexError
    'groups_of': lambda x: int(x), # may raise ValueError
    'spacing': lambda x: int(x), # may raise ValueError
    #'every': lambda x: int(x), # replaced by groups_of + spacing
}

object_filters = {
    "link": "link",
    "full": "full",
    "info": "info",
    "data": "data",
    "beard": "beard"}

# visibility options in GET request 
visibility_options = {
    "private": "private",
    "public": "public",
    "shared": "shared",
    "all": "all"}

# select only top sections, owned by the user or shared with the user (GET request)
top_options = {
    "shared": "shared",
    "owned": "owned"}

