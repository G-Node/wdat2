from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError, FieldError
from django.views.decorators.http import condition
from django.utils import simplejson as json
from django.db import models
from django.db.models.fields import FieldDoesNotExist
from django.contrib.auth.models import User
from django.utils.encoding import smart_unicode

from friends.models import Friendship

import settings
import hashlib

from state_machine.models import SafetyLevel, SingleAccess
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
        self.model = model # the model to work with, required
        self.list_filters = { # common filters, extend in a parent class
            'top': top_filter,
            'visibility': visibility_filter,
            'owner': owner_filter,
        }
        self.assistant = {} # to store some params for serialization/deserial.
        self.actions = {
            'GET': self.get,
            'POST': self.create_or_update,
            'DELETE': self.delete }
        self.start_index = 0
        self.max_results = settings.REST_CONFIG['max_results'] # 1000
        self.m2m_append = settings.REST_CONFIG['m2m_append'] # True
        self.update = True # create / update via POST


    @auth_required
    def __call__(self, request, obj_id=None, *args, **kwargs):
        """
        GET: get, POST: create/update, DELETE: delete single object. Serves 
        partial data requests (info, data etc.) using GET params.

        request: incoming HTTP request
        obj_id: ID of the object from request URL
        """
        if request.method in self.actions.keys():

            if obj_id: # single object case
                objects = self.model.objects.filter(id=obj_id)
                if not objects: # object not exists?
                    return NotFound(message_type="does_not_exist", request=request)
                if request.method == 'GET' and not objects[0].is_accessible(request.user):
                    # get single object
                    return Forbidden(message_type="not_authorized", request=request)

                elif not objects[0].is_editable(request.user):
                    # update or delete single
                    return Forbidden(message_type="not_authorized", request=request)

            else: # a category case
                update = self.options.has_key('bulk_update')
                if request.method == 'GET' or (request.method == 'POST' and update):
                    # get or bulk update
                    objects = self.model.objects.all()
                    try:
                        objects = self.do_filter(request.user, objects, update)
                    except (ObjectDoesNotExist, FieldError, ValidationError), e:
                        # filter key/value is/are wrong
                        return BadRequest(json_obj={"details": e.message}, \
                            message_type="wrong_params", request=request)
                    except ReferenceError, e: # attempt to update non-editable objects
                        return Forbidden(json_obj={"details": e.message}, \
                            message_type="not_authorized", request=request)

                else: # create case
                    objects = None

            return self.actions[request.method](request, objects)
        else:
            return NotSupported(message_type="invalid_method", request=request)


    def clean_get_params(self, request):
        """ clean request GET params """
        attr_filters = {}
        params = {}
        try: # assert request parameters both from request.GET and from kwargs
            for k, v in request.GET.items():

                # predefined filters; taking first match
                matched = [key for key in request_params_cleaner.keys() if k.startswith(key)]
                if matched:
                    params[smart_unicode(k)] = request_params_cleaner.get(matched[0])(v)

                else: # attribute- and other filters
                    attr_filters[smart_unicode(k)] = smart_unicode(v)

            params["permalink_host"] = '%s://%s' % (request.is_secure() and \
                'https' or 'http', request.get_host())
            self.options = params
            self.attr_filters = attr_filters # save here attribute-specific filters
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


    def do_filter(self, user, objects, update=False):
        """ filter objects as per request params """
        for key, value in self.options.items():
            matched = [fk for fk in self.list_filters.keys() if key.startswith(fk)]
            if matched and objects:
                filter_func = self.list_filters[matched[0]]
                objects = filter_func(objects, self.options[key], user)

        if self.attr_filters: # include attr filters
            objects = objects.filter(**self.attr_filters)


        # permissions filter:

        # 1. all public objects 
        q1 = objects.filter(safety_level=1).exclude(owner=user)

        # 2. all *friendly*-shared objects
        friends = [f.to_user.id for f in Friendship.objects.filter(from_user=user)] \
            + [f.from_user.id for f in Friendship.objects.filter(to_user=user)]
        q2 = objects.filter(safety_level=2, owner__in=friends)

        # 3. All private direct shares
        dir_acc = [sa.id for sa in SingleAccess.objects.filter(access_for=user, \
            object_type=self.model.acl_type)]
        q3 = objects.filter(id__in=dir_acc)

        perm_filtered = q1 | q2 | q3

        if update:
            # 1. All private direct shares with 'edit' level
            dir_acc = [sa.id for sa in SingleAccess.objects.filter(access_for=user, \
                object_type=self.model.acl_type, access_level=2)]
            available = objects.filter(id__in=dir_acc)

            if not self.options['mode'] == 'ignore':
                if not perm_filtered.count() == available.count():
                    raise ReferenceError("Some of the objects in your query are prohibited from update.")

            perm_filtered = objects.filter(id__in=dir_acc) # not to damage QuerySet

        objects = perm_filtered | objects.filter(owner=user)

        start_index = self.start_index
        if "start_index" in self.options.keys() and self.options["start_index"] < \
            len(objects) and objects:
            start_index = self.options["start_index"]
        objects = objects[start_index:]

        # filtering by groups of some number with some spacing - periodic filter
        if self.options.has_key('spacing') and self.options.has_key('groups_of'):
            spacing = self.options['spacing']
            groups_of = self.options['groups_of']
            filtered = []
            if spacing > 0 and groups_of > 0 and groups_of < len(objects):
                fg = int( len(objects) / (spacing + groups_of) ) # number of full groups
                for i in range(fg):
                    for j in range(groups_of):
                        filtered.append(objects[(i * (spacing + groups_of)) + j])
                # don't forget there could some objects left as non-full group
                ind = fg * (spacing + groups_of) # index of the 1st object in the orphaned group
                left = groups_of
                if groups_of > len(objects) - ind: # if objects left are not enough to fill a group
                    left = len(objects) - ind
                for i in range(left):
                    filtered.append(objects[ind + i])
            objects = filtered

        max_results = self.max_results
        if "max_results" in self.options.keys() and self.options["max_results"] < \
            len(objects) and objects:
            max_results = self.options["max_results"]
        objects = objects[:max_results]

        return objects


    def get(self, request, objects, code=200):
        """ returns requested objects list """
        message_type = "no_objects_found"
        resp_data = {
            "objects_selected": len(objects),
            "selected_range": None,
            "selected": None
        }
        if objects:
            resp_data["selected_range"] = [self.start_index, self.start_index + len(objects) - 1]
            resp_data["selected"] = self.serializer.serialize(objects, options=self.options)
            message_type = "object_selected"
        if code == 201:
            return Created(resp_data, message_type="object_created", request=request)
        return Success(resp_data, message_type, request)


    def create_or_update(self, request, objects=None):
        """
        We "boycott" everything "that's not made by our hands" for security and
        practical reasons (no automatic JSON parsing into an object). Create and
        update have very similar functionality thus implemented as one function.
        """
        try:
            rdata = self.clean_post_data(request._get_raw_post_data())
        except (ValueError, TypeError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="data_parsing_error", request=request)

        if objects: # FIXME performance!
            for obj in objects:
                if not obj.is_editable(request.user): # method should exist, ensure
                    return Forbidden(message_type="not_authorized", request=request)
            return_code = 200
        else:
            objects = [self.model()] # create object skeleton
            objects[0].owner = request.user
            return_code = 201

        try:
            encoding = getattr(request, "encoding", None) or settings.DEFAULT_CHARSET
            if self.options.has_key('m2m_append'):
                self.m2m_append = False
            self.serializer.deserialize(rdata, objects, user=request.user,\
                encoding=encoding, m2m_append=self.m2m_append)
        except FieldDoesNotExist, v:
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

        request.method = "GET"
        return self.get(request, objects, return_code)


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

        def clean_users(users):
            """ if users contain usernames they should be resolved """
            cleaned_users = {}
            for user, access in users.items():
                try: # resolving users
                    user = int(user)
                    u = User.objects.get(id=user)
                except ValueError: # username is given
                    u = User.objects.get(username=user)

                # resolving access types
                if not access in dict(SingleAccess.ACCESS_LEVELS).keys():
                    keys = [k for k, v in dict(SingleAccess.ACCESS_LEVELS).iteritems() \
                        if smart_unicode(access).lower() in v.lower()]
                    if keys:
                        access = keys[0]
                    else:
                        raise ValueError("Provided access level for the user ID %s \
                    is not valid: %s" % (u.username, access))

                cleaned_users[u.id] = access
            return cleaned_users

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
                    users = clean_users(rdata['shared_with'])

                acl_update(obj, safety_level, users, self.options.has_key('cascade'))
            except ValidationError, VE:
                return BadRequest(json_obj=VE.message_dict, \
                    message_type="bad_parameter", request=request)
            except (ObjectDoesNotExist, AssertionError, AttributeError, ValueError), e:
                return BadRequest(json_obj={"details": e.message}, \
                    message_type="post_data_invalid", request=request)

        resp_data = {}
        resp_data['safety_level'] = obj.safety_level
        resp_data['shared_with'] = dict([(sa.access_for.username, sa.access_level) \
            for sa in obj.shared_with])
        return Success(resp_data, "object_selected", request)



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



# FILTERS ----------------------------------------------------------------------

def top_filter(objects, value, user):
    """ for hierarchical models, returns the top of the hierarchy """
    if value == "owned":
        return objects.filter(owner=user, parent_section=None)
    if value == "shared":
        """ top shared objects for a given user. if a section's direct 
        parent is not shared, a section displays on top of the tree. """
        shared = objects.exclude(owner=user)
        return shared.filter(parent_section=None)

def visibility_filter(objects, value, user):
    """ filters public / private / shared """
    if value == "private":
        return objects.filter(current_state=3)
    if value == "public":
        return objects.filter(current_state=1)
    if value == "shared":
        return objects.exclude(owner=user) # permissions are validated later anyway

def owner_filter(objects, value, user):
    """ objects belonging to a specific user, by ID """
    try: # resolving users
        user = int(user)
        u = User.objects.get(id=user)
    except ValueError: # username is given
        u = User.objects.get(username=user)
    return objects.filter(owner=u)




