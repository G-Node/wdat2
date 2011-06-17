from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, HttpResponse, HttpResponseBadRequest
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from neo_api.models import *
import json

meta_messages = {
    "wrong_neo_id": "The NEO_ID provided is wrong and can't be parsed. The NEO_ID should have a form <neo object type>_<object ID>, like 'segment_12345'. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the ID and send the request again.",
    "invalid_method": "This URL does not support the method specified.",
    "invalid_obj_type": "You provided an invalid NEO object type in 'obj_type' parameter, or this parameter is missing. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the type and send the request again.",
    "missing_parameter": "Parameters, shown above, are missing. We need these parameters to proceed with the request.",
    "wrong_parent": "A parent object with this neo_id does not exist.",
    "bad_float_data": "The data given is not a set of comma-separated float / integer values. Please check your input: ",
    "object_created": "Object created successfully.",
    "data_parsing_error": "Data, sent in the request body, cannot be parsed. Please ensure, the data is sent in JSON format.",
}

meta_objects = ["block", "segment", "event", "eventarray", "epoch", "epocharray", \
    "unit", "spiketrain", "analogsignal", "analogsignalarray", \
    "irsaanalogsignal", "spike", "recordingchannelgroup", "recordingchannel"]

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
    "spiketrain": [
        ["spike_times"], \
        ["waveforms"]],
    "analogsignal": [
        ["signal"]],
    "irsaanalogsignal": [
        ["signal"],
        ["times"]],
    "spike": [
        ["waveform"]]}

# object type + array names
meta_parents = {
    "segment": [
        ["block"]],
    "eventarray": [
        ["segment"]],
    "event": [
        ["segment"],
        ["eventarray"]],
    "epocharray": [
        ["segment"]],
    "epoch": [
        ["segment"],
        ["epocharray"]],
    "recordingchannelgroup": [
        ["block"]],
    "recordingchannel": [
        ["recordingchannelgroup"]],
    "unit": [
        ["recordingchannel"]],
    "spiketrain": [
        ["segment"],
        ["unit"]],
    "analogsignalarray": [
        ["segment"]],
    "analogsignal": [
        ["segment"],
        ["analogsignalarray"],
        ["recordingchannel"]],
    "irsaanalogsignal": [
        ["segment"],
        ["recordingchannel"]],
    "spike": [
        ["segment"],
        ["unit"]]}


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


@login_required
def create(request):
    """
    Creates new NEO object.
    """
    if request.method == 'POST':
        try:
            rdata = json.loads(request.raw_post_data)
        except ValueError:
            return HttpResponseBadRequest(meta_messages["data_parsing_error"])
        try:
            obj_type = rdata[0]["obj_type"]
            classname = meta_classnames[obj_type]
        except KeyError:
            # invalid NEO type or type is missing
            return HttpResponse(meta_messages["invalid_obj_type"])
        obj = classname()

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
            elif _attr.startswith("_"):
                return HttpResponseBadRequest(obj_type + ": " + attr + "\n" + meta_messages["missing_parameter"])
        obj.author = request.user
        if rdata[0].has_key("datafile_id"):
            obj_attr = rdata[0]["datafile_id"]
            # enable this when file integration is done TODO
            #obj.file_origin = Datafile.objects.get(id=datafile_id)

        # processing arrays
        for arr in meta_arrays[obj_type]:
            if rdata[0].has_key(arr):
                obj_array = rdata[0][arr]
                r = reg_csv()
                # converting to a string to parse with RE
                str_arr = str(obj_array)
                str_arr = str_arr[1:len(str_arr)-1]
                values = r.findall(str_array)
                cleaned_data = ''
                for value in values:
                    try:
                        a = float(value)
                        cleaned_data += ', ' + str(a)
                    except:
                        return HttpResponseBadRequest(meta_messages["bad_float_data"] + str(value))
                if len(cleaned_data) > 0:
                    cleaned_data = cleaned_data[2:]
                setattr(obj, arr, cleaned_data)
                # don't forget an array may have units
                if rdata[0].has_key(arr + "__unit"):
                    obj_array = rdata[0][arr + "__unit"]
                    setattr(obj, arr + "__unit", obj_array_unit)
            else:
                # no array data provided.. does it make sense?
                pass

        # processing relationships
        if meta_parents.has_key(obj_type):
            for r in meta_parents[obj_type]:
                if rdata[0].has_key(r):
                    # unit is a special case. there may be several parents in one parameter.
                    if r == "unit":
                        parent_ids = rdata[0][r]
                        parents = []
                        for p in parent_ids:
                            parent = get_by_neo_id(p)
                            if parent == -1:
                                return HttpResponseBadRequest(meta_messages["wrong_parent"] + " :" + str(parent_id))
                            parents.append(parent)
                        setattr(obj, r, parents)
                    else:
                        parent = get_by_neo_id(rdata[0][r])
                        if parent == -1:
                            return HttpResponseBadRequest(meta_messages["wrong_parent"] + " :" + str(parent_id))
                        setattr(obj, r, parent)
        # processing done
        obj.save()
        obj.save_m2m()
        # making response
        resp_data = [{"neo_id": get_neo_id_by_obj(obj), "message": meta_messages["object_created"]}]
        response = HttpResponse(json.dumps(resp_data))
    else:
        # such a method not supported
        response = HttpResponseBadRequest(meta_messages["invalid_method"])
        response.status_code = 405
    return response


@login_required
def update(request, neo_id):
    """
    Update NEO object.
    """
    if neo_id:
        obj = get_by_neo_id(neo_id)
        if obj == -1:
            return HttpResponseBadRequest(meta_messages["wrond_neo_id"])


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

@login_required
def delete(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass
