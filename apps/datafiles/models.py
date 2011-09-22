from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from state_machine.models import SafetyLevel, LinkedToProject, MetadataManager
from django.core.files import storage
from django.template.defaultfilters import filesizeformat
from friends.models import Friendship
from pinax.apps.projects.models import Project
from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _
import settings

def make_upload_path(self, filename):
    """
    Generates upload path for FileField.
    """
    return "data/%s/%s" % (self.owner.username, filename)

# set up the location to store USER FILES
try:
    location = settings.FILE_MEDIA_ROOT
except:
    location = "/data/media/"
fs = storage.FileSystemStorage(location=location)

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

class Datafile(SafetyLevel, LinkedToProject, MetadataManager):
    """
    Datafile is a class representing a data file stored at G-Node.
    """
    title = models.CharField(_('name'), blank=True, max_length=200)
    caption = models.TextField(_('description'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    owner = models.ForeignKey(User, related_name="related_file", blank=True, null=True)
    in_projects = models.ManyToManyField(Project, blank=True, verbose_name=_('related projects'))
    raw_file = models.FileField(_('data file'), storage=fs, upload_to="data/") # or make_upload_path.. which doesn't work in PROD due to python2.5
    tags = TagField(_('keywords'))

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("datafile_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

    @property
    def size(self):
        return filesizeformat(self.raw_file.size)


