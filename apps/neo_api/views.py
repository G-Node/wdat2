from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, HttpResponse, HttpResponseBadRequest
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from neo_api.models import *
try:
    import json
except ImportError:
    import simplejson as json
import jsonpickle
import re

meta_messages = {
    "invalid_neo_id": "The NEO_ID provided is wrong and can't be parsed. The NEO_ID should have a form 'neo-object-type_object-ID', like 'segment_12345'. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct NEO_ID and send the request again.",
    "wrong_neo_id": "The object with the NEO_ID provided does not exist.",
    "missing_neo_id": "For this type of request you should provide NEO_ID. The NEO_ID should have a form 'neo-object-type_object-ID', like 'segment_12345'. Please include NEO_ID and send the request again.",
    "invalid_method": "This URL does not support the method specified.",
    "invalid_obj_type": "You provided an invalid NEO object type parameter, or this parameter is missing. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the type and send the request again.",
    "missing_parameter": "Parameters, shown above, are missing. We need these parameters to proceed with the request.",
    "bad_parameter": "Some of the parameters provided are incorrect. Please consider values below:",
    "wrong_parent": "A parent object with this neo_id does not exist: ",
    "debug": "Debugging message.",
    "dict_required": "The following parameter must be of a type dict containing 'data' and 'units' keys: ",
    "no_data_related": "There is no data, related to this object. Data arrays are supported only for 'analogsignal', 'spiketrain', 'irsaanalogsignal' and 'spike' object types.",
    "no_parents_related": "There are no parents for a Block.",
    "no_children_related": "The requested object may NOT have any children.",
    "not_authenticated": "Please authenticate before sending the request.",
    "not_authorized": "You don't have permissions to access the object.",
    "data_missing": "Some of the required parameters are missing: 'data', 'units' or 'channel_index'.",
    "units_missing": "You need to specify units (for example, 'ms' or 'mV') for the following parameter:",
    "not_iterable": "The following parameter must be of type 'list'",
    "bad_float_data": "The data given is not a set of comma-separated float / integer values. Please check your input: ",
    "object_created": "Object created successfully.",
    "object_updated": "Object updated successfully. Data changes saved.",
    "object_selected": "Here is the list of requested objects.",
    "data_parsing_error": "Data, sent in the request body, cannot be parsed. Please ensure, the data is sent in JSON format.",
}

meta_classnames = {
    "block": Block,
    "segment": Segment,
    "event": Event,
    "eventarray": EventArray,
    "epoch": Epoch,
    "epocharray": EpochArray,
    "unit": Unit,
    "spiketrain": SpikeTrain,
    "analogsignal": AnalogSignal,
    "analogsignalarray": AnalogSignalArray,
    "irsaanalogsignal": IrSaAnalogSignal,
    "spike": Spike,
    "recordingchannelgroup": RecordingChannelGroup,
    "recordingchannel": RecordingChannel}

# attribute name. underscore indicates whether attribute is mandatory
meta_attributes = {
    "block": ['_name', 'filedatetime', 'index'],
    "segment": ['_name', 'filedatetime', 'index'],
    "event": ['_label'],
    "eventarray": [],
    "epoch": ['_label'],
    "epocharray": [],
    "unit": ['_name'],
    "spiketrain": [],
    "analogsignal": ['_name'],
    "analogsignalarray": [],
    "irsaanalogsignal": ['_name'],
    "spike": [],
    "recordingchannelgroup": ['_name'],
    "recordingchannel": ['_name', 'index']}

# object type: data-related attributes names. waveform is a special case (2-3D).
meta_data_attrs = {
    "event": ["time"],
    "epoch": ["time", "duration"],
    "spiketrain": ["t_start", "t_stop", "times", "waveforms"],
    "analogsignal": ["sampling_rate", "t_start", "signal"],
    "irsaanalogsignal": ["t_start", "signal", "times"],
    "spike": ["left_sweep", "time", "sampling_rate", "waveforms"]}

