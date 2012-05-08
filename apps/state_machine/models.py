from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _
from friends.models import Friendship
from datetime import datetime

import pickle

class CurrentRevision(models.Model):
    """ stores actual revision number for every user """
    user = models.ForeignKey(User, unique=True)
    revision = models.ForeignKey(Revision)

    @classmethod
    def at_revision(self, user):
        return self.objects.get( user = user ).revision


class Revision(models.Model):
    """ Every user has a revision history of its objects. A new revision is
    created with every transaction (object(s) are created or modified). Every
    object has a revision number, to which it belongs. This allows to flexibly
    query object from different revisions.
    """
    number = models.IntegerField(editable=False)
    prev_revision = models.ForeignKey(self, editable=False)
    # this field contains all previous revisions as list of CSVs
    history = models.CommaSeparatedIntegerField(max_length=10000, blank=True, editable=False)
    owner = models.ForeignKey(User, editable=False)
    date_created = models.DateTimeField(default=datetime.now, editable=False)    

    @classmethod
    def generate_next(self, user):
        """ creates a new revision number for a given user """
        revs = self.objects.filter(owner=user)
        number = revs.aggregate( Max('number') )['number__max'] + 1
        curr_rev  = CurrentRevision.at_revision( user )
        rev = self.objects.create( number, curr_rev, curr_rev.history + ', ' +\
            str(number), user )
        return rev.number


class ObjectState(models.Model):
    """
    A Simple G-Node-State base representation for other classes (e.g. Sections,
    Files etc.) An object can be Active, Deleted and Archived, usually with the
    following cycle:

    Active <--> Deleted -> Archived

    Versioning is implemented as "full copy" mode. For every change, a new 
    revision is created and a new version of the object and it's related objects
    (FKs and M2Ms) are created.
    """
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    # global ID, equivalent to an object hash
    guid = models.CharField(max_length=40, editable=False)
    # local ID, unique between object versions, distinct between objects
    local_id = models.IntegerField(editable=False)
    revision = models.IntegerField(editable=False)
    owner = models.ForeignKey(User, editable=False)
    current_state = models.IntegerField(_('state'), choices=STATES, default=10)
    date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    last_modified = models.DateTimeField(auto_now=True) # Resp. H: Last-modified

    class Meta:
        abstract = True

    @classmethod
    def last_revision(self, local_id, revision):
        """ fetching the last revision number for a given local ID """
        ids = [int(x) for x in revision.history.split(', ')]
        filtered = self.objects.filter(local_id = local_id).filter(revision__in = ids))
        return filtered.aggregate( Max('revision') )['revision__max']

    @classmethod
    def select_related(self, curr_rev):
        """ SHOULD NOT HIT THE DATABASE """
        local_revs = ??? # FIXME
        return self.objects.select_related(*self._fkeys_list()).filter( revision = local_rev)

    @classmethod
    def fetch_by_lid(self, local_id, revision):
        """ filtering by a given local id and all previous revisions, then 
        taking the latest one. hits the Database. """
        local_rev = self.last_revision(local_id, revision)
        return self.objects.filter(local_id = local_id, revision = local_rev)

    @classmethod
    def fetch_by_guid(self, guid):
        """ fetches the object by it's hash """
        return self.objects.get( guid = guid )

    def _fkeys_list(self):
        """ list of foreign key fields of the associated model is required for
        select_related() function of the queryset, because it does not work with
        FK fields with null=True. """
        return [f.name for f in self._meta.fields if isinstance(f, ForeignKey)]

    def _get_new_local_id(self):
        """ next local ID (unique between object versions) for a local type """
        return self.objects.aggregate( Max('local_id') )['local_id__max'] + 1

    def compute_hash(self):
        """ computes the hash of itself """
        return hashlib.sha1( pickle.dumps(self) ).hexdigest()

    @property
    def obj_type(self):
        return self.__class__.__name__.lower()

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
        try:
            self.current_state = 30
            self.save()
        except BaseException:
            raise KeyError("Object can't be moved to archive. Check \
                dependencies or it's a developer issue.")

    def is_active(self):
        return self.current_state == 10


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
    safety_level = models.IntegerField(_('privacy level'), choices=SAFETY_LEVELS, default=3)

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
    object_id = models.IntegerField(_('object ID')) # ID of the File/Section
    object_type = models.CharField(_('object type'), max_length=30)
    # the pair above identifies a unique object for ACL record
    access_for = models.ForeignKey(User) # with whom it is shared
    access_level = models.IntegerField(_('access level'), choices=ACCESS_LEVELS, default=1)

    def resolve_access_level(self, value):
        """ convert from int to str and vice versa TODO """
        pass


