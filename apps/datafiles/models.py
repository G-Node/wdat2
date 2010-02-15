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
from django.db.models import Q

from tagging.fields import TagField

from django.utils.translation import ugettext_lazy as _
# Create your models here.

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


class FileMetadata(models.Model):
    # file metadata description
    recording_date = models.DateTimeField(_('recording_date'), default=datetime.now)
    # add other metadata fileds here...


class Datafile(SafetyLevel, FileMetadata):
    # A datafile with its details and raw data files
    title = models.CharField(_('title'), max_length=200)
    caption = models.TextField(_('caption'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    owner = models.ForeignKey(User, related_name="related_file", blank=True, null=True)
    in_datasets = models.ManyToManyField(RDataset, blank=True, verbose_name=_('related datasets'))
    in_expts = models.ManyToManyField(Experiment, blank=True, verbose_name=_('related experiments'))
    raw_file = models.FileField(_('raw_file'), upload_to="data/")
    tags = TagField()

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("datafile_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

    def addLinkedExperiment(self, experiment):
	self.in_expts.add(experiment)

    def removeLinkedExperiment(self, experiment):
	self.in_expts.remove(experiment)

    def addLinkedDataset(self, dataset):
	self.in_datasets.add(dataset)

    def removeLinkedDataset(self, dataset):
	self.in_datasets.remove(dataset)
    
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
