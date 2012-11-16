import tarfile
import zipfile
try:
    import json
except ImportError:
    import simplejson as json

from datetime import datetime
from django.db import models
from django.db.models.fields import TextField
from django.contrib.auth.models import User
from state_machine.models import SafetyLevel, ObjectState, VersionedForeignKey
from django.core.files import storage
from django.template.defaultfilters import filesizeformat
from friends.models import Friendship
from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _
from metadata.models import Section
from scipy import signal as spsignal

import settings

import os
import tables as tb


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

class Datafile(SafetyLevel, ObjectState):
    """
    Datafile is a class representing a data file stored at G-Node.
    """
    FORMAT_MAP = (
        (0, _('unknown')),
        (1, _('python-neuroshare')),
        (2, _('neo-io')),
        (3, _('ascii-csv')),
        (4, _('odml')),
        (5, _('hdf5_array')),
    )
    name = models.CharField( 'name', blank=True, max_length=200 )
    caption = models.TextField( 'description', blank=True)
    section = VersionedForeignKey(Section, blank=True, null=True)
    raw_file = models.FileField( 'raw_file', storage=fs, upload_to="data/") # or make_upload_path.. which doesn't work in PROD due to python2.5
    tags = TagField( 'tags' )
    # here we put file info extracted using neuroshare, stored as JSON
    extracted_info = models.TextField( 'extracted_info', blank=True, null=True, editable=False )
    # indicate whether the file is convertible using NEO / Neuroshare
    file_type = models.IntegerField( 'file_type', choices=FORMAT_MAP, default=0, editable=False )
    # store ID of the last Task Broker task
    last_task_id = models.CharField( 'last_task_id', blank=True, max_length=255, editable=False )
    # indicate whether some information was extracted from file (if archive)
    operations_log = models.TextField( 'operations_log', blank=True, null=True, editable=False )
    # size is stored in DB for SQL query performance
    size = models.IntegerField('size', blank=True, null=True)

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ("datafile_details", [str(self.local_id)])

    def get_owner(self):
        return self.owner

    @property
    def hsize(self):
        return filesizeformat(self.size)

    @property
    def info(self):
        if self.extracted_info:
            return json.loads(self.extracted_info)
        else:
            return None

    @property
    def is_archive(self):
        if tarfile.is_tarfile(self.raw_file.path) or \
            zipfile.is_zipfile(self.raw_file.path):
            return True
        return False

    @property
    def convertible(self):
        return not ( self.file_type == 0 or self.file_type == 5 )

    @property
    def has_array(self):
        return self.file_type == 5

    def get_slice(self, start_index=0, end_index=10**9, downsample=None, **kwargs):
        """ returns a slice of the array data.
        start, end - indexes as int """
        if not self.has_array:
            raise TypeError("This file cannot be opened for data slicing.")

        with tb.openFile(self.raw_file.path, 'r') as f:
            l = f.listNodes( "/" )[0][ start_index : end_index ]

        if downsample and downsample < len( l ):
            dataslice = spsignal.resample(l, downsample)

        return l # this is a [sliced] array

    def save(self, *args, **kwargs):
        """ need to update size """
        self.size = self.raw_file.size
        super(Datafile, self).save(*args, **kwargs)


