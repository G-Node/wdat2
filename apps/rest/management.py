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

            if objects: # preselect related
                offset = self.offset
                if self.options.has_key('offset'):
                    offset = self.options["offset"]

                max_results = self.max_results
                if self.options.has_key('max_results'):
                    max_results = self.options["max_results"]

                # here we use real ids, objects are already version-filtered
                kwargs["id__in"] = objects.values_list( "id", flat=True ) # 1 SQL
                objects = self.model.objects.get_related( **kwargs )[ offset: offset + max_results ]

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


    def do_filter(self, user, objects, update=False):
        """ filter objects as per request params """

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

        # offset - max_results - groups_of - spacing filters
        # create list of indexes first, then evaluate the queryset
        # these filters temporary switched off

        """
        # evaluate queryset here
        objects = objects.all()[ offset: offset + max_results ]

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
            try:
                srlzd = self.serializer.serialize(objects, options=self.options)
            except IndexError, e: # wrong index requested while signal slicing
                return BadRequest(json_obj={"details": e.message}, \
                    message_type="wrong_index", request=request)

            resp_data["selected"] = srlzd
            resp_data["selected_range"] = [self.offset, self.offset + len(objects) - 1]
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

        try:
            encoding = getattr(request, "encoding", None) or settings.DEFAULT_CHARSET
            if self.options.has_key('m2m_append'):
                self.m2m_append = False

            # parse the request data
            update_kwargs, m2m_dict, fk_dict = self.serializer.deserialize(rdata, \
                self.model, user=request.user, encoding=encoding, m2m_append=self.m2m_append)

            # TODO insert here the transaction begin

            # TODO implement efficient bulk update?

            if objects: # update case
                return_code = 200
                for obj in objects:
                    # update normal attrs
                    for name, value in update_kwargs.items():
                        setattr(obj, name, value)
                    obj.full_clean()

            else: # create case
                return_code = 201
                objects = [ self.model( owner = request.user, **update_kwargs ) ]

            # update FKs in that way so the FK validation doesn't fail
            for field_name, related_obj in fk_dict.items():
                for obj in objects:
                    oid = getattr( related_obj, 'local_id', related_obj.id )
                    setattr(obj, field_name + '_id', oid)
                obj.save()

            # process versioned m2m relations separately
            if m2m_dict:
                local_ids = [ x.local_id for x in objects ]

                for m2m_name, v in m2m_dict.items(): # v - new m2m values
                    # preselect all existing m2ms of type m2m_name for all objs
                    m2m_class = getattr(self.model, m2m_name)

                    # select the reverse relation field of this m2m to filter - 
                    # should be opposite FakeFKField to m2m_name, and should be
                    # unique
                    rev_name = [ f for f in m2m_class._meta.fields if not (f.name == m2m_name) ][0]

                    filt = dict( (rev_name + '__in', local_ids) )
                    rel_m2ms = m2m_class.objects.filter( dict(filt, **kwargs) )
                    current_ids = rel_m2ms.objects.values_list( rev_name )

                    now = datetime.datetime.now()

                    # close old existing m2m
                    if not self.m2m_append: 
                        to_close = list( set(current_ids) - set(v) )
                        filt = dict( (rev_name, obj.local_id), (k + "__in", to_close) )
                        m2m_class.objects.filter( **filt ).update( ends_at = now )

                    # create new m2m connections
                    to_create = list( set(v) - set(current_ids) )
                    new_rels = []
                    for nid in to_create:
                        attrs = {}
                        attrs[ rev_name ] = obj.local_id
                        attrs[ k ] = nid
                        attrs[ "date_created" ] = now
                        attrs[ "starts_at" ] = now
                        new_rels.append( m2m_class( **attrs ) )
                    m2m_class.objects.bulk_create( new_rels )

            # TODO insert here the transaction end

            # here is an alternative how to make updates in bulk, which works 
            # faster but does not support versioning yet.
            """
            if len(obj) > 1: # bulk update, obj is QuerySet
                obj_ids = [int(x[0]) for x in obj.values_list('pk')] # ids of selected objects
                # do not bulk-update fields like arrays etc.
                if [k for k in update_kwargs.keys() if k in self.excluded_bulk_update]:
                    raise ValueError("Bulk update for any of the fields %s is not allowed. And maybe doesn't make too much sense.")
                # evaluated because SQL does not support update for sliced querysets
                obj.model.objects.filter(pk__in=obj_ids).update(**update_kwargs)

                if m2m_dict:  # work out m2m, so far I see no other way as raw SQL
                    db_table = obj.model._meta.db_table
                    cursor = connection.cursor()

                    for rem_key, rem_ids in m2m_dict.items(): # rem_key = name of the m2m field
                        remote_m_name = getattr(obj.model, rem_key).field.rel.to.__name__.lower()
                        base_m_name = obj.model.__name__.lower()
                        curr_m2m = [] # existing m2m relations

                        if not m2m_append: # remove existing m2m if overwrite mode
                            cursor.execute("DELETE FROM %s_%s WHERE %s_id IN %s" %\
                                (db_table, rem_key, base_m_name, str(tuple(obj_ids))))
                        else: # select the ones which are already 
                            cursor.execute("SELECT %s_id, %s_id FROM %s_%s WHERE %s_id IN %s" %\
                                (base_m_name, remote_m_name, db_table, rem_key, \
                                    base_m_name, str(tuple(obj_ids))))
                            curr_m2m = [x for x in cursor.fetchall()]

                        # new combinations of base model and remote model ids
                        to_insert = [x for x in itertools.product(obj_ids, rem_ids)]
                        # exclude already existing relations from the insert
                        for_update = list(set(to_insert) - set(curr_m2m))

                        if for_update:
                            query = "INSERT INTO %s_%s (%s_id, %s_id) VALUES " % \
                                (db_table, rem_key, base_m_name, remote_m_name)
                            query += ", ".join([str(u) for u in for_update])
                            cursor.execute(query) # insert new m2m values
                            transaction.commit_unless_managed()
            """

        except FieldDoesNotExist, v:
            return BadRequest(json_obj={"details": v.message}, \
                message_type="post_data_invalid", request=request)
        #except (ValueError, TypeError), v:
        #    return BadRequest(json_obj={"details": v.message}, \
        #        message_type="bad_float_data", request=request)
        except ValidationError, VE:
            if hasattr(VE, 'message_dict'):
                json_obj=VE.message_dict
            else:
                json_obj={"details": ", ".join(VE.messages)}
            return BadRequest(json_obj=json_obj, \
                message_type="bad_parameter", request=request)
        #except (AssertionError, AttributeError), e:
        #    return BadRequest(json_obj={"details": e.message}, \
        #        message_type="post_data_invalid", request=request)
        #except (ReferenceError, ObjectDoesNotExist), e:
        #    return NotFound(json_obj={"details": e.message}, \
        #        message_type="wrong_reference", request=request)

        self.run_post_processing(objects=objects, request=request, rdata=rdata)

        request.method = "GET"
        ids = [x.id for x in objects] 
        # need refresh the QuerySet, f.e. in case of a bulk update
        return self.get(request, self.model.objects.filter(pk__in=ids), return_code)


    def delete(self, request, objects):
        """ delete (archive) provided object """
        for obj in objects:
            if obj.is_editable(request.user): # method should exist, ensure
                obj.delete_object()
            else:
                return Forbidden(message_type="not_authorized", request=request)
        return Success(message_type="deleted", request=request)

    def create_version(self, objects, fk_kwargs, m2m_dict):
        """ recursively create new versions of the given objects with 
        attributes given in fk_kwargs  - DEPRECATED"""
        if 1: return "this function is deprecated"
        for obj in objects:

            # first need to create new versions for all related FKs with the 
            # reference to the new version of the parent
            for rel_name in filter(lambda l: (l.find("_set") == len(l) - 4), dir(obj)):
                rm = getattr(obj, rel_name) # parent / kid related manager
                update_fks = getattr(obj, rel_name).filter(current_state=10)

                if update_fks:
                    # a reverse field should always exist
                    reverse_field = [f for f in rm.model._meta.local_fields if \
                        f.rel and isinstance(f.rel, models.ManyToOneRel) and \
                        ( f.rel.to.__name__.lower() == obj.obj_type ) ][0]

                    fk_kwargs = { reverse_field.name + '_id': obj.id }

                    # metadata tagging propagates down the hierarchy by default
                    tags = {}
                    if m2m_dict.has_key('metadata') and \
                        self.options.has_key('cascade') and \
                            not self.options['cascade']:
                        tags = {'metadata': m2m_dict['metadata']}

                    # create new version for every FK child
                    self.create_version( update_fks, fk_kwargs, tags )

            for name, value in fk_kwargs.items():
                setattr(obj, name, value)
            obj.guid = obj.compute_hash() # recompute hash 
            obj.full_clean()

            now = datetime.datetime.now()
            if not obj.local_id: # requested new object, not an update
                obj.local_id = self.model._get_new_local_id()
                obj.date_created = now

            else: # update record with previous version, set ends_at to now()
                upd = self.model.objects.filter( local_id = obj.local_id )
                upd.filter(ends_at__isnull=True).update( ends_at = now )

            obj.id = None
            obj.starts_at = now
            obj.save() # creates new version with updated values

            if m2m_dict: # process m2m only after acquiring id
                for k, v in m2m_dict.items():
                    if self.m2m_append: # append to existing m2m
                        v = [x.id for x in getattr(obj, k).all()] + \
                            [x.id for x in m2m_data]
                    setattr(obj, k, v) # update m2m
                obj.save_m2m()


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
            obj = self.model.objects.get(local_id=id)
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


# REST wrapper -----------------------------------------------------------------

def get_obj_attr(request, obj_id=None, handler=None, *args, **kwargs):
    """ computes etag for object: for the moment it is just the hash of 
    last modified """
    if not handler or not obj_id:
        return None
    try:
        try:
            obj_id = int( obj_id ) # local ID provided
            obj = handler.model.objects.get( local_id = obj_id )
            return getattr( obj, kwargs['param_name'] )
        except ValueError: # GUID provided
            obj = handler.model.objects.get_by_guid( obj_id )
            return getattr( obj, kwargs['param_name'] )
    except ObjectDoesNotExist: # do not raise error here, will be raised later
        return None

def get_obj_lmodified(*args, **kwargs):
    kwargs['param_name'] = 'starts_at'
    return get_obj_attr(*args, **kwargs)

def get_obj_etag(*args, **kwargs):
    kwargs['param_name'] = 'guid'
    return get_obj_attr(*args, **kwargs)


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
