from django.db import models, connection, transaction
from django.db.models.query import QuerySet, ValuesQuerySet, ValuesListQuerySet, DateQuerySet
from django.db.models.sql.where import WhereNode, Constraint, AND
from django.db.models.fields.related import ForeignKey, ReverseSingleRelatedObjectDescriptor
from django.db.models import Q
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.urlresolvers import reverse
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _

from friends.models import Friendship
from datetime import datetime

import pickle
import hashlib
import settings
import numpy as np


#===============================================================================
# Base classes and their Managers. Version control is implemented on that level.
#===============================================================================

"""
Basic Version Control implementation features.


1. Database representation

a) Table for a versioned model
every object has 'starts_at' and 'ends_at' fields. Current (latest) object 
version always has 'ends_at' = NULL, all previous versions have 'ends_at' set 
with the datetime equals to the 'starts_at' field of the next version. Thus 
every version is a new row in the database; all unchanged attributes are 
redundantly copied.

b) How do foreign keys work
we make django think that 'local_id' (non-unique across versions) is the PK for
any model. This allows using normal django ORM (calling lazy relations like 
event.segment etc.), and to avoid duplicated by fetching several object 
versions, we set an additional time filters on the original object manager, as 
well as we proxy these filters to the managers that fetch related objects.

c) Table holding M2M relationship between versioned models
M2M relations are also versioned. To support that we created a base class that 
supports versioning ('VersionedM2M'), which should be used as a proxy model for
versioned M2M relations.

2. A trick with Primary Key
We set PK for every django-model to a non-auto incremental ID field. This 
field is updated manually and is actually unique across objects but not across 
rows in the table, so all versions of the same object have the same ID value. 
This PK is needed for django to auto-build relationships via FKs and M2Ms, 
however, the initial table creation in the DB should be done with PK set to the
'guid' field (see 'ObjectState' class).


3. Base class supporting versioning
All versioned models should inherit from 'ObjectState'. In this base class the 
creation and update of an object is implemented with versioning.


4. Model manager
Is extended with having '_at_time' attribute, used in case some older object 
version is requested. It sets appropriate filters on the QuerySet when 'at_time'
parameter is provided in the request (MUST be a always a first filter if used as 
VersionedManager.filter(at_time='2012-07-26 17:16:12').filter(...) )


5. default VersionedQuerySet
is extended with the automatic support for timing of the objects to fetch from 
the db, thus realising object versioning.


6. ORM extentions that support lazy relations

important:
 - use VersionedForeignKey instead of ForeignKey field
 - create M2Ms 'through' model, subclassed from 'VersionedM2M' class

this allows relations to be versioned.

a) Reverse Single Related:
is implemented by overriding a ForeignKey class by VersionedForeignKey, namely 
the 'contribute_to_class' method to assign different descriptor at instance 
initialization time. New descriptor (VReverseSingleRelatedObjectDescriptor 
class) differs only by the 'get_query_set' method, which returns a correct 
VersionedQuerySet instance that supports versioning and hits the database with 
time, equal to the time of the original object, when appropriate parent object 
is called. 

b) Foreign Related and all M2M Objects:
all '<object_type>_set' attributes are wrapped in the base class (ObjectState) 
in __getattribute__ by assigning the time to the RelatedManager, returned by 
default by the '<object_type>_set' descriptor. Thus the RelatedManager knows 
about timing to request related objects from the database, equal to the time of
the original object.

"""

#===============================================================================
# Supporting functions
#===============================================================================

def _split_time( **kwargs ):
    """ extracts 'at_time' into separate dict """
    timeflt = {}
    if kwargs.has_key('at_time'):
        timeflt['at_time'] = kwargs.pop('at_time')
    return kwargs, timeflt

def _get_url_base(model):
    """ returns a base part of the URL for a model, e.g. /metadata/section/
    for Section model. TODO: find a cleaner way to do that. """
    temp = model()
    if model == User: # not to break HTML interface
        return '/user/'
    setattr(temp, 'pk', 10**9)
    url = temp.get_absolute_url()
    # removing the trailing slash if there
    if url.rfind('/') == len(url) - 1:
        url = url[:url.rfind('/')]
    return url.replace('1000000000', '')

def create_hash_from( obj ):
    """ computes the unique object identifier. We balance between two 
    options of having a unique GUID:
    - only across objects, not object versions
    - across object versions too (every version has a different GUID)
    For the moment the second option (full uniqueness) is implemented.
    """
    # option 1.
    #return hashlib.sha1( obj.get_absolute_url() ).hexdigest()

    # option 2.
    return hashlib.sha1( ''.join([obj.get_absolute_url(), str(obj.starts_at)]) ).hexdigest()

    # option 3.
    #return hashlib.sha1( pickle.dumps( obj ) ).hexdigest()

    # option 4.
    #import uuid
    #return str( uuid.uuid4() )

#===============================================================================
# Field and Descriptor subclasses for VERSIONED Reverse Single relationships
#===============================================================================

