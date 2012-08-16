from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError, FieldError
from django.views.decorators.http import condition
from django.utils import simplejson as json
from django.db import models
from django.db.models.fields import FieldDoesNotExist
from django.contrib.auth.models import User
from django.utils.encoding import smart_unicode

from friends.models import Friendship
from datetime import datetime

import settings
import hashlib

from state_machine.models import SafetyLevel, SingleAccess, VersionedM2M
from rest.common import *
from rest.meta import *

# TODO
# simple full-text search filter 
# bulk objects creation
# propagate metadata for NEO
# check ACL
# parent's e-tag should change when child has been changed


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
        self.offset = 0
        self.max_results = settings.REST_CONFIG['max_results'] # 1000
        self.m2m_append = settings.REST_CONFIG['m2m_append'] # True
        self.update = True # create / update via POST
        #self.excluded_bulk_update = () # error when bulk update on these fields


    @auth_required
    def __call__(self, request, obj_id=None, *args, **kwargs):
        """
        GET: get, POST: create/update, DELETE: delete single object. Serves 
        partial data requests (info, data etc.) using GET params.

        request: incoming HTTP request
        obj_id: ID of the object from request URL

        With respect to the overall performance, the algorithm is the following:
        - first it constructs a QuerySet with all user-provided filters from the 
        request, security filters etc.
        - then it evaluates the QuerySet getting object ids from the database
        - then another QuerySet is being built, requesting objects with the
        relatives, m2m (if needed) but only for the ids, filtered in steps 1-2.
        """
        kwargs = {}
        if self.options.has_key('at_time'): # to fetch a particular version
            kwargs['at_time'] = self.options['at_time']

        if request.method in self.actions.keys():

            if obj_id: # single object case
                objects = self.model.objects.filter( **kwargs )
                objects = objects.filter( local_id = obj_id )
                if not objects: # object not exists?
                    return NotFound(message_type="does_not_exist", request=request)
                if request.method == 'GET': # get single object
                    if not objects[0].is_accessible(request.user):
                        return Forbidden(message_type="not_authorized", request=request)

                elif not objects[0].is_editable(request.user): # modify single
                    return Forbidden(message_type="not_authorized", request=request)

            else: # a category case
                update = self.options.has_key('bulk_update')
                if request.method == 'GET' or (request.method == 'POST' and update):
                    # get or bulk update, important - select related
                    objects = self.model.objects.filter( **kwargs )
                    try:
                        objects = self.do_filter(request.user, objects, update)
                    except (ObjectDoesNotExist, FieldError, ValidationError, ValueError), e:
                        # filter key/value is/are wrong
                        return BadRequest(json_obj={"details": e.message}, \
                            message_type="wrong_params", request=request)
                    except ReferenceError, e: # attempt to update non-editable objects
                        return Forbidden(json_obj={"details": e.message}, \
                            message_type="not_authorized", request=request)

                else: # create case
                    objects = None

            q = self.options.get("q", "info")
            if q == 'full' or q == 'beard':
                kwargs["fetch_children"] = True

            all_ids = objects.values_list( "id", flat=True )
            if len(all_ids) > 0: # evaluate pre-QuerySet here, 1st SQL
                kwargs["id__in"] = self.do_sift(all_ids)
                objects = self.model.objects.get_related( **kwargs )
            else:
                objects = []

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
                    try: 
                        """ here we add local_id to all FKs (not the real IDs 
                        which change from version to version). Note, that all
                        other nice filters like parent__name__contains will not
                        work because of the versioning. """
                        field = self.model._meta.get_field( k )
                        #if field.rel and isinstance(field.rel, models.ManyToOneRel):
                        #    k += '__local_id'
                    except FieldDoesNotExist:
                        pass
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


    def do_sift(self, ids):
        """ simply sifts the given list with the following parameters:
        - offset
        - max_results
        - spacing
        - groups_of """

        offset = self.offset
        if self.options.has_key('offset'):
            offset = self.options["offset"]

        max_results = self.max_results
        if self.options.has_key('max_results'):
            max_results = self.options["max_results"]

        """
        # TODO
        if self.options.has_key('spacing') and self.options.has_key('groups_of'):
            spacing = self.options['spacing']
            groups_of = self.options['groups_of']
            objs = objects.all() # be careful, work with a diff queryset
            length = objs.count()
            if spacing > 0 and groups_of > 0 and groups_of < length:
                fg = int( length / (spacing + groups_of) ) # number of full groups
                for i in range(fg):
                    st_ind = (i * (spacing + groups_of))
                    end_ind = st_ind + groups_of
                    objs = objs | objects.all()[st_ind:end_ind]

                # don't forget there could some objects left as non-full group
                ind = fg * (spacing + groups_of) # index of the 1st object in the 'orphaned' group
                if ((length - 1) - ind) > -1: # some objects left
                    objs = objs | objects.all()[ind:]
            objects = objs
        """
        return ids[ offset: offset + max_results ]

    def do_filter(self, user, objects, update=False):
        """ filter objects as per request params + security filtering """

        # GET params filters
        for key, value in self.options.items():
            matched = [fk for fk in self.list_filters.keys() if key.startswith(fk)]
            if matched and objects:
                filter_func = self.list_filters[matched[0]]
                objects = filter_func(objects, self.options[key], user)

        if self.attr_filters: # include django lookup filters

            # convert to list if needed
            for key, value in self.attr_filters.items():
                if key.find('__in') > 0 and type(value) == type(''):
                    new_val = value.replace('[', '').replace(']', '')
                    new_val = new_val.replace('(', '').replace('])', '')
                    
                    self.attr_filters[key] = [int(v) for v in new_val.split(',')]
            objects = objects.filter(**self.attr_filters)

        # permissions filter:
        # 1. all public objects 
        q1 = objects.filter(safety_level=1).exclude(owner=user)

        # 2. all *friendly*-shared objects
        friends = [f.to_user.id for f in Friendship.objects.filter(from_user=user)] \
            + [f.from_user.id for f in Friendship.objects.filter(to_user=user)]
        q2 = objects.filter(safety_level=2, owner__in=friends)

        # 3. All private direct shares
        dir_acc = [sa.object_id for sa in SingleAccess.objects.filter(access_for=user, \
            object_type=self.model.acl_type())]
        q3 = objects.filter(local_id__in=dir_acc)

        perm_filtered = q1 | q2 | q3

        if update:
            # 1. All private direct shares with 'edit' level
            dir_acc = [sa.id for sa in SingleAccess.objects.filter(access_for=user, \
                object_type=self.model.acl_type(), access_level=2)]
            available = objects.filter(id__in=dir_acc)

            if self.options.has_key('mode') and not self.options['mode'] == 'ignore':
                if not perm_filtered.count() == available.count():
                    raise ReferenceError("Some of the objects in your query are not available for an update.")

            perm_filtered = objects.filter(id__in=dir_acc) # not to damage QuerySet

        objects = perm_filtered | objects.filter(owner=user)

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
            print str(datetime.datetime.now()), "start serialization.."
            try:
                srlzd = self.serializer.serialize(objects, options=self.options)
            except IndexError, e: # wrong index requested while signal slicing
                return BadRequest(json_obj={"details": e.message}, \
                    message_type="wrong_index", request=request)

            print str(datetime.datetime.now()), "serialized.."

            resp_data["selected"] = srlzd
            resp_data["selected_range"] = [self.offset, self.offset + len(objects) - 1]
            message_type = "object_selected"

        if code == 201: # when a new object created, a GET of it is returned
            return Created(resp_data, message_type="object_created", request=request)

        return Success(resp_data, message_type, request)


    def create_or_update(self, request, objects=None):
        """
        We "boycott" everything "that's not made by our hands" for security and
        practical reasons (no automatic JSON parsing into an object). Create and
        update have very similar functionality thus implemented as one function.
        """
        try:
            rdata = self.clean_post_data(request.body)
        except (ValueError, TypeError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="data_parsing_error", request=request)

        try:
            encoding = getattr(request, "encoding", None) or settings.DEFAULT_CHARSET
            if self.options.has_key('m2m_append'):
                self.m2m_append = False

            # parse request data
            # -update_kwargs - new attribute values as a {'attr': value}
            # -fk_dict - new VERSIONED FKs (normal FKs are parsed as attrs), as 
            #    a dict {'relname': new_fk, }
            # -m2m_dict - new m2m rels, as a dict {'relname': [new ids], }
            update_kwargs, m2m_dict, fk_dict = self.serializer.deserialize(rdata, \
                self.model, user=request.user, encoding=encoding, m2m_append=self.m2m_append)

            # TODO insert here the transaction begin

            if objects: # update case
                return_code = 200
            else: # create case
                return_code = 201
                objects = [ self.model( owner = request.user, **update_kwargs ) ]

            self.model.save_changes(objects, update_kwargs, m2m_dict, fk_dict,\
                self.m2m_append)

            # TODO insert here the transaction end

        except FieldDoesNotExist, v:
            return BadRequest(json_obj={"details": v.message}, \
                message_type="post_data_invalid", request=request)
        except (ValueError, TypeError), v:
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

        self.run_post_processing(objects=objects, request=request, rdata=rdata, \
            update_kwargs=update_kwargs, m2m_dict=m2m_dict, fk_dict=fk_dict )

        request.method = "GET"
        if 'local_id' in self.model._meta.get_all_field_names():
            id_attr = 'local_id'
        else:
            id_attr = 'id'
        ids = [ getattr(obj, id_attr) for obj in objects ]
        filt = { id_attr + '__in': ids }
        # need refresh the QuerySet, f.e. in case of a bulk update
        return self.get(request, self.model.objects.get_related( **filt ), return_code)


    def delete(self, request, objects):
        """ delete (archive) provided objects """
        self.model.save_changes(objects, {'current_state': 20}, {}, {}, True)
        return Success(message_type="deleted", request=request)

    def get_filter_by_name(self, filter_name):
        return self.list_filters[filter_name]

    def run_post_processing(self, *args, **kwargs):
        """ use this method for any update post-processing """
        pass        


