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
    "invalid_obj_type": "You provided an invalid NEO object type. Here is the list of NEO object types supported: 'block', 'segment', 'event', 'eventarray', 'epoch', 'epocharray', 'unit', 'spiketrain', 'analogsignal', 'analogsignalarray', 'irsaanalogsignal', 'spike', 'recordingchannelgroup', 'recordingchannel'. Please correct the type and send the request again.",
    "missing_parameter": "Parameters, shown above, are missing. We need these parameters to proceed with the request.",
    "bad_float_data": "The data given is not a set of comma-separated float / integer values. Please check your input: ",
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

# array name, default value, neo attribute name (get), neo attribute name (set)
meta_arrays = {
    "eventarray": [
        ["events", Event, "event"]],
    "epocharray": [
        ["epochs", Epoch, "epoch"]], \
    "spiketrain": [
        ["spike_times"], \
        ["waveforms"]],
    "analogsignal": [
        ["signal"]],
    "irsaanalogsignal": [
        ["signal"],
        ["times"]],
    "analogsignalarray": [
        ["signals", AnalogSignal, "analogsignal"]],
    "spike": [
        ["waveform"]]}

def clean_attr(_attr):
    i = 0
    if _attr.startswith("_"): i = 1
    return _attr[i:]



@login_required
def operations(request, neo_id=None):
    """
    Basic operations with NEO objects. Save, get and delete.

    if neo_id:
        obj = get_by_neo_id(neo_id)
        if obj == -1:
            return HttpResponseBadRequest(meta_messages["wrond_neo_id"])
    if request.method == 'POST':
        if neo_id:

        else:


        obj_type = request.get("obj_type")
        try:
            classname = meta_classnames[obj_type]
        except KeyError:
            # invalid NEO type
            return HttpResponse(obj_type + ": " + meta_messages["invalid_obj_type"])
        obj = classname()
        # assign attributes
        for _attr in meta_attributes[obj_type]:
            attr = clean_attr(_attr)
            obj_attr = request.get(attr)
            if _attr.startswith("_") and not obj_attr:
                return HttpResponseBadRequest(obj_type + ": " + attr + "\n" + meta_messages["missing_parameter"])
            if obj_attr:
                setattr(obj, attr, obj_attr)
                obj_attr_unit = request.get(attr + "__unit")
                if obj_attr_unit:
                    setattr(obj, attr + "__unit", obj_attr_unit)
        obj.author = request.user
        datafile_id = request.get("datafile_id")
        if datafile_id:
            obj.file_origin = Datafile.objects.get(id=datafile_id)
        # processing arrays
        if request.raw_post_data:
            try:
                raw_post = json.loads(request.raw_post_data)
            except ValueError:
                return HttpResponseBadRequest(meta_messages["data_parsing_error"])
        if obj_type in ["eventarray", "epocharray"]:
            # process as list of objects
            for item in raw_post[meta_arrays[obj_type][0]]:
                classname = meta_arrays[obj_type][1]
                i_obj = classname()
                i_obj_type = meta_arrays[obj_type][2]
                for _attr in meta_attributes[i_obj_type]:
                    attr = clean_attr(_attr)
                    try:
                        obj_attr = item[attr]
                    except KeyError:
                        # attribute not provided
                        obj_attr = None
                    if _attr.startswith("_") and not obj_attr:
                        return HttpResponseBadRequest(i_obj_type + ": " + attr + "\n" + meta_messages["missing_parameter"])
                    if obj_attr:
                        setattr(i_obj, attr, obj_attr)
                        try:
                            obj_attr_unit = item[attr + "__unit"]
                            if obj_attr_unit:
                                setattr(i_obj, attr + "__unit", obj_attr_unit)
                i_obj.author = request.user
                if datafile_id:
                    obj.file_origin = Datafile.objects.get(id=datafile_id)
                # set the relationship
                setattr(i_obj, obj_type, obj)
                i_obj.save()
        elif obj_type in ["irsaanalogsignal", "analogsignal", "spike"]:
            # process as data/unit
        else obj_type in ["spiketrain", "analogsignalarray"]:



        for arr in meta_arrays[obj_type]:
            obj_array = request.get(arr)
            if obj_array:
                r = reg_csv()
                values = r.findall(obj_array)
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
                obj_array_unit = request.get(arr + "__unit")
                if obj_array_unit:
                    setattr(obj, arr + "__unit", obj_array_unit)
                




            if hasattr(obj, arr[2]) and (getattr(obj, arr[2]) is not None):
                obj_array = getattr(obj, arr[2], False)
                # we trust this is array
                if obj_array.size == 0:
                    obj_array = arr[1]
                if hasattr(obj, "hdf5_path"):
                    arr_path = str(obj.hdf5_path)
                else:
                    arr_path = node._v_pathname
                # we try to create new array first, so not to loose the 
                # data in case of failure
                new_arr = self._data.createArray(arr_path, arr[0] + "__temp", obj_array)
                if hasattr(obj_array, "dimensionality"):
                    for un in obj_array.dimensionality.items():
                        new_arr._f_setAttr("unit__" + un[0].name, un[1])
                try:
                    self._data.removeNode(arr_path, arr[0])
                except:
                    # there is no array yet or object is new, so just proceed
                    pass
                # and here rename it back to the original
                self._data.renameNode(arr_path, arr[0], name=arr[0] + "__temp")


        # process data arrays


    elif request.method == 'GET':

    elif request.method == 'DELETE':

    else:
        # such a method not supported
        response = HttpResponse(meta_messages["invalid_method"])
        response.status_code = 405
        return response

    """
    return HttpResponse(request.raw_post_data)



"""
    dataset_form = form_class(request.user)
    if request.method == 'POST':
        if request.POST.get("action") == "create":
            dataset_form = form_class(request.user, request.POST)
            if dataset_form.is_valid():
                dataset = dataset_form.save(commit=False)
                dataset.owner = request.user
                dataset.save()
                dataset_form.save_m2m()

                # create default section to add files
                section = Section(title="link files here", parent_dataset=dataset, tree_position=1)
                section.save()
                
                request.user.message_set.create(message=_("Successfully created dataset '%s'") % dataset.title)
                include_kwargs = {"id": dataset.id}
                #redirect_to = reverse("dataset_details", kwargs=include_kwargs)
                #return HttpResponseRedirect(redirect_to)
                
                return HttpResponseRedirect(dataset.get_absolute_url())

    return render_to_response(template_name, {
        "dataset_form": dataset_form,
    }, context_instance=RequestContext(request))
"""

@login_required
def data_only(request, obj_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def contents(request, obj_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def assign(request, obj_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

@login_required
def select(request, obj_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass

