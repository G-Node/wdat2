from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.views.decorators.http import condition
from django.utils import simplejson as json
from django.utils.encoding import smart_unicode
from django.db import models
from django.db.models.fields import FieldDoesNotExist

import settings
import hashlib

from rest.common import *
from rest.meta import *


class RESTManager(object):
    """
    An abstract class that implements basic REST API functions like get single 
    object, get list of objects, create, update and delete objects.
    """
    def __init__(self, handler, model):
        self.handler = handler() # serializer
        self.model = model # required
        self.list_filters = { # this is a full list, overwrite in a parent class
            'top': top_filter,
            'section_id': parent_section_filter,
            'visibility': visibility_filter,
            'owner': owner_filter,
            'created_min': created_min_filter,
            'created_max': created_max_filter,
        }
        self.assistant = {} # to store some params for serialization/deserial.

    def get(self, request, obj):
        """ retrieve and serialize single object """
        resp_data = self.handler.serialize([obj], options=self.build_options(request))[0]
        return BasicJSONResponse(resp_data, "retrieved", request)

    def get_list(self, request, *args, **kwargs):
        """ returns requested objects list """
        message_type = "no_objects_found"
        start_index, max_results = 0, 1000 # default
        try: # assert request parameters both from request.GET and from kwargs
            params = {} # a dict to later filter requested data
            for k, v in dict(request.GET.items() + kwargs.items()).items():
                if k in request_params_cleaner.keys() and request_params_cleaner.get(k)(v):
                    params[str(k)] = request_params_cleaner.get(k)(v)
        except (ObjectDoesNotExist, ValueError, IndexError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="wrong_params", request=request)
        # pre- filters
        objects = filter(lambda s: s.is_accessible(request.user), self.model.objects.all())
        objects_total = len(objects)
        # model-dependent filters
        for filter_name in self.list_filters:
            if filter_name in params.keys() and objects:
                filter_func = self.get_filter_by_name(filter_name)
                objects = filter_func(objects, params[filter_name], request.user)
        # post- filters
        if "start_index" in params.keys() and params["start_index"] < \
            len(objects) and objects:
            start_index = params["start_index"]
        objects = objects[start_index:]
        if "max_results" in params.keys() and params["max_results"] < \
            len(objects) and objects:
            max_results = params["max_results"]
        objects = objects[:max_results]
        resp_data = {
            "objects_total": objects_total,
            "objects_selected": len(objects),
            "selected_range": [start_index, start_index + len(objects)],
        }
        if objects:
            message_type = "object_selected"
            resp_data["selected"] = self.handler.serialize(objects, self.build_options(request))
        else:
            resp_data["selected"] = None
        return BasicJSONResponse(resp_data, message_type, request)


    def create_or_update(self, request, obj=None):
        """
        We "boycott" everything "that's not made by our hands" for security and
        practical reasons (no automatic JSON parsing into an object). Create and
        update have very similar functionality thus implemented as one function.
        """
        try:
            rdata = json.loads(request._get_raw_post_data())
        except ValueError:
            return BadRequest(message_type="data_parsing_error", request=request)

        if not type(rdata) == type({}):
            return BadRequest(message_type="data_parsing_error", request=request)

        if not obj == None:
            update = True
            if not obj.is_editable(request.user): # method should exist, ensure
                return Unauthorized(message_type="not_authorized", request=request)
        else:
            update = False
            obj = self.model() # create object skeleton
            if hasattr(obj, "author"):
                obj.author = request.user
            else:
                obj.owner = request.user

        # fields / values can be in both 'fields' attr or just in the request
        if rdata.has_key('fields'):
            rdata = rdata['fields']

        # processing attributes
        for field_name, field_value in rdata.iteritems():
            if isinstance(field_value, str):
                field_value = smart_unicode(field_value, getattr(request, "encoding", None) or settings.DEFAULT_CHARSET, strings_only=True)
            try:
                field = self.model._meta.get_field(field_name)
            except FieldDoesNotExist, v:
                return BadRequest(json_obj={"details": v.message}, \
                    message_type="post_data_invalid", request=request)

            # Handle special fields
            if hasattr(self.model, "is_special_field"):
                if self.model.is_special_field(field_name): # every model can have special fields
                    self.process_special_field(self, obj, field_name, field_value)

            # Handle M2M relations TODO

            # Handle FK fields (taken from django.core.Deserializer)
            elif field.rel and isinstance(field.rel, models.ManyToOneRel):
                if field_value is not None:
                    if hasattr(field.rel.to._default_manager, 'get_by_natural_key'):
                        if hasattr(field_value, '__iter__'):
                            relativ = field.rel.to._default_manager.db_manager(db).get_by_natural_key(*field_value)
                            value = getattr(relativ, field.rel.field_name)
                            # If this is a natural foreign key to an object that
                            # has a FK/O2O as the foreign key, use the FK value
                            if field.rel.to._meta.pk.rel:
                                value = value.pk
                        else:
                            value = field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value)
                        setattr(obj, field.attname, value)
                    else:
                        setattr(obj, field.attname, \
                            field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value))
                else:
                    setattr(obj, field.attname, None)

            # Handle data/units fields
            elif self.is_data_field(field_name, field_value): # process data field (with units)
                try: # for data parsing see class methods / decorators
                    setattr(obj, field_name, field_value["data"])
                    setattr(obj, field_name + "__unit", value["unit"])
                except ValueError, v:
                    return BadRequest(json_obj={"details": v.message}, \
                        message_type="bad_float_data", request=request)
            elif field.editable:
                setattr(obj, field_name, field.to_python(field_value))

        try: # catch exception if any of values provided do not match
            obj.full_clean()
        except ValidationError, VE:
            return BadRequest(json_obj=VE.message_dict, \
                message_type="bad_parameter", request=request)

        obj.save() # processing (almost) done

        self.run_post_processing(obj) # again, for some special cases

        if update:
            request.method = "GET"
            return self.get(request, obj)
        options = self.build_options(request)
        options["q"] = "info"
        resp_data = self.handler.serialize([obj], options=options)[0]
        #return Created({'permalink': request.build_absolute_uri(obj.get_absolute_url())}, \
        #    message_type="object_created", request=request)
        return Created(resp_data, message_type="object_created", request=request)


    def delete(self, request, obj):
        """ delete (archive) provided object """
        if obj.is_editable(request.user): # method should exist, ensure
            obj.delete_object()
            return BasicJSONResponse(message_type="deleted", request=request)
        else:
            return Unauthorized(message_type="not_authorized", request=request)

    def get_filter_by_name(self, filter_name):
        return self.list_filters[filter_name]

    def is_data_field(self, attr_name, value):
        """ determines if a given field has units and requires special proc."""
        if type(value) == type({}) and value.has_key("data") and \
            value.has_key("unit"):
            return True
        return False

    def is_special_field(self, attr_name, value):
        """ abstract method. determines if a field has a special shape """
        return False

    def process_special_field(self, obj, attr_name, value):
        """ abstract method. use to process special shapes of some fields """
        raise NotImplementedError("This is an abstract method. Please define it\
            in a parent class.")

    def run_post_processing(self, obj):
        pass

    def build_options(self, request):
        options = dict(request.GET)
        options["permalink_host"] = '%s://%s' % (request.is_secure() and \
            'https' or 'http', request.get_host())
        return options