class ACLHandler(BaseHandler):
    """ Handles ACL for a single object """

    @auth_required
    def __call__(self, request, id, *args, **kwargs):
        """ 
        GET: return ACL, PUT/POST: change permissions for an object.

        request: incoming HTTP request
        """
        def acl_update(objects, safety_level, users, cascade=False):
            """ recursively update permissions """
            model = type( objects[0] ) # TODO make this better

            # first update safety level
            if safety_level:
                for_update = []
                for obj in objects:
                    if not (obj.safety_level == safety_level):
                        for_update.append( obj )
                model.save_changes(for_update, {'safety_level': safety_level}, \
                    {}, {}, False)

            # update single user shares
            if not users == None:
                for obj in objects:
                    obj.share( users )

            # propagate down the hierarchy if cascade
            if cascade:
                for_update = []
                obj_with_related = model.objects.fetch_fks( objects = objects )
                for related in model._meta.get_all_related_objects():
                    if issubclass(related.model, SafetyLevel): # reversed child can be shared

                        for obj in obj_with_related:
                            for_update += getattr(obj, related.get_accessor_name() + '_data')

                if for_update:
                    acl_update(for_update, safety_level, users, cascade)


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
            obj = self.model.objects.get( local_id=id )
        except ObjectDoesNotExist:
            return NotFound(message_type="does_not_exist", request=request)

        if not request.method == 'GET':
            try:
                rdata = self.clean_post_data(request.body)
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

                acl_update([obj], safety_level, users, self.options.has_key('cascade'))
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


