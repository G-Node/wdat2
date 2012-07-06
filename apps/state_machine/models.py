from django.db import models
from django.db.models.fields.related import ForeignKey
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _
from friends.models import Friendship
from datetime import datetime

import pickle
import hashlib
import settings


#-------------------------------------------------------------------------------
# Base classes and their Manager. Version control is implemented on that level.

def _split_time( **kwargs ):
    """ extracts 'at_time' and 'current_state' into separate dict """
    timeflt = {}
    if kwargs.has_key('at_time'):
        timeflt['at_time'] = kwargs.pop('at_time')
    if kwargs.has_key('current_state'):
        timeflt['current_state'] = kwargs.pop('current_state')
    return kwargs, timeflt


class VersionManager(models.Manager):
    """ filters objects as per provided time / active state """

    def get_query_set(self, **kwargs):
        qs = super(VersionManager, self).get_query_set()

        if kwargs.has_key('at_time'):
            at_time = kwargs['at_time']
            qs = qs.filter( Q(starts_at__lte = at_time), Q(ends_at__gt = at_time) | Q(ends_at__isnull = True) )
        else:
            qs = qs.filter(ends_at__isnull = True)

        state = 10 # filter all 'active' objects by default
        if kwargs.has_key('current_state'): # change the filter if requested
            state = kwargs['current_state']
        if not issubclass(qs.model, VersionedM2M): # no 'state' for m2m managers
            qs = qs.filter(current_state = state)

        return qs

    def filter(self, **kwargs):
        kwargs, timeflt = _split_time( **kwargs )
        return self.get_query_set( **timeflt ).filter( **kwargs )

    def get_by_guid(self, guid):
        return self.get_query_set().get( guid = guid )

    # TODO implement this for more flexibility
    #def get_by_natural_key(self, **kwargs ):
    #    return self.get(first_name=first_name, last_name=last_name)


class RelatedManager( VersionManager ):
    """ implements selection of the related objects in *optimized* number of SQL
    requests """

    def get_related(self, *args, **kwargs):
        """ 
        should be something like this
        returns a list of objects with children, not a queryset
         """
        objects = self.filter( **kwargs ) # one SQL request
        
        # these filters, if provided, should propagate to related objects
        kwargs, timeflt = _split_time( **kwargs )

        if objects:

            # FK relations - loop over related managers / models
            for rel_name in filter(lambda l: (l.find("_set") == len(l) - 4), dir(objects.model)):

                # get all related objects for all requested objects as one SQL
                rel_manager = getattr(objects.model, rel_name)
                rel_field_name = rel_manager.related.field.name
                rel_model = rel_manager.related.model

                if 'local_id' in rel_model._meta.get_all_field_names(): # object is versioned
                    id_attr = 'local_id'
                else: # normal FK to a django model
                    id_attr = 'id'

                ids = [ getattr(x, id_attr) for x in objects ]
                filt = { rel_field_name + '__in': ids }
                related = rel_model.objects.filter( **dict(filt, **timeflt) )[:]
                for obj in objects: # parse children into attrs
                    filt = { rel_field_name: getattr(obj, id_attr) }
                    setattr( obj, rel_name + "_data", related.filter( **filt ) )

            # FK parents - if need to resolve (URL or ...)
            fk_fields = [ f for f in objects.model._meta.local_fields if not f.rel is None ]
            for par_field in fk_fields:

                # select all related parents of a specific type, evaluate!
                ids = set([ getattr(x, par_field.name + "_id") for x in objects ])
                if 'local_id' in par_field.rel.to._meta.get_all_field_names():
                    id_attr = 'local_id'
                    par = par_field.rel.to.objects.filter( local_id__in = ids, **timeflt )[:]

                else: # normal FK to a django model
                    id_attr = 'id'
                    par = par_field.rel.to.objects.filter( id__in = ids )[:]

                for obj in objects: # parse parents into attrs
                    filt = dict( [(id_attr, getattr(obj, par_field.name + "_id"))] )
                    try:
                        setattr( obj, par_field.name, par.get( **filt ) )
                    except ObjectDoesNotExist:
                        setattr( obj, par_field.name, None )

            # processing M2Ms
            if 'local_id' in objects.model._meta.get_all_field_names():
                id_attr = 'local_id'
            else:
                id_attr = 'id'
            ids = [ getattr(obj, id_attr) for obj in objects ]

            for field in objects.model._meta.many_to_many:
                m2m_class = field.rel.through
                is_versioned = issubclass(m2m_class, VersionedM2M)
                filt = { field.m2m_field_name() + '__in': ids }

                # select all related m2m connections of a specific type, one SQL
                if is_versioned:
                    rel_m2ms = m2m_class.objects.filter( **dict(filt, **timeflt) )[:]
                else:
                    rel_m2ms = m2m_class.objects.filter( **filt )[:]

                for obj in objects: # parse into objects
                    filt = { field.m2m_field_name(): getattr(obj, id_attr) }
                    reverse_ids = rel_m2ms.filter( **filt ).values_list( field.m2m_reverse_field_name(), flat=True )

                    if is_versioned:
                        filt = { 'local_id__in': reverse_ids }
                        buf = field.rel.to.objects.filter( **dict(filt, **timeflt) )
                    else:
                        filt = { 'id__in': reverse_ids }
                        buf = field.rel.to.objects.filter( **filt )

                    setattr( obj, field.name + '_buffer', buf )

        return objects