class VReverseSingleRelatedObjectDescriptor( ReverseSingleRelatedObjectDescriptor ):
    """ To natively support versioned objects, we need to proxy object's time
    ('_at_time') parameter across object descriptors. To fetch related objects 
    at the time, equal to the time of the original object, the corresponding 
    QuerySet should be interfaced as VersionedQuerySet with '_at_time' parameter
    equal to the the original object '_at_time'. So we do need to override the
    'get_query_set' method only. """

    def get_query_set(self, **db_hints):
        qs = super(VReverseSingleRelatedObjectDescriptor, self).get_query_set(**db_hints)

        # assign _at_time to the qs if needed
        if db_hints.has_key( 'instance' ):
            if isinstance(db_hints['instance'], self.field.model):
                inst = db_hints['instance']
                if hasattr(inst, '_at_time'):
                    at_time = inst._at_time
                    if at_time:
                        qs._at_time = at_time
        return qs


class VersionedForeignKey( models.ForeignKey ):
    def contribute_to_class(self, cls, name):
        super(VersionedForeignKey, self).contribute_to_class(cls, name)        
        setattr(cls, self.name, VReverseSingleRelatedObjectDescriptor(self))

#===============================================================================
# VERSIONED QuerySets
#===============================================================================

class BaseQuerySetExtension(object):
    """ basic extension for every queryset class to support versioning """
    _at_time = None # proxy version time for related models
    _time_injected = False

    def inject_time(self):
        """ pre-processing versioned queryset before evaluating against database 
        back-end. Inject version time filters for every versioned model (table),
        used in the query. """
        def update_constraint( node, table ):
            if hasattr(node, 'children') and node.children:
                for child in node.children:
                    update_constraint( child, table )
            else:
                node[0].alias = table

        def extract_rel_tables( nodes, extracted ):
            for name, inside in nodes.items():
                extracted.append( name )
                if inside:
                    extract_rel_tables( inside, extracted )

        if not self._time_injected:
            # 1. save limits
            high_mark, low_mark = self.query.high_mark, self.query.low_mark

            # 2. clear limits to be able to assign more filters, see 'can_filter()'
            self.query.clear_limits()

            # 3. update time filters:
            # - create time filters as separate where node
            qry = self.query.__class__( model=self.model )
            if self._at_time:
                at_time = self._at_time
                qry.add_q( Q(starts_at__lte = at_time) )
                qry.add_q( Q(ends_at__gt = at_time) | Q(ends_at__isnull = True) )
            else:
                qry.add_q( Q(ends_at__isnull = True) )

            cp = self.query.get_compiler(using=self.db)
            cp.pre_sql_setup() # thanks god I found that
            tables = [table for table, rc in cp.query.alias_refcount.items() if rc]

            # - build map of models with tables: {<table name>: <model>}
            vmodel_map = {}
            for model in connection.introspection.installed_models( tables ):
                vmodel_map[ model._meta.db_table ] = model

            # - add node with time filters to all versioned models (tables)
            for table in tables:
                # find real table name, not alias
                real_name = table
                for mod_name, aliases in self.query.table_map.items():
                    if table in aliases:
                        real_name = mod_name

                # skip non-versioned models, like User: no need to filter by time
                if vmodel_map.has_key( real_name ):
                    superclasses = vmodel_map[ real_name ].mro()
                    if not (ObjectState in superclasses or VersionedM2M in superclasses):
                        continue

                cloned_node = qry.where.__deepcopy__(memodict=None)
                update_constraint( cloned_node, table )
                self.query.where.add( cloned_node, AND )

            # 4. re-set limits
            self.query.set_limits(low=low_mark, high=high_mark)
            self._time_injected = True

    def _filter_or_exclude(self, negate, *args, **kwargs):
        """ versioned QuerySet supports 'at_time' parameter for filtering 
        versioned objects. """
        kwargs, timeflt = _split_time( **kwargs )
        if timeflt.has_key('at_time'):
            self._at_time = timeflt['at_time']
        return super(BaseQuerySetExtension, self)._filter_or_exclude(negate, *args, **kwargs)

    def _clone(self, klass=None, setup=False, **kwargs):
        """ override _clone method to preserve 'at_time' attribute while cloning
        queryset - in stacked filters, excludes etc. """
        #kwargs['_at_time'] = self._at_time # an alternative way of saving time
        c = super(BaseQuerySetExtension, self)._clone(klass, setup, **kwargs)
        c._at_time = self._at_time
        c._time_injected = self._time_injected
        return c
    
    def iterator(self):
        """ need to inject version time before executing against database """
        self.inject_time()
        for obj in super(BaseQuerySetExtension, self).iterator():
            yield obj

    def count(self):
        """ need to inject version time (or ends_at = NULL) before executing 
        against database. No tables are in alias_refcount if no other filters 
        are set, so the time injection doesn't work.. workaround here: inject a 
        meaningless filter, which doesn't change the *count* query. """
        q = self.filter( pk__gt=0 )
        q.inject_time()
        return super(BaseQuerySetExtension, q).count()

    def delete(self):
        """ deletion for versioned objects means setting the 'ends_at' field 
        to the current datetime. Applied only for active versions, having 
        ends_at=NULL """
        now = datetime.now()
        self.filter( ends_at__isnull = True )
        super(BaseQuerySetExtension, self).update( ends_at = now )

    def exists(self):
        """ exists if there is at least one record with ends_at = NULL """
        q = self.filter( ends_at__isnull = True )
        return super(BaseQuerySetExtension, q).exists()

    def in_bulk(self):
        raise NotImplementedError("Not implemented for versioned objects")


