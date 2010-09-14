from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
#from django.contrib.contenttypes.models import ContentType
#from django.contrib.contenttypes import generic
from state_machine.models import SafetyLevel
from pinax.apps.projects.models import Project
from friends.models import Friendship

from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _

class Experiment(SafetyLevel):
    # An experiment with its details and links to projects

    EXPERIMENT_TYPES = (
        (1, u'electrophysiology'),
        (2, u'behaviour'),
        (3, u'imaging'),
        (4, u'modelling'),
        (5, u'other'),
    )

    title = models.CharField(_('title'), max_length=100)
    caption = models.TextField(_('description'), blank=True)
    date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    owner = models.ForeignKey(User, blank=True, null=True)
    #exp_type = models.IntegerField(_('experiment type'), choices=EXPERIMENT_TYPES, default=1)
    #subject = models.CharField(_('subject'), max_length=100)
    in_projects = models.ManyToManyField(Project, blank=True, verbose_name=_('related projects'))
    tags = TagField(_('keywords'))

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("experiment_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

    def addLinkedProject(self, project):
        self.in_projects.add(project)

    def removeLinkedProject(self, project):
        self.in_projects.remove(project)

    # defines whether an object (dataset) is accessible for a given user
    # <<< better to migrate it inside the state_machine with the "owner" property >>>
    def is_accessible(self, user):
        if (self.owner == user) or (self.is_Public()) or (user in self.shared_with.all()) or (self.is_Friendly() and Friendship.objects.are_friends(user, self.owner)):
            return True
        else:
            return False



