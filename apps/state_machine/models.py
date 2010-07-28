from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _

# State class represents active / deleted / archived states of mostly all objects in the system.
# Keeping it very simple
class ObjectState(models.Model):

    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    current_state = models.IntegerField(_('state'), choices=STATES, default=10)
    
    def getCurrentState():
        return self.current_state
    def restoreObject(self):
	self.current_state = 10
    def deleteObject(self):
        self.current_state = 20
    def moveToArchive(self):
        try:
            self.current_state = 30
        except:
            pass
    def isActive(self):
	return self.current_state == 10

    # some common methods (applicable for "metadata" objects only!)
    def get_metadata(self):
        metadata = []
        for section in self.section_set.filter(current_state=10).order_by("tree_position"):
            metadata.append(section.get_tree())
        return metadata

    # method is needed to keep the first level of metadata tree opened
    def get_metadata_root_id(self):
        if self.section_set.filter(current_state=10):
            return self.section_set.filter(current_state=10)[0].id
        else:
            return None

    def hasMetadata(self):
        if self.section_set.filter(current_state=10):
            return True
        return False


# Safety level represents a level of access to an object by other users
# Can be Public (all users have access), Friendly (all "friends" have access) and Private
# (owner and special assignments only). Also handles special assignments (access for
# special users from the list)

class SafetyLevel(ObjectState):

    SAFETY_LEVELS = (
        (1, _('Public')),
        (2, _('Friendly')),
        (3, _('Private')),
    )

    safety_level = models.IntegerField(_('privacy level'), choices=SAFETY_LEVELS, default=3)
    shared_with = models.ManyToManyField(User, blank=True, verbose_name=_('share with'))
    
    def shareObject(users_list):
        self.shared_with = users_list
    def getSharedWithList():
        return self.shared_with
    def removePrivateShares():
        self.shared_with.clear()

    def publishObject():
        self.safety_level = 1
        # add some special handliers for publications here
    def setSafetyLevel(safety_level):
        if safety_level in [1,2,3]:
            self.safety_level = safety_level
        else:
            raise ("Wrong safety level type")
    def is_Public(self):
        return self.safety_level == 1
    def is_Friendly(self):
        return self.safety_level == 2
    def is_Private(self):
        return self.safety_level == 3



