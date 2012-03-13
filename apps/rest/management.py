from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.views.decorators.http import condition
from django.utils import simplejson as json
from django.db import models
from django.db.models.fields import FieldDoesNotExist

import settings
import hashlib

from state_machine.models import SafetyLevel
from rest.common import *
from rest.meta import *

# TODO
# simple full-text search filter 
# bulk objects creation


class BaseHandler(object):
    """
    An abstract class that implements basic REST API functions like get single 
    object, get list of objects, create, update and delete objects.
    """
    def __init__(self, serializer, model):
        self.serializer = serializer() # serializer
        self.model = model # required
        self.list_filters = { # this is a full list, overwrite in a parent class
            'top': top_filter,
            'visibility': visibility_filter,
            'owner': owner_filter,
            'created_min': created_min_filter,
            'created_max': created_max_filter,
        }
        self.assistant = {} # to store some params for serialization/deserial.
        self.actions = {
            'GET': self.get,
            'POST': self.create_or_update,
            'DELETE': self.delete }
        self.start_index = 0
        self.max_results = 100
        self.m2m_append = True
        self.update = True # create / update via POST

    @auth_required
    def __call__(self, request, obj_id=None, *args, **kwargs):
        """
        GET: get, PUT/POST: update, DELETE: delete single object. Serves 
        partial data requests (info, data etc.) using GET params.

        request: incoming HTTP request
        obj_id: ID of the object from request URL
        """
        if request.method in self.actions.keys():
            objects = None

            if obj_id: # single object case
                try: # object exists?
                    obj = self.model.objects.get(id=obj_id)
                except ObjectDoesNotExist:
                    return NotFound(message_type="does_not_exist", request=request)
                if not obj.is_accessible(request.user): # first security check
                    return Forbidden(message_type="not_authorized", request=request)
                objects = [obj]

            else:# a category case
                objects = self.model.objects.all()
                import pdb
                pdb.set_trace()
                if not self.options.has_key('bulk_update') and request.method == 'POST':
                    self.update = False

            if self.update: # filtering
                objects = self.do_filter(request.user, objects)

            return self.actions[request.method](request, objects)
        else:
            return NotSupported(message_type="invalid_method", request=request)


    def clean_get_params(self, request):
        """ clean request GET params """
        try: # assert request parameters both from request.GET and from kwargs
            params = {} # a dict to later filter requested data
            for k, v in request.GET.items():
                if k in request_params_cleaner.keys():
                    params[str(k)] = request_params_cleaner.get(k)(v)
            params["permalink_host"] = '%s://%s' % (request.is_secure() and \
                'https' or 'http', request.get_host())
            self.options = params
        except (ObjectDoesNotExist, ValueError, IndexError, KeyError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="wrong_params", request=request)

    def clean_post_data(self, rdata):
        """ post data clean up """
        rdata = json.loads(rdata)
        if not type(rdata) == type({}):
            raise TypeError
        # fields / values can be in both 'fields' attr or just in the request
        if rdata.has_key('fields'):
            rdata = rdata['fields']
        return rdata

    def do_filter(self, user, objects):
        """ filter objects as per request params """
        # model-dependent filters
        for filter_name in self.list_filters:
            if filter_name in self.options.keys() and objects:
                filter_func = self.get_filter_by_name(filter_name)
                objects = filter_func(objects, self.options[filter_name], user)
        # post- filters, in order: security - index - every - max results
        objects = filter(lambda s: s.is_accessible(user), objects)

        if "start_index" in self.options.keys() and self.options["start_index"] < \
            len(objects) and objects:
            self.start_index = self.options["start_index"]
        objects = objects[self.start_index:]

        if self.options.has_key('every') and self.options['every'] > 1 and \
            self.options['every'] < len(objects) + 1:
            filtered = []
            every = self.options['every']
            le = len(objects)
            for i in range( (le - (le % every)) / every ):
                filtered.append(objects[((i + 1) * every) - 1])
            objects = filtered

        if "max_results" in self.options.keys() and self.options["max_results"] < \
            len(objects) and objects:
            self.max_results = self.options["max_results"]
        objects = objects[:self.max_results]

        return objects


    def get(self, request, objects):
        """ returns requested objects list """
        message_type = "no_objects_found"
        resp_data = {
            "objects_selected": len(objects),
            "selected_range": [self.start_index, self.start_index + len(objects)],
            "selected": None
        }
        if objects:
            resp_data["selected"] = self.serializer.serialize(objects, options=self.options)
            message_type = "object_selected"
        return Success(resp_data, message_type, request)


    def create_or_update(self, request, objects=None):
        """
        We "boycott" everything "that's not made by our hands" for security and
        practical reasons (no automatic JSON parsing into an object). Create and
        update have very similar functionality thus implemented as one function.
        """
        try:
            rdata = self.clean_post_data(request._get_raw_post_data())
        except (ValueError, TypeError):
            return BadRequest(message_type="data_parsing_error", request=request)

        if self.update:
            for obj in objects:
                if not obj.is_editable(request.user): # method should exist, ensure
                    return Forbidden(message_type="not_authorized", request=request)
        else:
            objects = [self.model()] # create object skeleton
            objects[0].owner = request.user

        for obj in objects:
            try:
                encoding = getattr(request, "encoding", None) or settings.DEFAULT_CHARSET
                if self.options.has_key('m2m_append'):
                    self.m2m_append = False
                self.serializer.deserialize(rdata, obj, user=request.user,\
                    encoding=encoding, m2m_append=self.m2m_append)
            except FieldDoesNotExist, v: # or pass????
                return BadRequest(json_obj={"details": v.message}, \
                    message_type="post_data_invalid", request=request)
            except ValueError, v:
                return BadRequest(json_obj={"details": v.message}, \
                    message_type="bad_float_data", request=request)
            except ValidationError, VE:
                if hasattr(VE, 'message_dict'):
                    json_obj=VE.message_dict
                else:
                    json_obj={"details": ", ".join(VE.messages)}
                return BadRequest(json_obj=json_obj, \
                    message_type="bad_parameter", request=request)
            except (AssertionError, AttributeError), e:
                return BadRequest(json_obj={"details": e.message}, \
                    message_type="post_data_invalid", request=request)
            except (ReferenceError, ObjectDoesNotExist), e:
                return NotFound(json_obj={"details": e.message}, \
                    message_type="wrong_reference", request=request)

            self.run_post_processing(obj) # for some special cases

        if self.update:
            request.method = "GET"
            return self.get(request, objects)

        self.options["q"] = "info"
        resp_data = self.serializer.serialize(objects, options=self.options)[0]
        return Created(resp_data, message_type="object_created", request=request)


    def delete(self, request, objects):
        """ delete (archive) provided object """
        for obj in objects:
            if obj.is_editable(request.user): # method should exist, ensure
                obj.delete_object()
            else:
                return Forbidden(message_type="not_authorized", request=request)
        return Success(message_type="deleted", request=request)

    def get_filter_by_name(self, filter_name):
        return self.list_filters[filter_name]

    def run_post_processing(self, obj):
        pass