class M2MQuerySet( BaseQuerySetExtension, QuerySet ):
    pass

class VersionedValuesQuerySet( BaseQuerySetExtension, ValuesQuerySet ):
    pass

class VersionedValuesListQuerySet( BaseQuerySetExtension, ValuesListQuerySet ):
    pass

class VersionedDateQuerySet( BaseQuerySetExtension, DateQuerySet ):
    pass

class VersionedQuerySet( BaseQuerySetExtension, QuerySet ):
    """ An extension for a core QuerySet that supports versioning by overriding 
    some key functions, like create etc. """

    def _clone(self, klass=None, setup=False, **kwargs):
        """ need to use versioned classes for values, value list and dates """
        if klass == ValuesQuerySet:
            klass = VersionedValuesQuerySet
        elif klass == ValuesListQuerySet:
            klass = VersionedValuesListQuerySet
        elif klass == DateQuerySet:
            klass = VersionedDateQuerySet
        return super(VersionedQuerySet, self)._clone(klass, setup, **kwargs)

    def iterator(self):
        """ we assign a special attribute '_at_time' for every object if the 
        original query was supposed to return older versions from some time in 
        the past ('_at_time' was specified in the Request). This is useful 
        primarily to proxy this time to related managers to get related objects
        from the same time, as well as indicates that a different version from 
        the current of an object was requested. """
        for obj in super(VersionedQuerySet, self).iterator():
            if self._at_time:
                obj._at_time = self._at_time
            yield obj

    def bulk_create(self, objects):
        """ wrapping around a usual bulk_create to provide version-specific 
        information for all objects. As with original bulk creation, 
        reverse relationships and M2Ms are not supported! """
        now = datetime.now()
        lid = self.model._get_new_local_id()

        # step 1: validation + versioned objects update
        guids_to_close = []
        val_flag = False
        processed = []
        to_submit = []
        for obj in objects:
            if obj.guid: # existing object, need to close old version later
                if obj.pk in processed:
                    break
                guids_to_close.append( str( obj.guid ) )
            else:  # new object
                obj.local_id = lid
                lid += 1
            processed.append( obj.pk )
            obj.date_created = obj.date_created or now
            obj.starts_at = now
            # compute unique hash (after updating object and starts_at)
            obj.guid = create_hash_from( obj )
            if not val_flag: # clean only one object for speed
                obj.full_clean()
                val_flag = True
            to_submit.append( obj )

        # step 2: close old records
        self.filter( guid__in = guids_to_close ).delete()

        # step 3: create objects in bulk
        return super(VersionedQuerySet, self).bulk_create( to_submit )

    def update(self, **kwargs):
        """ update objects with new attrs and FKs """
        if kwargs:
            objs = self._clone()
            for obj in objs:
                for name, value in kwargs.items():
                    setattr(obj, name, value)
            return self.bulk_create( objs )
        return self

    def security_filter(self, user, update=False):
        """ filters given queryset for objects available for a given user. Does 
        not evaluate QuerySet, does not hit the database. """
        queryset = self.all()

        if not "owner" in [x.name for x in queryset.model._meta.local_fields]:
            return queryset # non-multiuser objects are fully available

        if issubclass(queryset.model, SafetyLevel):
            if not update:
                # 1. all public objects 
                q1 = queryset.filter(safety_level=1).exclude(owner=user)

                # 2. all *friendly*-shared objects
                friends = [f.to_user.id for f in Friendship.objects.filter(from_user=user)] \
                    + [f.from_user.id for f in Friendship.objects.filter(to_user=user)]
                q2 = queryset.filter(safety_level=2, owner__in=friends)

                # 3. All private direct shares
                dir_acc = [sa.object_id for sa in SingleAccess.objects.filter(access_for=user, \
                    object_type=queryset.model.acl_type())]
                q3 = queryset.filter(pk__in=dir_acc)

                perm_filtered = q1 | q2 | q3

            else:
                # 1. All private direct shares with 'edit' level
                dir_acc = [sa.object_id for sa in SingleAccess.objects.filter(access_for=user, \
                    object_type=queryset.model.acl_type(), access_level=2)]
                perm_filtered = queryset.filter(pk__in=dir_acc) # not to damage QuerySet
        else:
            perm_filtered = queryset.none()

        # owned objects always available
        queryset = perm_filtered | queryset.filter(owner=user)
        return queryset

    def get_by_guid(self, guid):
        """ every object has a global ID (basically it's a hash of it's JSON 
        representation). As this ID is unique, one can request an object by it's
        GUID directly."""
        return self.get( guid = guid )


#===============================================================================
# VERSIONED Managers
#===============================================================================