# REST wrapper -----------------------------------------------------------------

def get_obj_attr(request, obj_id=None, handler=None, *args, **kwargs):
    """ computes etag / last_modified for a single object """
    if not handler or not obj_id:
        return None
    try:
        try: # try to get object by local ID (+ at_time)
            obj_id = int( obj_id )
            filt = {}
            filt['local_id'] = obj_id
            at_time = request.GET.get('at_time')
            if at_time:
                filt['at_time'] = datetime.datetime.strptime(at_time, "%Y-%m-%d %H:%M:%S")
            obj = handler.model.objects.get( **filt )
            return getattr( obj, kwargs['param_name'] )

        except ValueError: # GUID provided
            obj = handler.model.objects.get_by_guid( obj_id )
            return getattr( obj, kwargs['param_name'] )

    except ObjectDoesNotExist: # do not raise error here, will be raised later
        return None

def get_obj_lmodified(request, obj_id=None, handler=None, *args, **kwargs):
    kwargs['param_name'] = 'starts_at'
    return get_obj_attr(request, obj_id, handler, **kwargs)

def get_obj_etag(request, obj_id=None, handler=None, *args, **kwargs):
    kwargs['param_name'] = 'guid'
    return get_obj_attr(request, obj_id, handler, **kwargs)


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
        user = int(value)
        u = User.objects.get(id=user)
    except ValueError: # username is given
        u = User.objects.get(username=value)
    return objects.filter(owner=u)


#-------------------------------------------------------------------------------
# Trigger could be also used for versions update (sets ends_at to now()) when
# other than MySQL database is used

"""
DELIMITER $$

CREATE TRIGGER update_ends_at BEFORE INSERT ON test
FOR EACH ROW BEGIN
    UPDATE test AS a
    INNER JOIN (
        SELECT id FROM test WHERE local_id = NEW.local_id AND ends_at IS NULL
    ) b ON a.id = b.id SET a.ends_at = current_timestamp;
END$$

DELIMITER ;
"""