# HANDLERS ---------------------------------------------------------------------

def get_obj_etag(request, obj_id=None, handler=None, *args, **kwargs):
    """ computes etag for object: for the moment it is just the hash of 
    last modified """
    if not handler or not obj_id:
        return None
    try:
        obj = handler.model.objects.get(id = obj_id)
        return hashlib.md5(str(obj.last_modified)).hexdigest()
    except ObjectDoesNotExist:
        return None

def get_obj_lmodified(request, obj_id=None, handler=None, *args, **kwargs):
    """ returns last modified """
    if not handler or not obj_id:
        return None
    try:
        obj = handler.model.objects.get(id = obj_id)
        return obj.last_modified
    except ObjectDoesNotExist:
        return None

@condition(etag_func=get_obj_etag, last_modified_func=get_obj_lmodified)
def process_REST(request, obj_id=None, handler=None, *args, **kwargs):
    """ this is a trick to use eTag/last-modified 'condition' built-in Django 
    decorator. one has to call a function and not a class because 'condition' 
    decorator does not accept the 'self' agrument."""
    error = handler.clean_get_params(request)
    if error:
        return error
    return handler(request, obj_id, *args, **kwargs)


class ACLHandler(BaseHandler):
    """ Handles requests for a single object """

    @auth_required
    def __call__(self, request, id, *args, **kwargs):
        """ 
        GET: return ACL, PUT/POST: change permissions for an object.

        request: incoming HTTP request
        """
        def acl_update(obj, safety_level, users, cascade=False):
            """ recursively update permissions """
            if safety_level:
                obj.safety_level = safety_level
                obj.full_clean()
                obj.save()
            if not users == None:
                obj.share(users)
            if cascade:
                for related in obj._meta.get_all_related_objects():
                    if issubclass(related.model, SafetyLevel): # reversed child can be shared
                        for c in getattr(obj, related.get_accessor_name()).all():
                            acl_update(c, safety_level, users, cascade)

        actions = ('GET', 'PUT', 'POST')
        if not request.method in actions:
            return NotSupported(message_type="invalid_method", request=request)

        try:
            obj = self.model.objects.get(id=id)
        except ObjectDoesNotExist:
            return NotFound(message_type="does_not_exist", request=request)

        if not request.method == 'GET':
            try:
                rdata = self.clean_post_data(request._get_raw_post_data())
            except (ValueError, TypeError):
                return BadRequest(message_type="data_parsing_error", request=request)

            try:
                safety_level = None
                if rdata.has_key('safety_level'):
                    safety_level = rdata['safety_level']

                users = None
                if rdata.has_key('shared_with'):
                    assert type(rdata['shared_with']) == type({}), "Wrong user data."
                    users = rdata['shared_with']

                acl_update(obj, safety_level, users, self.options.has_key('cascade'))
            except ValidationError, VE:
                return BadRequest(json_obj=VE.message_dict, \
                    message_type="bad_parameter", request=request)
            except (AssertionError, AttributeError, ValueError), e:
                return BadRequest(json_obj={"details": e.message}, \
                    message_type="post_data_invalid", request=request)

        resp_data = {}
        resp_data['safety_level'] = obj.safety_level
        resp_data['shared_with'] = dict([(sa.access_for.username, sa.access_level) \
            for sa in obj.shared_with])
        return Success(resp_data, "object_selected", request)



# FILTERS ----------------------------------------------------------------------

def top_filter(objects, value, user):
    """ for hierarchical models, returns the top of the hierarchy """
    objects = None
    if value == "owned":
        return objects.filter(owner=user, parent_section=None)
    if value == "shared":
        """ top shared objects for a given user. if a section's direct 
        parent is not shared, a section displays on top of the tree. """
        shared_objects = filter(lambda s: s.is_accessible(user) and not s.owner==user, objects)
        objects = filter(lambda s: s.parent_section not in shared_objects, shared_objects) 
    return objects

def visibility_filter(objects, value, user):
    """ filters public / private / shared """
    if value == "private":
        return filter(lambda s: s.current_state==3, objects)
    if value == "public":
        return filter(lambda s: s.current_state==1, objects)
    if value == "shared":
        return filter(lambda s: not s.owner==user, objects)

def owner_filter(objects, value, user):
    """ objects belonging to a specific user, by ID """
    return filter(lambda s: s.get_owner().username == value, objects)

def created_min_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created > value, objects)

def created_max_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created < value, objects)

