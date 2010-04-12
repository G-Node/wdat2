from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from state_machine.models import SafetyLevel
from experiments.models import Experiment
from django.db.models import Q
#from django.db.models import Min, Max
from friends.models import Friendship

from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _

class RDataset(SafetyLevel):
    """
    A dataset with its details and raw data files
    """
    QUALITY = (
        (1, u'low'),
        (2, u'average'),
        (3, u'medium'),
        (4, u'good'),
        (5, u'excellent'),
    )

    title = models.CharField(_('title'), max_length=200)
    caption = models.TextField(_('caption'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    dataset_qty = models.IntegerField(_('dataset quality'), choices=QUALITY, default=4)
    owner = models.ForeignKey(User, related_name="added_datasets", blank=True, null=False)
    in_experiments = models.ManyToManyField(Experiment, blank=True, verbose_name=_('related experiments'))
    tags = TagField()

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("dataset_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)
    
    def file_volume_count(self):
        volume = 0
        datafiles = self.datafile_set.all().filter(Q(current_state=10))
        for datafile in datafiles:
            volume += datafile.raw_file.size
        return volume
    
    def get_min_file_date(self):
	# may use this method for Django 1.2
        #min_date = self.datafile_set.all().aggregate(Min('date_added'))
	files = self.datafile_set.all().order_by("date_added")
	try:
	    min_date = files.all()[0].date_added
	    return min_date
	except:
	    return None

    def get_max_file_date(self):
	# may use this method for Django 1.2
        #max_date = self.datafile_set.all().aggregate(Max('date_added'))
	files = self.datafile_set.all().order_by("-date_added")
	try:
	    max_date = files.all()[0].date_added
	    return max_date
	except:
	    return None
    
    def get_active_datafiles(self):
        return self.datafile_set.all().filter(Q(current_state=10))

    def addLinkedExperiment(self, experiment):
	self.in_experiments.add(experiment)

    def removeLinkedExperiment(self, experiment):
	self.in_experiments.remove(experiment)

    # defines whether an object (dataset) is accessible for a given user
    # <<< better to migrate it inside the state_machine with the "owner" property >>>
    def is_accessible(self, user):
        if (self.owner == user) or (self.is_Public()) or (user in self.shared_with.all()) or (self.is_Friendly() and Friendship.objects.are_friends(user, self.owner)):
            return True
        else:
            return False