class VersionManager(models.Manager):
    """ A special manager for versioned objects. By default it returns queryset 
    with filters on the 'ends_at' attribute = NULL (last version of an object). 
    If 'at_time' is provided, means the special version of an object is 
    requested, this manager returns queryset tuned to the provided time. The 
    'at_time' parameter should be provided to the manager at first call with the
    filter() method of this Manager. """
    use_for_related_fields = True
    _at_time = None

    def all(self):
        """ need to proxy all() to apply versioning filters """
        return self.get_query_set().all()

    def filter(self, **kwargs):
        """ method is overriden to support object versions. If an object is 
        requested at a specific point in time here we split this time from 
        kwargs to further proxy it to the QuerySet, so an appropriate version is
        fetched. """
        kwargs, timeflt = _split_time( **kwargs )
        return self.get_query_set( **timeflt ).filter( **kwargs )

    def proxy_time(self, proxy_to, **timeflt):
        if timeflt.has_key('at_time'):
            proxy_to._at_time = timeflt['at_time']
        elif self._at_time:
            proxy_to._at_time = self._at_time
        return proxy_to


class VersionedM2MManager( VersionManager ):
    """ A manager for versioned relations. Used to proxy a special subclass of 
    the Queryset (M2MQuerySet) designed for M2M relations. """

    def get_query_set(self, **timeflt ):
        """ init QuerySet that supports m2m relations versioning """
        qs = M2MQuerySet(self.model, using=self._db)
        self.proxy_time( qs, **timeflt )
        return qs


class VersionedObjectManager( VersionManager ):
    """ extends a normal manager for versioned objects """

    def get_query_set(self, **timeflt ):
        """ init QuerySet that supports object versioning """
        qs = VersionedQuerySet(self.model, using=self._db)
        self.proxy_time( qs, **timeflt )
        return qs

    def get_by_guid(self, guid):
        """ proxy get_by_guid() method to QuerySet """
        return self.get_query_set().get_by_guid( guid )


#===============================================================================
# Base models for a Versioned Object, M2M relations and Permissions management
#===============================================================================

class VersionedM2M( models.Model ):
    """ this abstract model is used as a connection between two objects for many 
    to many relationship for versioned objects instead of ManyToMany field. """

    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = VersionedM2MManager()

    class Meta:
        abstract = True


