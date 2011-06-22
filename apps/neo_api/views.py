from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, HttpResponse, HttpResponseBadRequest
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from neo_api.models import *
import json
import jsonpickle
import re

meta_messages = {
    "invalid_neo_id": "The NEO_ID provided is wrong and can't be parsed. The NEO_ID should have a form <neo object type>_<object ID>, like 'segment_12345'. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct NEO_ID and send the request again.",
    "wrong_neo_id": "The object with the NEO_ID provided does not exist.",
    "missing_neo_id": "For this type of request you should provide NEO_ID. The NEO_ID should have a form <neo object type>_<object ID>, like 'segment_12345'. Please include NEO_ID and send the request again.",
    "invalid_method": "This URL does not support the method specified.",
    "invalid_obj_type": "You provided an invalid NEO object type in 'obj_type' parameter, or this parameter is missing. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the type and send the request again.",
    "missing_parameter": "Parameters, shown above, are missing. We need these parameters to proceed with the request.",
    "wrong_parent": "A parent object with this neo_id does not exist: ",
    "debug": "Debugging message.",
    "not_authenticated": "Please authenticate before sending the request.",
    "not_authorized": "You don't have permissions to access the object.",
    "data_missing": "'data' parameter within an array is missing. Array data should be provided as dictionary, where data values are set as 'data' parameter inside.",
    "not_iterable": "For this type of object a parent parameter must be of type 'list'.",
    "bad_float_data": "The data given is not a set of comma-separated float / integer values. Please check your input: ",
    "object_created": "Object created successfully.",
    "object_updated": "Object updated successfully. Data changes saved.",
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
    "event": ['_time', '_label'],
    "eventarray": [],
    "epoch": ['_time', '_label', '_duration'],
    "epocharray": [],
    "unit": ['_name'],
    "spiketrain": ['_t_start', 't_stop'],
    "analogsignal": ['_name', '_sampling_rate', '_t_start'],
    "analogsignalarray": [],
    "irsaanalogsignal": ['_name', '_t_start'],
    "spike": ['_time', '_sampling_rate', 'left_sweep'],
    "recordingchannelgroup": ['_name'],
    "recordingchannel": ['_name', 'index']}

# object type + array names
meta_arrays = {
    "spiketrain": ["spike_times","waveforms"],
    "analogsignal": ["signal"],
    "irsaanalogsignal": ["signal","times"],
    "spike": ["waveform"]}

# object type + array names
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
    content_type="application/json"

class HttpResponseBadRequestAPI(HttpResponseAPI):
    status_code = 401

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
        obj_type = get_type_by_obj(obj)
        message = meta_messages["object_updated"]
    else:
        # this is create case
        try:
            obj_type = rdata[0]["obj_type"]
            classname = meta_classnames[obj_type]
            obj = classname()
            message = meta_messages["object_created"]
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

    # processing arrays
    if meta_arrays.has_key(obj_type):
        for arr in meta_arrays[obj_type]:
            if rdata[0].has_key(arr):
                obj_array = rdata[0][arr]
                r = reg_csv()
                if not obj_array.has_key("data"):
                    return HttpResponseBadRequestAPI(meta_messages["data_missing"])
                # converting to a string to parse with RE
                str_arr = str(obj_array["data"])
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
                setattr(obj, arr + "_data", cleaned_data)
                # don't forget an array may have units
                if obj_array.has_key("units"):
                    obj_array_unit = obj_array["units"]
                    setattr(obj, arr + "__unit", obj_array_unit)
            else:
                # no array data provided.. does it make sense?
                pass

    # processing relationships
    if meta_parents.has_key(obj_type):
        if obj_type == "unit":
            # unit is a special case. there may be several parents in one parameter.
            r = meta_parents[obj_type][0]
            if rdata[0].has_key(r):
                # saving object to get a primary key for M2M relations
                obj.save()
                parent_ids = rdata[0][r]
                if not getattr(parent_ids, "__iter__", False):
                    return HttpResponseBadRequestAPI(meta_messages["not_iterable"])
                parents = []
                for p in parent_ids:
                    parent = get_by_neo_id_http(p, request.user)
                    if isinstance(parent, HttpResponse):
                        return parent
                    parents.append(parent)
                setattr(obj, r, parents)
        else:
            for r in meta_parents[obj_type]:
                if rdata[0].has_key(r):
                    parent = get_by_neo_id_http(rdata[0][r], request.user)
                    if isinstance(parent, HttpResponse):
                        return parent
                    setattr(obj, r, parent)

    # processing done
    obj.save()

    # making response
    resp_data = [{"neo_id": get_neo_id_by_obj(obj), "message": message}]
    return HttpResponseAPI(json.dumps(resp_data))


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
        obj_type = get_type_by_obj(obj)
        n = FakeJSON()
        # processing attributes
        for _attr in meta_attributes[obj_type]:
            attr = clean_attr(_attr)
            setattr(n, attr, getattr(obj, attr))
            if hasattr(obj, attr + "__unit"):
                setattr(n, attr + "__unit", getattr(obj, attr + "__unit"))
        # processing arrays
        if meta_arrays.has_key(obj_type):
            for arr in meta_arrays[obj_type]:
                array = {"data": getattr(obj, arr), "units": getattr(obj, arr + "__unit")}
                setattr(n, arr, array)
        # processing relationships
        if meta_parents.has_key(obj_type):
            if obj_type == "unit":
                ids = []
                r = meta_parents[obj_type][0]
                parents = getattr(obj, r).all()
                for p in parents:
                    ids.append(get_neo_id_by_obj(p))
                setattr(n, r, ids)
            else:
                for r in meta_parents[obj_type]:
                    parent = getattr(obj, r)
                    if parent:
                        setattr(n, r, get_neo_id_by_obj(parent))
                    else:
                        setattr(n, r, "")
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




@login_required
def data(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def parents(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def children(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def select(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def assign(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass


