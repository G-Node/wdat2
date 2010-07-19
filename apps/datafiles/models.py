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
    title = models.CharField(_('title'), max_length=200)
    caption = models.TextField(_('caption'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    recording_date = models.DateTimeField(_('recording date'), default=datetime.now)
    owner = models.ForeignKey(User, related_name="related_file", blank=True, null=True)
    # the following 2 field are legacy after rel. 2; remove if not used in 2011
    in_datasets = models.ManyToManyField(RDataset, blank=True, verbose_name=_('related datasets'))
    in_expts = models.ManyToManyField(Experiment, blank=True, verbose_name=_('related experiments'))
    raw_file = models.FileField(_('data file'), upload_to="data/")
    tags = TagField()

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("datafile_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

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




    # The methods below are legacy after implementation of 
    # the metadata section/property objects. So only applicable
    # for older objects in the database. Remove when no longer
    # required (in 2011).

    def addLinkedExperiment(self, experiment):
	self.in_expts.add(experiment)

    def removeLinkedExperiment(self, experiment):
	self.in_expts.remove(experiment)

    def addLinkedDataset(self, dataset):
	self.in_datasets.add(dataset)

    def removeLinkedDataset(self, dataset):
	self.in_datasets.remove(dataset)
