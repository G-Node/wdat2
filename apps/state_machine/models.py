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
    """ extracts 'at_time' and 'current_state' into separate dict """
    timeflt = {}
    if kwargs.has_key('at_time'):
        timeflt['at_time'] = kwargs.pop('at_time')
    return kwargs, timeflt

def _get_id_attr_name(model):
    """ if the given model is VERSIONED, the 'local_id' should be used. If
    this is the normal Django non-versioned model (e.g. a user), an 'id'
    attribute name should be used as object main identifier."""
    if 'local_id' in model._meta.get_all_field_names(): # object is versioned
        return 'local_id'
    else: # normal django model
        return 'id'

def _get_url_base(model):
    """ returns a base part of the URL for a model, e.g. /metadata/section/
    for Section model. TODO: find a cleaner way to do that. """
    id_attr = _get_id_attr_name( model )
    temp = model()
    setattr(temp, id_attr, 10**9)
    url = temp.get_absolute_url()
    # removing the trailing slash if there
    if url.rfind('/') == len(url) - 1:
        url = url[:url.rfind('/')]
    return url.replace('1000000000', '')


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
# VERSIONED QuerySets and object Managers
#===============================================================================

class BaseQuerySetExtension(object):
    """ basic extension for every queryset class to support versioning """
    _at_time = None # proxy version time for related models

    def _clone(self, klass=None, setup=False, **kwargs):
        """ override _clone method to preserve 'at_time' attribute while cloning
        queryset - in stacked filters, excludes etc. """
        #kwargs['_at_time'] = self._at_time # an alternative way of saving time
        c = super(BaseQuerySetExtension, self)._clone(klass, setup, **kwargs)
        c._at_time = self._at_time
        return c
    
    def iterator(self):
        """ pre-processing versioned queryset before evaluating against database 
        back-end. Inject version time filters for every versioned model (table),
        used in the query. """
        def update_constraint( node, table ):
            if hasattr(node, 'children') and node.children:
                for child in node.children:
                    update_constraint( child, table )
            else:
                node[0].alias = table

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

        # - build map of models with tables: {<table name>: <model>}
        vmodel_map = {}
        for model in connection.introspection.installed_models( self.query.tables ):
            vmodel_map[ model._meta.db_table ] = model

        # - add node with time filters to all versioned models (tables)
        for table in self.query.tables:
            # skip non-versioned models, like User: no need to filter by time
            if vmodel_map.has_key( table ):
                if not ObjectState in vmodel_map[ table ].mro():
                    continue
            cloned_node = qry.where.__deepcopy__(memodict=None)
            update_constraint( cloned_node, table )
            self.query.where.add( cloned_node, AND )

        # 4. re-set limits
        self.query.set_limits(low=low_mark, high=high_mark)

        for obj in super(BaseQuerySetExtension, self).iterator():
            yield obj


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

    def create(self, **kwargs):
        """ this method cleans kwargs required to create versioned object(s) and 
        proxies the request to the model.save_changes() function, that does the
        physical creation. """
        # all versioned objects must have owner
        if not "owner" in kwargs.keys():
            raise ValidationError("Please provide object owner.")
        owner = kwargs.pop("owner")

        # split params into different dicts for separate validation
        update_kwargs, m2m_dict, fk_dict = {}, {}, {}
        reserved = [ fi.name for fi in self.model._meta.local_fields if not fi.editable ]
        simple = [ f for f in self.model._meta.local_fields if not f.name in reserved and not f.rel ]
        fks = [ f for f in self.model._meta.local_fields if not f.name in reserved and f.rel ]
        m2ms = [ f for f in self.model._meta.many_to_many ]

        for key, value in kwargs.items():
            if key in [ f.name for f in m2ms ]:
                m2m_dict[ key ] = value
            elif key in [ f.name for f in fks ]:
                fk_dict[ key ] = value
            elif key in [ f.name for f in simple ]:
                update_kwargs[ key ] = value

        obj = self.model( owner = owner )
        self.model.save_changes( [obj], update_kwargs, m2m_dict, fk_dict, True)
        return obj


