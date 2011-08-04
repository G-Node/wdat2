from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, HttpResponse, HttpResponseBadRequest
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from neo_api.json_builder import *
from neo_api.models import *
from meta import *
try:
    import json
except ImportError:
    import simplejson as json
import jsonpickle
import re

class HttpResponseBasicJSON(HttpResponse):
    """
    This is a standard JSON response class. Sets up an appropriate Cont-Type.
    """
    def __init__(self, json_content):
        super(HttpResponseBasicJSON, self).__init__(json_content)
        self['Content-Type'] = "application/json"

class HttpResponseFromClassJSON(HttpResponseBasicJSON):
    """
    This is a JSON response class, which expects a python class from which it 
    will pickle a response. User and Message appreciated.
    """
    def __init__(self, class_obj, user=None, message=None):
        if message: class_obj.message = message
        if user: class_obj.logged_in_as = user.username
        json_content = jsonpickle.encode(class_obj, unpicklable=False)
        super(HttpResponseFromClassJSON, self).__init__(json_content)

class HttpResponseCreatedAPI(HttpResponseFromClassJSON):
    status_code = 201

class HttpResponseBadRequestAPI(HttpResponseBasicJSON):
    status_code = 400

class HttpResponseUnauthorizedAPI(HttpResponseBasicJSON):
    status_code = 401

class HttpResponseNotSupportedAPI(HttpResponseBasicJSON):
    status_code = 405

class FakeJSON:
    """
    This is a fake class to construct NEO JSON objects.
    """
    pass


def get_by_neo_id_http(neo_id, user):
    """
    A function to get NEO object by its NEO_ID. 
    Attention! This function returns HTTP response in case an exception occurs.
    """
    try:
        return get_by_neo_id(neo_id, user)
    except TypeError, t:
        return HttpResponseBadRequestAPI(meta_messages["invalid_neo_id"] + "\nNEO_ID: " + str(neo_id))
    except PermissionDenied:
        return HttpResponseUnauthorizedAPI(meta_messages["not_authorized"] + "\nNEO_ID: " + str(neo_id))
    except ObjectDoesNotExist:
        return HttpResponseBadRequestAPI(meta_messages["wrong_neo_id"] + "\nNEO_ID: " + str(neo_id))

def auth_required(func):
    """
    Decorator for views where authentication required. 
    Returns HTTP 403 Unauthorized if user is not authenticated.
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
    Creates, updates, retrieves or deletes a NEO object.
    """
    response = HttpResponseNotSupportedAPI(meta_messages["invalid_method"])
    if request.method == 'POST':
        response = create_or_update(request, neo_id)
    elif request.method == 'GET':
        response = retrieve(request, "full", neo_id)
    elif request.method == 'DELETE':
        response = delete(request, neo_id)
    return response


