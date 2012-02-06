from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _
from friends.models import Friendship


class ObjectState(models.Model):
    """
    A Simple G-Node-State base representation for other classes (e.g. Sections,
    Files etc.) An object can be Active, Deleted and Archived, usually with the
    following cycle:

    Active <--> Deleted -> Archived
    """
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    current_state = models.IntegerField(_('state'), choices=STATES, default=10)
    date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    last_modified = models.DateTimeField(auto_now=True) # Resp. H: Last-modified

    class Meta:
        abstract = True

    def restore_object(self):
        self.current_state = 10

    def delete_object(self):
        self.current_state = 20

    def move_to_archive(self):
        try:
            self.current_state = 30
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
    owner = models.ForeignKey(User)

    class Meta:
        abstract = True

    def share(self, users):
        """ performs an update of all personal accesses to an object;
        users is a dict of the form {'user_id': 'access level', } """
        current_users = [x.access_for for x in self.shared_with]
        users_to_remove = list(set([x.id for x in current_users]) - set(users.keys()))
        for user_id, level in users: # create new accesses and update old ones
            try:
                u = User.objects.get(id=user_id)
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
                p = SingleAccess(self, u, level)
                p.save()
        for u in users_to_remove: # delete legacy accesses
            self.shared_with.get(access_for=u).delete()

    def shared_with(self):
        """ returns a QuerySet of all specific accesses. Method relies on 
        'parent' object's ID and type (this is an abstract class anyway) """
        return SingleAccess.objects.filter(object_id=self.id, object_type=self.acl_type)

    def access_list(self):
        """ returns list of users having personal access to the object """
        return [x.access_for for x in self.shared_with]

    def remove_all_shares(self):
        pass

    def publish_object():
        self.safety_level = 1

    def is_public(self):
        return self.safety_level == 1

    def is_friendly(self):
        return self.safety_level == 2

    def is_private(self):
        return self.safety_level == 3

    def get_access_for_user(self, user):
        try:
            access = self.shared_with.get(access_for=user)
            return access
        except:
            return None

    def is_accessible(self, user):
        """
        Defines whether an object (Datafile etc) is accessible for a given user 
        (either readable or editable)
        """
        return self.is_readable(user) or self.is_editable(user)

    def is_readable(self, user):
        if self.is_editable(user) or self.is_Public() or (self.is_Friendly() \
            and Friendship.objects.are_friends(user, self.owner)) or \
            self.owner == user:
            return True
        return False

    def is_editable(self, user):
        if (self.owner == user) or (user in self.access_list and \
            self.get_access_for_user(user).level == 2):
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
        (2, _('Can edit')),
    )
    OBJECT_TYPES = (
        (1, _('Datafile')),
        (2, _('Section')),
    )
    object_id = models.IntegerField(_('object ID')) # ID of the File/Section
    object_type = models.IntegerField(_('object type'), choices=OBJECT_TYPES)
    # the pair above identifies a unique object for ACL record
    access_for = models.ForeignKey(User) # with whom it is shared
    access_level = models.IntegerField(_('access level'), choices=ACCESS_LEVELS, default=1)






#---- BELOW DEPRECATED SINCE FEBRUARY 2012, THE NEW DATA API -------------------

class MetadataManager:
    """
    Class to represent some common methods, applicable for "metadata" (for 
    Datafiles, Datasets etc.)
    """
    def get_metadata(self):
        metadata = []
        for section in self.section_set.filter(current_state=10).order_by("tree_position"):
            metadata.append(section.get_tree())
        return metadata

    def get_metadata_root_id(self):
        """
        Method is needed to keep the first level of metadata tree opened.
        """
        if self.section_set.filter(current_state=10):
            return self.section_set.filter(current_state=10)[0].id
        else:
            return None

    def has_metadata(self):
        if self.section_set.filter(current_state=10):
            return True
        return False

    def objects_count(self):
        """
        Number of 'linked' (through odML sections) objects - datasets, files etc.
        """
        datasets_no = 0
        datafiles_no = 0
        timeseries_no = 0
        files_vo = 0
        sections = self.section_set.all().filter(current_state=10)
        for sec in sections:
            s1, s2, s3, s4 = sec.get_objects_count()
            datasets_no += s1
            datafiles_no += s2
            timeseries_no += s3
            files_vo += s4
        return datasets_no, datafiles_no, timeseries_no, files_vo

    def objects_count_str(self):
        s1, s2, s3, s4 = self.objects_count()
        result = ""
        if s1: result = "Datasets (" + str(s1) + "), "
        if s2: result = result + "Files (" + str(s2) + "), "
        if s3: result = result + "Time Series (" + str(s3) + "), "
        if result: result = result[:len(result)-2]
        return result

class LinkedToProject:
    """
    Class represents methods to link an object (e.g. Dataset or Experiment) to a 
    Project. An object (self) must contain a field (in_projects) to store links.
    """
    def add_linked_project(self, project):
        try:
            self.in_projects.add(project)
        except BaseException:
            raise "This Django object doesn't have a container for links to projects."

    def remove_linked_project(self, project):
        try:
            self.in_projects.remove(project)
        except BaseException:
            raise "This Django object doesn't have a container for links to projects."