class VersionManager(models.Manager):
    """ A special manager for versioned objects. By default it returns queryset 
    with filters on the 'ends_at' attribute = NULL (last version of an object) 
    and 'current_state' = 10 (active object, not deleted). If 'at_time' and/or 
    'current_state' are provided, means the special version of an object is 
    requested, this manager returns queryset tuned to the provided time / object
    state. To request object versions at specific moment in time in the past, 
    the 'at_time' parameter should be provided to the manager at first call with
    the filter() method of this Manager. """
    use_for_related_fields = True
    _at_time = None

    def get_query_set(self, **timeflt ):
        """ init QuerySet that supports object versioning """
        qs = VersionedQuerySet(self.model, using=self._db)
        if timeflt.has_key('at_time'):
            qs._at_time = timeflt['at_time']
        return qs

    def filter(self, **kwargs):
        """ method is overriden to support object versions. If an object is 
        requested at a specific point in time here we split this time from 
        kwargs to further proxy it to the QuerySet, so an appropriate version is
        fetched. """
        kwargs, timeflt = _split_time( **kwargs )
        return self.get_query_set( **timeflt ).filter( **kwargs )

    def get_by_guid(self, guid):
        """ every object has a global ID (basically it's a hash of it's JSON 
        representation). As this ID is unique, one can request an object by it's
        GUID directly."""
        return super(VersionManager, self).get_query_set().get( guid = guid )

    # TODO implement this for more flexibility
    #def get_by_natural_key(self, **kwargs ):
    #    return self.get(first_name=first_name, last_name=last_name)


class RESTObjectsManager( VersionManager ):
    """ extends a normal manager for versioned objects with a 'get_related' 
    method, which is able to fetch objects together with permalinks to the 
    direct, reversed and m2m relatives. """

    def fetch_fks(self, objects, timeflt={}):
        """ assigns permalinks of the reversed-related children to the list of 
        objects given. Expects list of objects, uses reversed FKs to fetch 
        children and their ids. Returns same list of objects, each having new  
        attributes WITH postfix _buffer and _buffer_ids after default django 
        <fk_name>_set field, containing list of reversly related FK object 
        permalinks and ids respectively. """
        if not objects: return []

        id_attr = _get_id_attr_name( self.model )
        ids = [ getattr(x, id_attr) for x in objects ]

        flds = [f for f in self.model._meta.get_all_related_objects() if not \
            issubclass(f.model, VersionedM2M) and issubclass(f.model, ObjectState)]
        related_names = [f.field.rel.related_name or f.model().obj_type + "_set" for f in flds]

        # FK relations - loop over related managers / models
        for rel_name in related_names:

            # get all related objects for all requested objects as one SQL
            rel_manager = getattr(self.model, rel_name)
            rel_field_name = rel_manager.related.field.name
            rel_model = rel_manager.related.model
            id_attr = _get_id_attr_name( rel_model )
            url_base = _get_url_base( rel_model )

            # fetching reverse relatives of type rel_name:
            filt = { rel_field_name + '__in': ids }
            # relmap is a list of pairs (<child_id>, <parent_ref_id>)
            relmap = rel_model.objects.filter( **dict(filt, **timeflt) ).values_list(id_attr, rel_field_name)

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
                        lid = getattr(obj, id_attr)
                        setattr( obj, rel_name + "_buffer", fk_map_plinks[lid] )
                        setattr( obj, rel_name + "_buffer_ids", fk_map_ids[lid] )
                    except KeyError: # no children, but that's ok
                        setattr( obj, rel_name + "_buffer", [] )
                        setattr( obj, rel_name + "_buffer_ids", [] )
                    #setattr( obj, rel_name + "_data", [x[0] for x in relmap if x[1] == lid] )
            else:
                # objects do not have any children of that type
                for obj in objects: 
                    setattr( obj, rel_name + "_buffer", [] )
                    setattr( obj, rel_name + "_buffer_ids", [] )
        return objects

    def fetch_m2m(self, objects, timeflt={}):
        """ assigns permalinks of the related m2m children to the list of 
        objects given. Expects list of objects, uses m2m to fetch children with 
        their ids. Returns same list of objects, each having new attribute WITH 
        postfix _buffer and _buffer_ids after default django <m2m_name> field, 
        containing list of m2m related object permalinks and ids respectively. 
        """
        if not objects: return []

        id_attr = _get_id_attr_name( self.model )
        ids = [ getattr(obj, id_attr) for obj in objects ]

        for field in self.model._meta.many_to_many:
            m2m_class = field.rel.through
            is_versioned = issubclass(m2m_class, VersionedM2M)
            own_name = field.m2m_field_name()
            rev_name = field.m2m_reverse_field_name()
            filt = dict( [(own_name + '__in', ids)] )
            url_base = _get_url_base( field.rel.to )

            # select all related m2m connections (not reversed objects!) of 
            # a specific type, one SQL
            if is_versioned:
                rel_m2ms = m2m_class.objects.filter( **dict(filt, **timeflt) )
            else:
                rel_m2ms = m2m_class.objects.filter( **filt )

            # get evaluated m2m conn queryset:
            rel_m2m_map = [ ( getattr(r, own_name + "_id"), \
                getattr(r, rev_name + "_id") ) for r in rel_m2ms ]
            if rel_m2m_map:
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
                        lid = getattr(obj, id_attr)
                        setattr( obj, field.name + '_buffer', m2m_map_plinks[lid] )
                        setattr( obj, field.name + '_buffer_ids', m2m_map_ids[lid] )
                    except KeyError: # no children, but that's ok
                        setattr( obj, field.name + '_buffer', [] )
                        setattr( obj, field.name + '_buffer_ids', [] )
            else:
                # objects do not have any m2ms of that type
                for obj in objects: 
                    setattr( obj, field.name + '_buffer', [] )
                    setattr( obj, field.name + '_buffer_ids', [] )
        return objects

    def get_related(self, *args, **kwargs):
        """ returns a LIST (not a queryset) of objects with children permalinks. 
        This should be faster than using any of standard django 'select_related'
        or 'prefetch_related' methods which (unexpectedly) do not work as 
        suggested. """
        fetch_children = kwargs.pop('fetch_children', False)
        if not kwargs.has_key('objects'):
            objects = self.filter( **kwargs )
        else:
            objects = kwargs['objects']

        kwargs, timeflt = _split_time( **kwargs )

        if not fetch_children:
            return objects

        if objects: # evaluates queryset, executes 1 SQL
            # fetch reversed FKs (children)
            objects = self.fetch_fks( objects, timeflt )

            # fetch reversed M2Ms (m2m children)
            objects = self.fetch_m2m( objects, timeflt )

        return objects

    def get(self, *args, **kwargs):
        """ same as get_related but always returns one object or throws an error
        if there is no object. takes the first one if there are many """
        try:
            obj = self.get_related( *args, **kwargs )[0]
        except IndexError:
            raise ObjectDoesNotExist()
        return obj