# HANDLERS ---------------------------------------------------------------------


class ObjectHandler(RESTManager):
    """ Handles requests for a single object """

    def get_obj_etag(self, request, obj_id):
        """ computes etag for object: for the moment it is just the hash of 
        last modified """
        try:
            obj = self.model.objects.get(id = obj_id)
            return hashlib.md5(str(obj.last_modified)).hexdigest()
        except ObjectDoesNotExist:
            return None

    def get_obj_lmodified(self, request, obj_id):
        """ returns last modified """
        try:
            obj = self.model.objects.get(id = obj_id)
            return obj.last_modified
        except ObjectDoesNotExist:
            return None

    #@condition(etag_func=get_obj_etag, last_modified_func=get_obj_lmodified)
    @auth_required
    def __call__(self, request, *args, **kwargs):
        """
        GET: get, PUT/POST: update, DELETE: delete single object. Serves 
        partial data requests (info, data etc.) using GET params.

        request: incoming HTTP request
        obj_id: ID of the object from request URL
        """
        actions = {
            'GET': self.get,
            'PUT': self.create_or_update,
            'POST': self.create_or_update,
            'DELETE': self.delete}
        if request.method in actions.keys() and 'id' in kwargs.keys():
            try: # check the object exists
                obj = self.model.objects.get(id=kwargs['id'])
            except ObjectDoesNotExist:
                return BadRequest(message_type="does_not_exist", request=request)
            if not obj.is_accessible(request.user): # security check
                return Unauthorized(message_type="not_authorized", request=request)
            response = actions[request.method](request, obj)
        else:
            response = NotSupported(message_type="invalid_method", request=request)
        return response


class CategoryHandler(RESTManager):
    """ Handles requests for a single object """

    @auth_required
    def __call__(self, request, *args, **kwargs):
        """ 
        GET: query all objects, PUT/POST: create new, copy.

        request: incoming HTTP request
        """
        actions = {
            'GET': self.get_list,
            'PUT': self.create_or_update,
            'POST': self.create_or_update}
        if request.method in actions.keys():
            return actions[request.method](request, *args, **kwargs)
        return NotSupported(message_type="invalid_method", request=request)


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

def parent_section_filter(objects, value, user=None):
    """ returns objects in a particular section """
    return filter(lambda s: s.section == value, objects) 

def visibility_filter(objects, value, user):
    """ filters public / private / shared """
    if value == "private":
        return filter(lambda s: s.current_state==3, objects)
    if value == "public":
        return filter(lambda s: s.current_state==1, objects)
    if value == "shared":
        return filter(lambda s: not s.owner==user, objects)

def owner_filter(objects, value, user):
    """ objects belonging to a specific user """
    return filter(lambda s: not s.owner==value, objects)

def created_min_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created > value, objects)

def created_max_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created < value, objects)