def create_or_update(request, neo_id=None):
    """
    This is a slave function to create or update a NEO object.
    """
    # a flag to distinguish update/insert mode
    update = False
    to_link, parents = None, None
    try:
        rdata = json.loads(request._get_raw_post_data())
    except ValueError:
        return HttpResponseBadRequestAPI(meta_messages["data_parsing_error"] + str(request._get_raw_post_data()))

    # all POST requests should be of type dict
    if not type(rdata) == type({}):
        return HttpResponseBadRequestAPI(meta_messages["data_parsing_error"])

    if neo_id:
        # this is update case
        update = True
        obj = get_by_neo_id_http(neo_id, request.user)
        if isinstance(obj, HttpResponse):
            return obj
        obj_type = obj.obj_type
        message = meta_messages["object_updated"]
    else:
        # this is create case
        try:
            obj_type = rdata["obj_type"]
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
        if rdata.has_key(attr):
            obj_attr = rdata[attr]
            setattr(obj, attr, obj_attr)
            if rdata.has_key(attr + "__unit"):
                obj_attr_unit = rdata[attr + "__unit"]
                setattr(obj, attr + "__unit", obj_attr_unit)
        elif _attr.startswith("_") and not update:
            return HttpResponseBadRequestAPI(obj_type + ": " + attr + "\n" + meta_messages["missing_parameter"])
    if not update:
        obj.author = request.user
    if rdata.has_key("datafile_id"):
        obj_attr = rdata["datafile_id"]
        # enable this when file integration is done TODO
        #obj.file_origin = Datafile.objects.get(id=datafile_id)

    # processing data-related attributes
    if meta_data_attrs.has_key(obj_type):
        for data_attr in meta_data_attrs[obj_type]:
            if rdata.has_key(data_attr):
                if data_attr == "waveforms":
                    # Waveforms - it's a special case, 2-3D array. Parsing and update is made of 
                    # three stages: we create new waveforms first (no save), then delete old
                    # ones, then save and assign new waveforms to the host object.
                    waveforms = rdata[data_attr] # some processing is done later in this view
                    if not getattr(waveforms, "__iter__", False):
                        return HttpResponseBadRequestAPI(meta_messages["not_iterable"] + ": waveforms")
                    to_link = [] # later this list is used to link waveforms to the obj
                    for wf in waveforms:
                        try:
                            w = WaveForm()
                            try:
                                w.channel_index = wf["channel_index"]
                                w.waveform = wf["waveform"]["data"]
                                w.waveform__unit = wf["waveform"]["units"]
                                w.author = request.user
                                if obj_type == "spiketrain":
                                    w.time_of_spike_data = wf["time_of_spike"]["data"]
                                    w.time_of_spike__unit = wf["time_of_spike"]["units"]
                                to_link.append(w)
                            except KeyError:
                                return HttpResponseBadRequestAPI(meta_messages["data_missing"])
                            except ValueError, v:
                                return HttpResponseBadRequestAPI(meta_messages["bad_float_data"] + v.message)
                        except AttributeError, TypeError:
                            return HttpResponseBadRequestAPI(meta_messages["dict_required"] + data_attr)
                else:
                    attr = rdata[data_attr]
                    # some checks
                    if not (type(attr) == type({})):
                        return HttpResponseBadRequestAPI(meta_messages["dict_required"] + data_attr)
                    if not attr.has_key("data"):
                        return HttpResponseBadRequestAPI(meta_messages["data_missing"])
                    # try to assign value/array. for data parsing see class decorators
                    try:
                        setattr(obj, data_attr, attr["data"])
                    except ValueError, v:
                        return HttpResponseBadRequestAPI(meta_messages["bad_float_data"] + v.message)
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
            if rdata.has_key(r):
                parent_ids = rdata[r]
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
                if rdata.has_key(r):
                    parent = get_by_neo_id_http(rdata[r], request.user)
                    if isinstance(parent, HttpResponse):
                        return parent
                    setattr(obj, r, parent)

    # catch exception if any of values provided do not match
    try:
        obj.full_clean()
    except ValidationError, VE:
        # making an output nicer
        errors = [(str(k) + ": " + str(v)) for k, v in VE.message_dict.items()]
        to_render = "\n".join(errors)
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

    request.method = "GET" # return the GET 'info' about the object
    return retrieve(request, "info", obj.neo_id, message, not update)


@auth_required
def retrieve(request, enquery, neo_id, message=None, new=False):
    """
    This is a slave function to retrieve a NEO object by given NEO_ID. Due to 
    security reasons we do full manual reconstruction of the JSON object from 
    its django brother.
    """
    if not request.method == "GET":
        return HttpResponseNotSupportedAPI(meta_messages["invalid_method"])
    obj = get_by_neo_id_http(neo_id, request.user)
    if isinstance(obj, HttpResponse):
        return obj
    n = FakeJSON()
    setattr(n, "neo_id", obj.neo_id)
    if not enquery in ("full", "info", "data", "parents", "children"):
        return Http404
    assigned = False # this will raise an error if requested data does not exist
    if enquery == "info" or enquery == "full":
        assigned = assign_attrs(n, obj) or assigned
    if enquery == "data" or enquery == "full":
        params = {}
        try:
            for k, v in request.GET.items():
                if k in allowed_range_params.keys() and allowed_range_params.get(k)(v):
                    params[str(k)] = allowed_range_params.get(k)(v)
        except ValueError, e:
            return HttpResponseBadRequestAPI(e.message)
        try:
            assigned = assign_data_arrays(n, obj, **params) or assigned
        except IndexError, e:
            return HttpResponseBadRequestAPI(e.message)
        except ValueError, e:
            return HttpResponseBadRequestAPI(e.message)
    if enquery == "parents" or enquery == "full":
        assigned = assign_parents(n, obj) or assigned
    if enquery == "children" or enquery == "full":
        assigned = assign_children(n, obj) or assigned
    assign_common(n, obj)
    if not assigned:
        return HttpResponseBadRequestAPI(meta_messages["no_enquery_related"] % enquery)
    if new: return HttpResponseCreatedAPI(n, request.user, message)
    return HttpResponseFromClassJSON(n, request.user)


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
        resp_data = {
            "selected": selected,
            "object_total": len(objects),
            "object_selected": len(objects),
            "selected_as_of": 0,
            "message": message
        }
        return HttpResponseBasicJSON(json.dumps(resp_data))
    else:
        return HttpResponseBadRequestAPI(meta_messages["invalid_obj_type"])



@auth_required
def assign(request, neo_id):
    """
    Basic operations with NEO objects. Save, get and delete.
    """
    pass


@auth_required
def delete(request, neo_id):
    """
    This is a slave function to delete a NEO object by given NEO_ID.
    """
    pass