# object type: parent objects
meta_parents = {
    "segment": ["block"],
    "eventarray": ["segment"],
    "event": ["segment","eventarray"],
    "epocharray": ["segment"],
    "epoch": ["segment","epocharray"],
    "recordingchannelgroup": ["block"],
    "recordingchannel": ["recordingchannelgroup"],
    "unit": ["recordingchannel"], # this object is special. do not add more parents
    "spiketrain": ["segment","unit"],
    "analogsignalarray": ["segment"],
    "analogsignal": ["segment","analogsignalarray","recordingchannel"],
    "irsaanalogsignal": ["segment","recordingchannel"],
    "spike": ["segment","unit"]}

# object type + children
meta_children = {
    "block": ['segment','recordingchannelgroup'],
    "segment": ['analogsignal', 'irsaanalogsignal', 'analogsignalarray', 'spiketrain', 'spike', 'event', 'eventarray', 'epoch', 'epocharray'],
    "eventarray": ["event"],
    "epocharray": ["epoch"],
    "recordingchannelgroup": ['recordingchannel','analogsignalarray'],
    "recordingchannel": ['unit','analogsignal', 'irsaanalogsignal'],
    "unit": ['spiketrain','spike'], 
    "analogsignalarray": ["analogsignal"]}


def clean_attr(_attr):
    """
    By default attribute names contain prefix "_" to indicate whether an 
    attribute is mandatory. This needs to be cleaned up before assigning to the
    NEO object.
    """
    i = 0
    if _attr.startswith("_"): i = 1
    return _attr[i:]

def reg_csv():
    # old version - re.compile('^[\d+\.\d*,]+$')
    return re.compile(r'''
        \s*                # Any whitespace.
        (                  # Start capturing here.
          [^,"']+?         # Either a series of non-comma non-quote characters.
          |                # OR
          "(?:             # A double-quote followed by a string of characters...
              [^"\\]|\\.   # That are either non-quotes or escaped...
           )*              # ...repeated any number of times.
          "                # Followed by a closing double-quote.
          |                # OR
          '(?:[^'\\]|\\.)*'# Same as above, for single quotes.
        )                  # Done capturing.
        \s*                # Allow arbitrary space before the comma.
        (?:,|$)            # Followed by a comma or the end of a string.
        ''', re.VERBOSE)


class HttpResponseAPI(HttpResponse):
    def __init__(self, content=''):
        super(HttpResponseAPI, self).__init__(content)
        self['Content-Type'] = "application/json"

class HttpResponseCreatedAPI(HttpResponseAPI):
    status_code = 201

class HttpResponseBadRequestAPI(HttpResponseAPI):
    status_code = 400

class HttpResponseUnauthorizedAPI(HttpResponseAPI):
    status_code = 401

class HttpResponseNotSupportedAPI(HttpResponseAPI):
    status_code = 405

class FakeJSON:
    """
    This is a fake class to construct NEO JSON objects.
    """
    pass


def get_by_neo_id_http(neo_id, user):
    try:
        return get_by_neo_id(neo_id, user)
    except TypeError:
        return HttpResponseBadRequestAPI(meta_messages["invalid_neo_id"] + "\nNEO_ID: " + str(neo_id))
    except PermissionDenied:
        return HttpResponseUnauthorizedAPI(meta_messages["not_authorized"] + "\nNEO_ID: " + str(neo_id))
    except ObjectDoesNotExist:
        return HttpResponseBadRequestAPI(meta_messages["wrong_neo_id"] + "\nNEO_ID: " + str(neo_id))

def auth_required(func):
    """
    Decorator for views where authentication required.
    """
    argnames = func.func_code.co_varnames[:func.func_code.co_argcount]
    fname = func.func_name
    def auth_func(*args, **kwargs):
        if not args[0].user.is_authenticated():
            return HttpResponseUnauthorizedAPI(meta_messages["not_authenticated"])
        return func(*args, **kwargs)
    return auth_func


@auth_required
def process(request, neo_id=None):
    """
    Creates, updates, retrieves or deletes a NEO object. This view has three
    slaves: create_or_update, retrieve and delete.
    """
    # default - such a method not supported
    response = HttpResponseNotSupportedAPI(meta_messages["invalid_method"])
    if request.method == 'POST':
        # this thread creates or updates an object
        response = create_or_update(request, neo_id)
    elif request.method == 'GET':
        # this thread retrieves an object
        response = retrieve(request, neo_id)
    elif request.method == 'DELETE':
        # this thread retrieves an object
        response = delete(request, neo_id)
    return response


