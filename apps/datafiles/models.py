from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from state_machine.models import SafetyLevel
from django.core.files import storage
from django.template.defaultfilters import filesizeformat
from datasets.models import RDataset
from experiments.models import Experiment
from friends.models import Friendship
from pinax.apps.projects.models import Project
from django.db.models import Q
from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _

def make_upload_path(self, filename):
    """Generates upload path for FileField"""
    return "data/%s/%s" % (self.owner.username, filename)

class FileSystemStorage(storage.FileSystemStorage):
    """
    Subclass Django's standard FileSystemStorage to fix permissions
    of uploaded files.
    """
    def _save(self, name, content):
       name =  super(FileSystemStorage, self)._save(name, content)
       full_path = self.path(name)
       mode = getattr(settings, 'FILE_UPLOAD_PERMISSIONS', None)
       if not mode:
           mode = 0644
       os.chmod(full_path, mode)
       return name

# maybe an option to describe meta-data as a separate class..
#class FileMetadata(SafetyLevel):
#    # file metadata description
#    recording_date = models.DateTimeField(_('recording date'), default=datetime.now, null=True)
#    # add other metadata fileds here...


class Datafile(SafetyLevel):
    # A datafile with its details and raw data files
    title = models.CharField(_('name'), blank=True, max_length=200)
    caption = models.TextField(_('description'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    #recording_date = models.DateTimeField(_('recording date'), default=datetime.now)
    owner = models.ForeignKey(User, related_name="related_file", blank=True, null=True)
    # the following 2 field are legacy after rel. 2; remove if not used in 2011
    #in_datasets = models.ManyToManyField(RDataset, blank=True, verbose_name=_('related datasets'))
    #in_expts = models.ManyToManyField(Experiment, blank=True, verbose_name=_('related experiments'))
    in_projects = models.ManyToManyField(Project, blank=True, verbose_name=_('related projects'))
    raw_file = models.FileField(_('data file'), upload_to="data/") # or make_upload_path.. which doesn't work in PROD
    tags = TagField(_('keywords'))

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("datafile_details", [self.pk])
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

    @property
    def size(self):
        return filesizeformat(self.raw_file.size)