#===============================================================================
# Base models for a Versioned Object, M2M relations and Permissions management
#===============================================================================

class VersionedM2M( models.Model ):
    """ this abstract model is used as a connection between two objects for many 
    to many relationship for versioned objects instead of ManyToMany field. """

    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = VersionManager()

    class Meta:
        abstract = True


class ObjectState(models.Model):
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
    current_state = models.IntegerField(choices=STATES, default=10)
    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = RESTObjectsManager()
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

    def compute_hash(self):
        """ computes the unique object identifier. We balance between two 
        options of having a unique GUID:
        - only across objects, not object versions
        - across object versions too (every version has a different GUID)
        For the moment the second option (full uniqueness) is implemented.
        """
        # option 1.
        #return hashlib.sha1( self.get_absolute_url() ).hexdigest()

        # option 2.
        return hashlib.sha1( pickle.dumps(self) ).hexdigest()

    @property
    def obj_type(self):
        """ every object has a type defined as lowercase name of the class. """
        return self.__class__.__name__.lower()

    def natural_key(self):
        return {
            "local_id": self.local_id,
            "last_modified": self.starts_at,
            "guid": self.guid }

    def get_owner(self):
        """ required for filtering by owner in REST """
        return self.owner

    def is_active(self):
        return self.current_state == 10

    def save(self, *args, **kwargs):
        """ implements versioning by always saving new object """
        now = datetime.now()
        if not self.local_id: # saving new object, not a new version
            self.local_id = self._get_new_local_id() # must be first
            self.date_created = now
            self.guid = self.compute_hash() # compute unique hash 

        else: # update previous version, set ends_at to now()
            upd = self.__class__.objects.filter( local_id = self.local_id )
            upd.filter(ends_at__isnull=True).update( ends_at = now )

        # creates new version with updated values
        self.id = None
        self.starts_at = now
        super(ObjectState, self).save()

    @classmethod
    def save_changes(self, objects, update_kwargs, m2m_dict, fk_dict, m2m_append):
        """
        the update is done in three steps. 1) we update one object with the new 
        attrs and FKs, and run full_clean() on it to clean the new values from
        the request. if no validation errors found, we do 2) close all old 
        versions for versioned objects and then 3) create in bulk new objects 
        with these new attrs and FKs. As objects are homogenious, this kind of 
        validation should work ok.
        """
        if not objects: return None

        # .. exclude versioned FKs from total validation, needed later
        exclude = [ f.name for f in self._meta.local_fields if \
            ( f.rel and isinstance(f.rel, models.ManyToOneRel) ) \
                and ( 'local_id' in f.rel.to._meta.get_all_field_names() ) ]

        do_bulk = 1 # for the moment we always do bulk updates, it's faster

        if not do_bulk: # loop over objects, no bulk update
            for obj in objects:
                # update normal attrs
                for name, value in update_kwargs.items():
                    setattr(obj, name, value)

            # update versioned FKs in that way so the FK validation doesn't fail
            for field_name, related_obj in fk_dict.items():
                for obj in objects:
                    oid = getattr( related_obj, 'local_id', related_obj.id )
                    setattr(obj, field_name + '_id', oid)

            if update_kwargs or fk_dict: # update only if something hb changed
                for obj in objects:
                    obj.full_clean( exclude = exclude )
                    obj.save()

        else:
            if update_kwargs or fk_dict:
                # step 1: update and clean one object
                obj = objects[0]
                for name, value in update_kwargs.items():
                    setattr(obj, name, value)

                # update versioned FKs in that way so the FK validation doesn't fail
                for field_name, related_obj in fk_dict.items():
                    oid = None
                    if related_obj:
                        oid = getattr( related_obj, 'local_id', related_obj.id )
                    setattr(obj, field_name + '_id', oid)

                # validate provided data
                obj.full_clean( exclude = exclude )

                # step 2: close old records
                now = datetime.now()
                old_ids = [x.id for x in objects] # id or local_id ??
                self.objects.filter( id__in = old_ids ).update( ends_at = now )

                # step 3: create new objects
                for obj in objects:
                    if not obj.local_id: # saving new object, not a new version
                        # requires to hit the database, so not scalable
                        obj.local_id = self._get_new_local_id()
                        obj.date_created = now
                        obj.guid = obj.compute_hash() # compute unique hash 

                    # update objects with new attrs and FKs
                    for name, value in update_kwargs.items():
                        setattr(obj, name, value)
                    for field_name, related_obj in fk_dict.items():
                        oid = None
                        if related_obj:
                            oid = getattr( related_obj, 'local_id', related_obj.id )
                        setattr(obj, field_name + '_id', oid)

                    obj.starts_at = now
                    obj.id = None
                self.objects.bulk_create( objects )

        # process versioned m2m relations separately, in bulk
        if m2m_dict:
            local_ids = [ x.local_id for x in objects ]

            for m2m_name, new_ids in m2m_dict.items():

                # preselect all existing m2ms of type m2m_name for all objs
                field = self._meta.get_field(m2m_name)
                m2m_class = getattr(field.rel, 'through')
                is_versioned = issubclass(m2m_class, VersionedM2M)
                own_name = field.m2m_field_name()
                rev_name = field.m2m_reverse_field_name()

                # retrieve all current relations for all selected objects
                filt = dict( [(own_name + '__in', local_ids)] )
                rel_m2ms = m2m_class.objects.filter( **filt )

                now = datetime.now()

                # close old existing m2m
                if not m2m_append: 
                    # list of reverse object ids to close
                    to_close = list( set(rel_m2ms.values_list( rev_name, flat=True )) - set(new_ids) )
                    filt = dict( [(own_name + '__in', local_ids), \
                        (rev_name + "__in", to_close)] )
                    if is_versioned:
                        m2m_class.objects.filter( **filt ).update( ends_at = now )
                    else:
                        m2m_class.objects.filter( **filt ).delete()

                # create new m2m connections
                to_create = {}
                for value in new_ids:
                    filt = {rev_name: value} # exclude already created conn-s
                    to_create[value] = list( set(local_ids) - \
                        set(rel_m2ms.filter( **filt ).values_list( own_name, flat=True )) )

                new_rels = []
                for value, obj_ids in to_create.iteritems():
                    for i in obj_ids:
                        attrs = {}
                        attrs[ own_name + '_id' ] = i
                        attrs[ rev_name + '_id' ] = value
                        if is_versioned:
                            attrs[ "date_created" ] = now
                            attrs[ "starts_at" ] = now
                        new_rels.append( m2m_class( **attrs ) )
                m2m_class.objects.bulk_create( new_rels )


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
                u = User.objects.get( id=int(user_id) )
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

    def publish_object():
        self.safety_level = 1

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
    ('read-only' or 'can edit').

    IMPORTANT: if you need object to have single accesses you have to define a
    acl_type method for it (see example with 'Section').

    Note: Permissions are NOT version controlled.
    """
    ACCESS_LEVELS = (
        (1, _('Read-only')),
        (2, _('Edit')),
    )
    object_id = models.IntegerField() # local ID of the File/Section
    object_type = models.CharField( max_length=30 )
    # the pair above identifies a unique object for ACL record
    access_for = models.ForeignKey(User) # with whom it is shared
    access_level = models.IntegerField( choices=ACCESS_LEVELS, default=1 )

    def resolve_access_level(self, value):
        """ convert from int to str and vice versa TODO """
        pass