def create_or_update(request, neo_id=None):
    """
    This is a slave function to create or update a NEO object.
    """
    update = False
    to_link, parents = None, None
    try:
        rdata = json.loads(request._get_raw_post_data())
    except ValueError:
        return HttpResponseBadRequestAPI(meta_messages["data_parsing_error"])

    if neo_id:
        # this is update case
        update = True
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        obj_type = obj.obj_type
        message = meta_messages["object_updated"]
        resp_object = HttpResponseAPI
    else:
        # this is create case
        try:
            obj_type = rdata[0]["obj_type"]
            classname = meta_classnames[obj_type]
            obj = classname()
            message = meta_messages["object_created"]
            resp_object = HttpResponseCreatedAPI
        except KeyError:
            # invalid NEO type or type is missing
            return HttpResponseBadRequestAPI(meta_messages["invalid_obj_type"])

    # processing attributes
    for _attr in meta_attributes[obj_type]:
        attr = clean_attr(_attr)
        obj_attr = None
        if rdata[0].has_key(attr):
            obj_attr = rdata[0][attr]
            setattr(obj, attr, obj_attr)
            if rdata[0].has_key(attr + "__unit"):
                obj_attr_unit = rdata[0][attr + "__unit"]
                setattr(obj, attr + "__unit", obj_attr_unit)
        elif _attr.startswith("_") and not update:
            return HttpResponseBadRequestAPI(obj_type + ": " + attr + "\n" + meta_messages["missing_parameter"])
    if not update:
        obj.author = request.user
    if rdata[0].has_key("datafile_id"):
        obj_attr = rdata[0]["datafile_id"]
        # enable this when file integration is done TODO
        #obj.file_origin = Datafile.objects.get(id=datafile_id)

    # processing data-related attributes
    if meta_data_attrs.has_key(obj_type):
        for data_attr in meta_data_attrs[obj_type]:
            if rdata[0].has_key(data_attr):
                if data_attr == "waveforms":
                    # Waveforms - it's a special case, 2-3D array. Parsing and update is made of 
                    # three stages: we create new waveforms first (no save), then delete old
                    # ones, then save and assign new waveforms to the host object.
                    waveforms = rdata[0][data_attr] # some processing is done later in this view
                    if not getattr(waveforms, "__iter__", False):
                        return HttpResponseBadRequestAPI(meta_messages["not_iterable"] + ": waveforms")
                    to_link = [] # later this list is used to link waveforms to the obj
                    for wf in waveforms:
                        try:
                            w = WaveForm()
                            try:
                                setattr(w, "channel_index", wf["channel_index"])
                                setattr(w, "waveform_data", wf["waveform"]["data"])
                                setattr(w, "waveform__unit", wf["waveform"]["units"])
                                setattr(w, "author", request.user)
                                if obj_type == "spiketrain":
                                    setattr(w, "time_of_spike_data", wf["time_of_spike"]["data"])
                                    setattr(w, "time_of_spike__unit", wf["time_of_spike"]["units"])
                                to_link.append(w)
                            except KeyError:
                                return HttpResponseBadRequestAPI(meta_messages["data_missing"])
                        except AttributeError, TypeError:
                            return HttpResponseBadRequestAPI(meta_messages["dict_required"] + data_attr)
                else:
                    attr = rdata[0][data_attr]
                    if not type(attr) == type({}):
                        return HttpResponseBadRequestAPI(meta_messages["dict_required"] + data_attr)
                    r = reg_csv()
                    if not attr.has_key("data"):
                        return HttpResponseBadRequestAPI(meta_messages["data_missing"])
                    # processing attribute data
                    if type(attr["data"]) == type([]): # this is an array
                        # converting to a string to parse with RE
                        str_arr = str(attr["data"])
                        str_arr = str_arr[1:len(str_arr)-1]
                        values = r.findall(str_arr)
                        cleaned_data = ''
                        for value in values:
                            try:
                                a = float(value)
                                cleaned_data += ', ' + str(a)
                            except:
                                return HttpResponseBadRequestAPI(meta_messages["bad_float_data"] + str(value))
                        if len(cleaned_data) > 0:
                            cleaned_data = cleaned_data[2:]
                        setattr(obj, data_attr + "_data", cleaned_data)
                    else: # this is a normal value
                        setattr(obj, data_attr, attr["data"])
                    # processing attribute data units
                    if attr.has_key("units"):
                        attr_unit = attr["units"]
                        setattr(obj, data_attr + "__unit", attr_unit)
                    else:
                        # units are required
                        return HttpResponseBadRequestAPI(meta_messages["units_missing"] + " " + data_attr)
            elif not update:
                # we require data-related parameters
                return HttpResponseBadRequestAPI(obj_type + ": " + data_attr + "\n" + meta_messages["missing_parameter"])

    # processing relationships
    if meta_parents.has_key(obj_type):
        if obj_type == "unit":
            # unit is a special case. there may be several parents in one parameter.
            r = meta_parents[obj_type][0]
            if rdata[0].has_key(r):
                parent_ids = rdata[0][r]
                if not getattr(parent_ids, "__iter__", False):
                    return HttpResponseBadRequestAPI(meta_messages["not_iterable"] + ": " + r)
                parents = []
                for p in parent_ids:
                    parent = get_by_neo_id_http(p, request.user)
                    if isinstance(parent, HttpResponse):
                        return parent
                    parents.append(parent) # some processing done later in this view
        else:
            for r in meta_parents[obj_type]:
                if rdata[0].has_key(r):
                    parent = get_by_neo_id_http(rdata[0][r], request.user)
                    if isinstance(parent, HttpResponse):
                        return parent
                    setattr(obj, r, parent)

    # catch exception if any of values provided do not match
    try:
        obj.full_clean()
    except ValidationError, VE:
        # making an output nicer
        to_render = ""
        errors = [(str(k) + ": " + str(v)) for k, v in VE.message_dict.items()]
        for e in errors:
            to_render += str(e) + "\n"
        return HttpResponseBadRequestAPI(meta_messages["bad_parameter"] + "\n" + to_render)

    # processing (almost) done
    obj.save()

    # process complex cases: waveforms, unit
    # this can be earliest done here, to exclude the case of creating and saving 
    # an object before finding an error
    if to_link:
        # remove old waveforms, if exist
        for wf in obj.waveform_set.all():
            wf.delete()
        # assign and save new waveforms
        for wf in to_link:
            setattr(wf, obj_type, obj)
            wf.save()
    if obj_type == "unit" and parents:
        setattr(obj, r, parents)
        obj.save()

    # making response
    resp_data = [{"neo_id": obj.neo_id, "message": message, "logged_in_as": request.user.username}]
    return resp_object(json.dumps(resp_data))