class ObjectState( models.Model ):
    """
    A base class for a versioned G-Node object. An object can be Active, Deleted
     and Archived, usually with the following cycle:

    Active <--> Deleted -> Archived

    Versioning is implemented as "full copy" mode. For every change, a new 
    revision is created and a new version of the object is created.

    There are three types of object IDs:
    - 'guid' - a hash of an object, a unique global object identifier (GUID)
    - 'local_id' - object ID invariant across object versions

    IMPORTANT. When initializing new database with 'django manage.py syncdb', 
    one MUST set 'primary_key' option to the 'guid' field, so that django 
    creates PK and all FKs on 'guid' db column, but then move this option back 
    to the 'local_id' field.

    How to create a FK field:


    How to create a M2M field:

    """
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    # global ID, distinct for every object version = unique table PK
    guid = models.CharField(max_length=40, editable=False)
    # local ID, invariant between object versions, distinct between objects
    # local ID + starts_at basically making a PK
    local_id = models.IntegerField('LID', primary_key=True, editable=False)
    owner = models.ForeignKey(User, editable=False)
    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = VersionedObjectManager()
    _at_time = None # indicates an older version for object instance

    class Meta:
        abstract = True

    @classmethod
    def _fkeys_list(self):
        """ list of foreign key fields of the associated model is required for
        select_related() function of the queryset, because it does not work with
        FK fields with null=True. """
        return [f.name for f in self._meta.fields if isinstance(f, ForeignKey)]

    @classmethod
    def _get_new_local_id(self):
        """ next local ID (unique between object versions) for a local type """
        max_id = self.objects.aggregate( models.Max('local_id') )['local_id__max']
        if not max_id:
            return 1
        return max_id + 1

    def __getattribute__(self, name):
        """ wrap getting object attributes to catch calls to related managers,
        which require '_at_time' parameter to retrieve related objects at time,
        equal to the original object. """
        attr = object.__getattribute__(self, name)
        if isinstance(attr, VersionManager) and self._at_time:
            """ direct FK, direct M2M or reverse M2M related manager is 
            requested. By adding '_at_time' attribute we make the related 
            manager support versioning by requesting related objects at the time
            equal to the original object ('self' in this case). For reverse FKs 
            (like 'event.segment') we need to override related descriptor, see
            'VersionedForeignKey' field class. """
            attr._at_time = self._at_time
        return attr

    @property
    def obj_type(self):
        """ every object has a type defined as lowercase name of the class. """
        return self.__class__.__name__.lower()

    def natural_key(self):
        return {
            "local_id": self.local_id,
            "last_modified": self.starts_at,
            "guid": self.guid }

    def get_absolute_url(self):
        """ by default this should be similar to that """
        return ''.join([ '/', self.obj_type, '/', str(self.local_id) ])

    def get_owner(self):
        """ required for filtering by owner in REST """
        return self.owner

    def is_active(self):
        return not self.ends_at

    def is_accessible(self, user):
        """ by default object is accessible for it's owner """
        return self.owner == user

    def delete(self):
        """ uses queryset delete() method to perform versioned deletion """
        self.__class__.objects.filter( pk=self.pk ).delete()

    def save(self, *args, **kwargs):
        """ implements versioning by always saving new object. This is not 100%
        DRY: the 'bulk_create' method of the VersionedQuerySet work in a similar
        way, however combining them in one function would be too ambiguous."""
        now = datetime.now()
        if not self.local_id: # saving new object, not a new version
            self.local_id = self._get_new_local_id() # must be first
            self.date_created = now

        else: # delete previous version, set ends_at to now()
            upd = self.__class__.objects.filter( pk = self.pk ).delete()

        # creates new version with updated values
        self.starts_at = now
        self.guid = create_hash_from( self ) # compute unique hash 
        super(ObjectState, self).save() # add force_insert?

    @classmethod
    def save_changes(self, objects, update_kwargs, m2m_dict, fk_dict, m2m_append):
        """
        the method saves changes to attributes (update_kwargs), FKs (fk_dict) 
        and M2M relations (m2m_dict) to all provided objects, resolving 
        versioning and caching features.
        - correctly handles FK and M2M relationships
        - refreshes parent objects if there was any change (for caching)

        FIXME: partially replicate relations processing to the save() function
        """
        if not objects: return None

        # FIXME make transactional

        new_attr = False # indicates ANY difference in attr with curr objects
        new_fk = False # indicates if ANY new FK has to be assigned
        obj_for_update = [] # collector of objects that require update (caching)

        par_for_update = {} # init collector of parent IDs for update (caching)
        if fk_dict:
            for fkey, fvalue in fk_dict.items():
                par_for_update[ fvalue.obj_type ] = {
                    'class': fvalue.__class__,
                    'ids': []
                }

        if update_kwargs or fk_dict:
            for obj in objects:

                # 1. processing attributes
                for name, value in update_kwargs.items():
                    if new_attr or not getattr(obj, name) == value:
                        new_attr = True
                        setattr(obj, name, value)

                # 2. processing FKs
                # for every new FK old (if exists) and new parent records have 
                # to be updated (new guid/starts_at = new Etag/last-modified)
                # this allows proper caching on the client side
                for fkey, fvalue in fk_dict.items():

                    ot = fvalue.obj_type
                    curr_fk = getattr(obj, fkey + '_id')
                    # detect whether new value has to be assigned
                    if not curr_fk == fvalue.pk:

                        # old parent Etag has to be updated, collect
                        if curr_fk:
                            par_for_update[ ot ]['ids'].append( curr_fk )

                        # new parent Etag has to be updated, collect
                        if not fvalue.pk in par_for_update[ ot ]:
                            par_for_update[ ot ]['ids'].append( fvalue.pk )

                        new_fk = True
                        setattr(obj, fkey, fvalue)

                # detect whether object got any changes
                if new_attr or new_fk:
                    obj_for_update.append( obj )

                new_attr, new_fk = False, False # reset for the next object

        if m2m_dict: # process versioned m2m relations separately, in bulk
            pks = dict( [ (x.pk, x) for x in objects ] )

            for m2m_name, new_ids in m2m_dict.items():

                # preselect all existing m2ms of type m2m_name for all objs
                field = self._meta.get_field(m2m_name)
                m2m_class = getattr(field.rel, 'through')
                is_versioned = issubclass(m2m_class, VersionedM2M)
                own_name = field.m2m_field_name()
                rev_name = field.m2m_reverse_field_name()

                # retrieve all current relations (!) for all given objects
                filt = dict( [(own_name + '__in', pks.keys())] )
                rel_m2ms = m2m_class.objects.filter( **filt )

                now = datetime.now()
                cache_ids = [] # collector for objects to to refresh cache

                # close old existing m2m
                if not m2m_append: 
                    # list of reverse object ids to close
                    to_close = list( set(rel_m2ms.values_list( rev_name, flat=True )) - set(new_ids) )
                    filt = dict( [(own_name + '__in', pks.keys()), \
                        (rev_name + "__in", to_close)] )

                    # update collector for objects to refresh cache
                    cache_ids = m2m_class.objects.filter( **filt ).values_list( own_name, flat=True )
                    m2m_class.objects.filter( **filt ).delete()

                # create new m2m connections
                filt = dict( [(rev_name + '__in', new_ids)] )
                existing = rel_m2ms.filter( **filt ).values_list( own_name, rev_name )
                new_rels = []
                for pk in pks.keys():
                    for n in new_ids:
                        if not (pk, n) in existing:
                            attrs = {}
                            attrs[ own_name + '_id' ] = pk
                            attrs[ rev_name + '_id' ] = n
                            if is_versioned:
                                attrs[ "date_created" ] = now
                                attrs[ "starts_at" ] = now
                            new_rels.append( m2m_class( **attrs ) )
                            cache_ids.append( pk )

                # update collector for objects to refresh cache
                cache_upd = [obj for obj in objects if obj.pk in cache_ids]
                obj_for_update = list( set( obj_for_update + cache_upd ) )

                m2m_class.objects.get_query_set().bulk_create( new_rels )

        # make update for main objects
        if obj_for_update:
            self.objects.get_query_set().bulk_create( obj_for_update )

        # update appropriate FKs to refresh cache
        for obj_type, upd in par_for_update.items():
            parents = upd['class'].objects.filter( pk__in=set( upd['ids'] ) )
            if parents:
                upd['class'].objects.get_query_set().bulk_create( parents )