class VersionedM2M( models.Model ):
    """ the abstract model is used as a connection between two objects for many 
    to many relationship, for versioned objects instead of ManyToMany field. """

    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = VersionManager()

    class Meta:
        abstract = True


class ObjectState(models.Model):
    """
    A Simple G-Node-State base representation for other classes (e.g. Sections,
    Files etc.) An object can be Active, Deleted and Archived, usually with the
    following cycle:

    Active <--> Deleted -> Archived

    Versioning is implemented as "full copy" mode. For every change, a new 
    revision is created and a new version of the object and it's related objects
    (FKs and M2Ms) are created.

    There are three types of IDs:
    - 'id' field - automatically created by Django and used for FKs and JOINs
    - 'guid' - a hash of an object, used as unique global object identifier
    - 'local_id' - object ID invariant across object versions

    How to create a FK field:


    How to create a M2M field:

    """
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    # global ID, equivalent to an object hash
    guid = models.CharField(max_length=40, editable=False)
    # local ID, unique between object versions, distinct between objects
    # local ID + starts_at basically making a PK
    local_id = models.IntegerField('LID', editable=False)
    #revision = models.IntegerField(editable=False) # switch on for rev-s support
    owner = models.ForeignKey(User, editable=False)
    current_state = models.IntegerField(choices=STATES, default=10)
    date_created = models.DateTimeField(editable=False)
    starts_at = models.DateTimeField(serialize=False, default=datetime.now, editable=False)
    ends_at = models.DateTimeField(serialize=False, blank=True, null=True, editable=False)
    objects = RelatedManager()

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

    def compute_hash(self):
        """ computes the hash of itself """
        return hashlib.sha1( pickle.dumps(self) ).hexdigest()

    @property
    def obj_type(self):
        return self.__class__.__name__.lower()

    def natural_key(self):
        return {
            "local_id": self.local_id,
            "last_modified": self.starts_at,
            "guid": self.guid }

    def get_owner(self):
        """ required for filtering by owner in REST """
        return self.owner

    def restore_object(self):
        self.current_state = 10
        self.save()

    def delete_object(self):
        self.current_state = 20
        self.save()

    def move_to_archive(self):
        self.current_state = 30
        self.save()

    def is_active(self):
        return self.current_state == 10

    def save(self, *args, **kwargs):
        """ implements versioning by always saving new object """
        self.guid = self.compute_hash() # recompute hash 

        now = datetime.now()
        if not self.local_id: # saving new object, not a new version
            self.local_id = self._get_new_local_id()
            self.date_created = now

        else: # update previous version, set ends_at to now()
            upd = self.__class__.objects.filter( local_id = self.local_id )
            upd.filter(ends_at__isnull=True).update( ends_at = now )

        # creates new version with updated values
        self.id = None
        self.starts_at = now
        super(ObjectState, self).save()


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
        current_users = [x.access_for for x in self.shared_with]
        users_to_remove = list(set([x.id for x in current_users]) - set(users.keys()))
        for user_id, level in users.items(): # create new accesses and update old ones
            try:
                u = User.objects.get(id=int(user_id))
            except:
                raise ValueError("Provided user ID is not valid: %s" % user_id)
            if level not in dict(SingleAccess.ACCESS_LEVELS).keys():
                raise ValueError("Provided access level for the user ID %s \
                    is not valid: %s" % (user_id, level))
            if u in current_users: # update access level
                p = self.shared_with.get(access_for=u)
                p.access_level = level
                p.save()
            else: # create new access
                p = SingleAccess(object_id=self.id, object_type=self.acl_type(), \
                    access_for=u, access_level=level)
                p.save()
        for u in users_to_remove: # delete legacy accesses
            self.shared_with.get(access_for=u).delete()

    @property
    def shared_with(self):
        """ returns a QuerySet of all specific accesses. Method relies on 
        'parent' object's ID and type (this is an abstract class anyway) """
        return SingleAccess.objects.filter(object_id=self.id, object_type=self.acl_type())

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