def retrieve(request, neo_id):
    """
    This is a slave function to retrieve a NEO object by given NEO_ID. Due to 
    security reasons we do full manual reconstruction of the JSON object from 
    its django brother.
    """
    if neo_id:
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        n = FakeJSON()
        setattr(n, "neo_id", obj.neo_id)
        # processing attributes
        _assign_attrs(n, obj)
        # processing arrays
        _assign_arrays(n, obj)
        # processing relationships
        _assign_parents(n, obj)
        _assign_children(n, obj)
        # making response
        resp_data = jsonpickle.encode(n, unpicklable=False)
        return HttpResponseAPI(resp_data)
    else:
        return HttpResponseBadRequestAPI(meta_messages["missing_neo_id"])


def delete(request, neo_id):
    """
    This is a slave function to delete a NEO object by given NEO_ID.
    """
    pass


@auth_required
def data(request, neo_id):
    """
    Returns object data arrays.
    """
    if request.method == "GET":
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        n = FakeJSON()
        setattr(n, "neo_id", obj.neo_id)
        # processing arrays
        assigned = _assign_arrays(n, obj)
        if not assigned:
            return HttpResponseBadRequestAPI(meta_messages["no_data_related"])
        # making response
        resp_data = jsonpickle.encode(n, unpicklable=False)
        return HttpResponseAPI(resp_data)
    else:
        return HttpResponseNotSupportedAPI(meta_messages["invalid_method"])