class SafetyLevel(models.Model):
    """
    Safety level represents a level of access to an object by other users. An 
    object can be Public (all users have access), Friendly (all "friends" have 
    access) and Private (owner and special assignments only). Also handles 
    special assignments (access for special users from the list with 'read-only'
    or 'contributor' access levels).
    """
    SAFETY_LEVELS = (
        (1, _('Public')),
        (2, _('Friendly')),
        (3, _('Private')),
    )
    safety_level = models.IntegerField('privacy_level', choices=SAFETY_LEVELS, default=3)

    class Meta:
        abstract = True

    def share(self, users):
        """ performs an update of all personal accesses to an object;
        users is a dict of the form {'user_id': 'access level', } """
        current_users = [ x.access_for for x in self.shared_with ]
        users_to_remove = list(set([x.id for x in current_users]) - set(users.keys()))
        for user_id, level in users.items(): # create new accesses and update old ones
            try:
                u = User.objects.get( pk=int(user_id) )
            except:
                raise ValueError("Provided user ID is not valid: %s" % user_id)
            if level not in dict(SingleAccess.ACCESS_LEVELS).keys():
                raise ValueError("Provided access level for the user ID %s \
                    is not valid: %s" % (user_id, level))
            if u in current_users: # update access level
                p = self.shared_with.get( access_for=u )
                p.access_level = level
                p.save()
            else: # create new access
                p = SingleAccess( object_id=self.local_id, \
                    object_type=self.acl_type(), access_for=u, access_level=level)
                p.save()
        for u in users_to_remove: # delete legacy accesses
            self.shared_with.get(access_for=u).delete()

    def acl_update(self, safety_level=None, users=None, cascade=False):
        """ update object safety level and direct user permissions (cascade).
        Note. This function works with single objects and not very effective 
        with bulk acl object updates (when propagation down the tree needed). 
        For efficiency look at 'bulk_acl_update' classmethod. 

        - safety_level is an int (see self.SAFETY_LEVELS)
        - users is a dict { <user_id>: <access_level>, } (see ACCESS_LEVELS)
        """

        # first update safety level
        if safety_level and not self.safety_level == safety_level:
            if not int(safety_level) in dict(self.SAFETY_LEVELS).keys():
                raise ValueError("Provided safety level is not valid: %s" % safety_level)
            self.safety_level = safety_level
            self.save()

        # update single user shares
        if not users == None:
            self.share( users )

        # propagate down the hierarchy if cascade
        if cascade:
            for related in self._meta.get_all_related_objects():
                if issubclass(related.model, SafetyLevel): # reversed child can be shared
                    for obj in getattr(self, related.get_accessor_name()).all():
                        obj.acl_update(safety_level, users, cascade)

    @classmethod
    def bulk_acl_update(self, objects, safety_level=None, users=None, cascade=False):
        """ bulk acl update for homogenious (?) list of objects. The difference 
        from the similar acl_update method is the speed of the update (this 
        method makes less SQL hits) 

        - safety_level is an int (see self.SAFETY_LEVELS)
        - users is a dict { <user_id>: <access_level>, } (see ACCESS_LEVELS)
        """
        # update safety level - in bulk
        if safety_level:
            for_update = {}
            for obj in objects:
                if not (obj.safety_level == safety_level):
                    if not for_update.has_key( obj.__class__ ):
                        for_update[ obj.__class__ ] = []
                    # collect objects to update for every class type
                    for_update[ obj.__class__ ].append( obj )

            # perform bulk updates, one sql for every class type
            for model, objs in for_update.items():
                model.save_changes(objs, {'safety_level': safety_level}, {}, {}, False)

        # update single user shares. assume users are cleaned (exist)
        if not users == None:
            obj_map = {} # dict {<obj_type>: [<object_pk>, ..], }
            for obj in objects:
                obj_type = obj.obj_type
                if not obj_map.has_key( obj_type ):
                    obj_map[ obj_type ] = []
                obj_map[ obj_type ].append( obj.pk )

            # remove old accesses
            for obj_type, ids in obj_map.items():
                old = SingleAccess.objects.filter( object_type=obj_type )
                old = old.filter( object_id__in=ids ).delete()

            # create new access records
            new_accesses = []
            for obj in objects:
                for user_id, access_level in users.items():
                    new_acc = SingleAccess()
                    new_acc.object_id = obj.pk
                    new_acc.object_type = obj.obj_type
                    new_acc.access_for_id = user_id
                    new_acc.access_level = access_level
                    new_accesses.append( new_acc )
            SingleAccess.objects.bulk_create( new_accesses )

        # propagate down the hierarchy if cascade
        if cascade:
            for_update = [] # collector for children to update (heterogenious ?)
            obj_map = {} # dict {<obj_class>: [<obj>, ..], }
            for obj in objects:
                cls = obj.__class__
                if not obj_map.has_key( cls ):
                    obj_map[ cls ] = []
                obj_map[ cls ].append( obj )

            for cls, objs in obj_map.items():
                ext = ObjectExtender( cls )
                obj_with_related = ext.fill_fks( objects = objs )

                for related in cls._meta.get_all_related_objects():
                    # cascade down only for reversed children that can be shared
                    if issubclass(related.model, SafetyLevel):

                        # collector for children IDs: for every obj from given
                        # objects collect children ids to update, by type (related)
                        ids_upd = []
                        for obj in obj_with_related:
                            ids_upd += getattr(obj, related.get_accessor_name() + '_buffer_ids')

                        # all children of 'related' type
                        for_update += list( related.model.objects.filter( pk__in=ids_upd ) )

            if for_update:
                self.bulk_acl_update(for_update, safety_level, users, cascade)

    @property
    def shared_with(self):
        """ returns a QuerySet of all specific accesses. Method relies on 
        'parent' object's ID and type (this is an abstract class anyway) """
        return SingleAccess.objects.filter( object_id=self.local_id, \
            object_type=self.acl_type() )

    def access_list(self):
        """ returns list of users having personal access to the object """
        return [x.access_for for x in self.shared_with]

    def remove_all_shares(self):
        raise NotImplementedError

    def is_public(self):
        return self.safety_level == 1

    def is_friendly(self):
        return self.safety_level == 2

    def is_private(self):
        return self.safety_level == 3

    def get_access_for_user(self, user):
        """ returns appropriate SingleAccess object, if a given user has access 
        to this object """
        sa = self.shared_with.filter(access_for=user)
        if sa: # FIXME there should be always one access, right?
            return sa[0]
        return None

    @classmethod
    def acl_type(self):
        """ object type for direct permissions. normally the lowercase name of 
        the class """
        return self.__name__.lower()

    def is_accessible(self, user):
        """
        Defines whether an object (Datafile etc) is accessible for a given user 
        (either readable or editable)
        """
        return self.is_readable(user) or self.is_editable(user)

    def is_readable(self, user):
        if self.is_editable(user) or self.is_public() or (self.is_friendly() \
            and Friendship.objects.are_friends(user, self.owner)) or \
            (user in self.access_list()) or self.owner == user:
            return True
        return False

    def is_editable(self, user):
        """ User may edit if:
        - user is an owner, or
        - user has a direct access with level 2 (edit)
        """
        if (self.owner == user) or (user in self.access_list() and \
            self.get_access_for_user(user).access_level == 2):
            return True
        return False


