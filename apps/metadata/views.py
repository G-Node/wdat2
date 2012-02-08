from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, QueryDict, HttpResponse
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.core import serializers
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import condition
import datetime

from rest.common import *
from rest.meta import *
#from datafiles.models import Datafile
from metadata.models import Section, Property
try:
    import json
except ImportError:
    import simplejson as json
import jsonpickle
import re
import hashlib
import time


@auth_required
def sections(request):
    """ GET: query all sections, PUT/POST: create new, copy """

    def sections_list(request):
        """ returns requested sections list """
        message_type = "no_objects_found"
        start_index, max_results = 0, 1000 # default
        try: # assert GET parameters
            params = {} # a dict to later filter requested data
            for k, v in request.GET.items():
                if k in request_params_cleaner.keys() and request_params_cleaner.get(k)(v):
                    params[str(k)] = request_params_cleaner.get(k)(v)
        except (ObjectDoesNotExist, ValueError, IndexError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="wrong_params", request=request)
        sections = filter(lambda s: s.is_accessible(request.user), Section.objects.all())
        sections_total = len(sections)
        if "top" in params.keys() and sections: # return only top sections of the tree
            if params["top"] == "owned":
                sections = Section.objects.filter(owner=user, parent_section=None)
            if params["top"] == "shared":
                """ top shared sections for a given user. if a section's direct 
                parent is not shared, a section displays on top of the tree. """
                shared_sections = filter(lambda s: s.is_accessible(user), Section.objects.exclude(owner=user))
                sections = filter(lambda s: s.parent_section not in shared_sections, shared_sections) 
        if "section_id" in params.keys() and sections:
            sections = sections.filter(parent_section=params["section_id"])
        if "visibility" in params.keys() and sections:
            if params["visibility"] == "private":
                sections = filter(lambda s: s.current_state==3, sections)
            if params["visibility"] == "public":
                sections = filter(lambda s: s.current_state==1, sections)
            if params["visibility"] == "shared":
                sections = filter(lambda s: not s.owner==request.user, sections)
        if "owner" in params.keys() and sections:
            sections = filter(lambda s: not s.owner==params["owner"], sections)
        if "created_min" in params.keys() and sections:
            sections = filter(lambda s: s.date_created > params["created_min"], sections)
        if "created_max" in params.keys() and sections:
            sections = filter(lambda s: s.date_created < params["created_max"], sections)
        if "start_index" in params.keys() and params["start_index"] < \
            len(sections) and sections:
            start_index = params["start_index"]
        sections = sections[start_index:]
        if "max_results" in params.keys() and params["max_results"] < \
            len(sections) and sections:
            max_results = params["max_results"]
        sections = sections[:max_results]
        if sections:
            message_type = "object_selected"
        resp_data = {
            "sections_total": sections_total,
            "sections_selected": len(sections),
            "selected_range": [start_index, start_index + len(sections)],
        }
        if sections: #FIXME stupidly need to serialize twice, workaround?
            js = json.loads(serializers.serialize(get_serial_type(request), \
                sections, ensure_ascii=False))
            resp_data["selected"] = js #FIXME check values!!
        else:
            resp_data["selected"] = None
        return BasicJSONResponse(resp_data, message_type, request)

    def create_section(request):
        try: # parse incoming JSON
            deserialized = serializers.deserialize(get_serial_type(request), \
                request._get_raw_post_data())
        except:
            return BadRequest(message_type="data_parsing_error", request=request)
        try: # TODO maybe do some params cleaning here
            for s in deserialized:
                s.save()
        except Exception, e: # no errors are accepted
            return BadRequest(json_obj={"details": e.message}, \
                    message_type="wrong_params", request=request)
        return Created(message_type="object_created", request=request)

    actions = {
        'GET': sections_list,
        'PUT': create_section,
        'POST': create_section}
    if request.method in actions.keys():
        response = actions[request.method](request)
    else:
        response = NotSupported(message_type="invalid_method", request=request)
    return response


def get_section_etag(request, section_id):
    """ computes etag for section: for now just the hash of last modified """
    try:
        section = Section.objects.get(id = section_id)
        return hashlib.md5(str(section.last_modified)).hexdigest()
    except ObjectDoesNotExist:
        return None

def get_section_lmodified(request, obj_id):
    """ returns last modified """
    try:
        section = Section.objects.get(id = section_id)
        return section.last_modified
    except ObjectDoesNotExist:
        return None


@auth_required
@condition(etag_func=get_section_etag, last_modified_func=get_section_lmodified)
def section_details(request, obj_id):
    """ GET: get single section, PUT/POST: update (move), DELETE: archive section.
    serve partial data requests (info, data etc.) with GET params. """

    def get_section(request, section): #FIXME double serialization
        resp_data = json.loads(serializers.serialize(get_serial_type(request), \
            [section], ensure_ascii=False)) #TODO remove square brackets?
        return BasicJSONResponse(resp_data, "retrieved", request)

    def update_section(request, section):
        if section.is_editable(request.user):
            try:
                for s in serializers.deserialize(get_serial_type(request), \
                    request._get_raw_post_data()):
                    # take the ID from the URL, not from the POST body
                    s.object.id = section.id
                    s.save()
            except Exception, e: # no errors are accepted
                return BadRequest(json_obj={"details": e.message}, \
                        message_type="wrong_params", request=request)
        else:
            return Unauthorized(message_type="not_authorized", request=request)

    def delete_section(request, section):
        if section.is_editable(request.user):
            section.delete_object()
            return BasicJSONResponse(message_type="deleted", request=request)
        else:
            return Unauthorized(message_type="not_authorized", request=request)

    actions = {
        'GET': get_section,
        'PUT': update_section,
        'POST': update_section,
        'DELETE': delete_section}
    if request.method in actions.keys():
        try: # check the object exists
            section = Section.objects.get(id=obj_id)
        except ObjectDoesNotExist:
            return BadRequest(message_type="does_not_exist", request=request)
        if not section.is_accessible(request.user): # security check
            return Unauthorized(message_type="not_authorized", request=request)
        response = actions[request.method](request, section)
    else:
        response = NotSupported(message_type="invalid_method", request=request)
    return response