@auth_required
def parents(request, neo_id):
    """
    Returns the list of object parents.
    """
    if request.method == "GET":
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        n = FakeJSON()
        setattr(n, "neo_id", obj.neo_id)
        # processing parents
        assigned = _assign_parents(n, obj)
        if not assigned:
            return HttpResponseBadRequestAPI(meta_messages["no_parents_related"])
        # making response
        resp_data = jsonpickle.encode(n, unpicklable=False)
        return HttpResponseAPI(resp_data)
    else:
        return HttpResponseNotSupportedAPI(meta_messages["invalid_method"])


@auth_required
def children(request, neo_id):
    """
    Returns the list of object children.
    """
    if request.method == "GET":
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        n = FakeJSON()
        setattr(n, "neo_id", obj.neo_id)
        # processing children
        assigned = _assign_children(n, obj)
        if not assigned:
            return HttpResponseBadRequestAPI(meta_messages["no_children_related"])
        # making response
        resp_data = jsonpickle.encode(n, unpicklable=False)
        return HttpResponseAPI(resp_data)
    else:
        return HttpResponseNotSupportedAPI(meta_messages["invalid_method"])


@auth_required
def select(request, obj_type):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    if obj_type in meta_objects:
        classname = meta_classnames[obj_type]
        # TODO add some filtering, sorting etc. here
        objects = classname.objects.filter(author=request.user)[:1000]
        if objects:
            selected = [o.neo_id for o in objects]
            message = meta_messages["object_selected"]
        else:
            selected = ""
            message = "No objects found."
        # making response
        resp_data = [{
            "selected": selected,
            "object_total": len(objects),
            "object_selected": len(objects),
            "selected_as_of": 0,
            "message": message
        }]
        return HttpResponseAPI(json.dumps(resp_data))
    else:
        return HttpResponseBadRequestAPI(meta_messages["invalid_obj_type"])



@auth_required
def assign(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

#===============================================================================

def _assign_attrs(fake, obj):
    """
    Assigns attibutes from NEO to fake object for pickling to JSON.
    """
    for _attr in meta_attributes[obj.obj_type]:
        attr = clean_attr(_attr)
        setattr(fake, attr, getattr(obj, attr))
        if hasattr(obj, attr + "__unit"):
            setattr(fake, attr + "__unit", getattr(obj, attr + "__unit"))

def _assign_arrays(fake, obj):
    """
    Assigns arrays from NEO to fake object for pickling to JSON.
    """
    assigned = False
    if meta_data_attrs.has_key(obj.obj_type):

        # TODO Slicing / downsampling
        #t1 = request.GET.get("t_start")
        #t2 = request.GET.get("t_stop")
        #if hasattr(obj, "t_start") and (t1 or t2):

        for arr in meta_data_attrs[obj.obj_type]:
            if arr == "waveforms":
                array = []
                for wf in obj.waveform_set.all():
                    w = {
                        "channel_index": wf.channel_index,
                        "waveform_data": wf.waveform_data,
                        "waveform__unit": wf.waveform__unit}
                    array.append(w)
            else:
                array = {"data": getattr(obj, arr), "units": getattr(obj, arr + "__unit")}
            setattr(fake, arr, array)
        assigned = True
    return assigned
    

def _assign_parents(fake, obj):
    """
    Assigns parents from NEO to fake object for pickling to JSON.
    """
    assigned = False
    obj_type = obj.obj_type
    if meta_parents.has_key(obj_type):
        if obj_type == "unit":
            ids = []
            r = meta_parents[obj_type][0]
            parents = getattr(obj, r).all()
            for p in parents:
                ids.append(p.neo_id)
            setattr(fake, r, ids)
        else:
            for r in meta_parents[obj_type]:
                parent = getattr(obj, r)
                if parent:
                    setattr(fake, r, parent.neo_id)
                else:
                    setattr(fake, r, "")
        assigned = True
    return assigned


def _assign_children(fake, obj):
    """
    Assigns children from NEO to fake object for pickling to JSON.
    """
    assigned = False
    obj_type = obj.obj_type
    if meta_children.has_key(obj_type):
        for r in meta_children[obj_type]:
            ch = [o.neo_id for o in getattr(obj, r + "_set").all()]
            setattr(fake, r, ch)
        assigned = True
    return assigned