class SingleAccess(models.Model):
    """
    Represents a single connection between an object (Section, Datafile etc.) 
    and a User, with whom the object is shared + the level of this sharing 
    ('read-only' or 'can edit' etc.).

    IMPORTANT: if you need object to have single accesses you have to define a
    acl_type method for it (see example with 'Section').

    Note: Permissions are NOT version controlled.
    """
    ACCESS_LEVELS = (
        (1, _('Read-only')),
        (2, _('Edit')),
    )
    object_id = models.IntegerField() # local ID of the shareable object
    object_type = models.CharField( max_length=30 )
    # the pair above identifies a unique object for ACL record
    access_for = models.ForeignKey(User) # with whom it is shared
    access_level = models.IntegerField( choices=ACCESS_LEVELS, default=1 )

    def resolve_access_level(self, value):
        """ convert from int to str and vice versa TODO """
        pass


#===============================================================================
# Classes supporting utilities
#===============================================================================

class ObjectExtender:
    """ used to extend a list of given homogenious objects with additional 
    attributes. For every given object it assigns:
    - children permalinks
    - permalinks of related m2m objects
    - acl settings
    """
    model = None

    def __init__(self, model):
        self.model = model

    def fill_acl(self, objects, user=None):
        """ extends every object in a given list with _shared_with dict with 
        current object's acl settings """
        if not objects: return []

        ids = [ x.pk for x in objects ]

        # check if the model is multi-user
        if hasattr(self.model, 'acl_type') and issubclass(self.model, ObjectState) and user:
            # fetch single accesses for all objects
            accs = SingleAccess.objects.filter( object_id__in=ids, \
                object_type=self.model.acl_type() )

            # parse accesses to objects
            for obj in objects:
                sw = dict([(sa.access_for.username, sa.access_level) \
                    for sa in accs if sa.object_id == obj.pk])
                if user == obj.owner:
                    setattr(obj, '_shared_with', sw or None)
                else:
                    setattr(obj, '_shared_with', None)

        return objects

    def fill_relations(self, objects, user=None, _at_time=None):
        """ extends every object in a given list with children and m2m
        permalinks """
        if not objects:
            return None

        if len( objects ) > 0: # evaluates queryset if not done yet
            # fetch reversed FKs (children)
            objects = self.fill_fks( objects, user, _at_time )

            # fetch reversed M2Ms (m2m children)
            objects = self.fill_m2m( objects, user, _at_time )

        return objects

    def fill_fks(self, objects, user=None, _at_time=None):
        """ assigns permalinks of the reversed-related children to the list of 
        objects given. Expects list of objects, uses reversed FKs to fetch 
        children and their ids. Returns same list of objects, each having new  
        attributes WITH postfix _buffer and _buffer_ids after default django 
        <fk_name>_set field, containing list of reversly related FK object 
        permalinks and ids respectively.

        Used primarily in REST. 
        """
        if not objects: return []

        ids = [ x.pk for x in objects ]

        flds = [f for f in self.model._meta.get_all_related_objects() if not \
            issubclass(f.model, VersionedM2M) and issubclass(f.model, ObjectState)]
        related_names = [f.field.rel.related_name or f.model().obj_type + "_set" for f in flds]

        # FK relations - loop over related managers / models
        for rel_name in related_names:

            # get all related objects for all requested objects as one SQL
            rel_manager = getattr(self.model, rel_name)
            rel_field_name = rel_manager.related.field.name
            rel_model = rel_manager.related.model
            url_base = _get_url_base( rel_model )

            # fetching reverse relatives of type rel_name:
            filt = { rel_field_name + '__in': ids }
            if _at_time and issubclass(rel_model, ObjectState): # proxy time if requested
                filt = dict(filt, **{"at_time": _at_time})
            # relmap is a list of pairs (<child_id>, <parent_ref_id>)
            rel_objs = rel_model.objects.filter( **filt )
            if user:
                rel_objs = rel_objs.security_filter( user )
            relmap = rel_objs.values_list('pk', rel_field_name)

            if relmap:
                # preparing fk maps: preparing dicts with keys as parent 
                # object ids, and lists with related children links and ids.
                fk_map_plinks = {}
                fk_map_ids = {}
                mp = np.array( relmap )
                fks = set( mp[:, 1] )
                for i in fks:
                    fk_map_ids[i] = [ int(x) for x in mp[ mp[:,1]==i ][:,0] ]
                    fk_map_plinks[i] = [ url_base + str(x) for x in fk_map_ids[i] ]

                for obj in objects: # parse children into attrs
                    try:
                        setattr( obj, rel_name + "_buffer", fk_map_plinks[obj.pk] )
                        setattr( obj, rel_name + "_buffer_ids", fk_map_ids[obj.pk] )
                    except KeyError: # no children, but that's ok
                        setattr( obj, rel_name + "_buffer", [] )
                        setattr( obj, rel_name + "_buffer_ids", [] )
            else:
                # objects do not have any children of that type
                for obj in objects: 
                    setattr( obj, rel_name + "_buffer", [] )
                    setattr( obj, rel_name + "_buffer_ids", [] )
        return objects

    def fill_m2m(self, objects, user=None, _at_time=None):
        """ assigns permalinks of the related m2m children to the list of 
        objects given. Expects list of objects, uses m2m to fetch children with 
        their ids. Returns same list of objects, each having new attribute WITH 
        postfix _buffer and _buffer_ids after default django <m2m_name> field, 
        containing list of m2m related object permalinks and ids respectively. 
        """
        if not objects: return []

        ids = [ obj.pk for obj in objects ]

        for field in self.model._meta.many_to_many:
            m2m_class = field.rel.through
            own_name = field.m2m_field_name()
            rev_name = field.m2m_reverse_field_name()
            rev_model = field.related.parent_model
            filt = dict( [(own_name + '__in', ids)] )
            url_base = _get_url_base( field.rel.to )

            # proxy time if requested
            if _at_time and issubclass(m2m_class, VersionedM2M):
                filt = dict(filt, **{"at_time": _at_time})

            # select all related m2m connections (not reversed objects!) of 
            # a specific type, one SQL
            rel_m2ms = m2m_class.objects.filter( **filt ).select_related(rev_name)

            # get evaluated m2m conn queryset:
            rel_m2m_map = [ ( getattr(r, own_name + "_id"), \
                getattr(r, rev_name + "_id") ) for r in rel_m2ms ]
            if rel_m2m_map:
                if user: # security filtering
                    available = rev_model.objects.get_query_set().security_filter( user ).values_list('pk', flat=True)
                    rel_m2m_map = [x for x in rel_m2m_map if x[1] in available]

                # preparing m2m maps: preparing dicts with keys as parent 
                # object ids, and lists with m2m related children links and ids.
                m2m_map_plinks = {}
                m2m_map_ids = {}
                mp = np.array( rel_m2m_map )
                fks = set( mp[:, 0] )
                for i in fks:
                    m2m_map_ids[i] = [ int(x) for x in mp[ mp[:,0]==i ][:,1] ]
                    m2m_map_plinks[i] = [ url_base + str(x) for x in m2m_map_ids[i] ]

                for obj in objects: # parse children into attrs
                    try:
                        setattr( obj, field.name + '_buffer', m2m_map_plinks[ obj.pk ] )
                        setattr( obj, field.name + '_buffer_ids', m2m_map_ids[ obj.pk ] )
                    except KeyError: # no children, but that's ok
                        setattr( obj, field.name + '_buffer', [] )
                        setattr( obj, field.name + '_buffer_ids', [] )
            else:
                # objects do not have any m2ms of that type
                for obj in objects: 
                    setattr( obj, field.name + '_buffer', [] )
                    setattr( obj, field.name + '_buffer_ids', [] )
        return objects


