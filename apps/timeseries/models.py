from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
#from metadata.models import Section
from state_machine.models import SafetyLevel
from tagging.fields import TagField

from django.utils.translation import ugettext_lazy as _

class TimeSeries(SafetyLevel):
    # A class representing timeseries data. May be linked to a section in 
    # the metadata.
    TYPES = (
        (10, _('ANALOG')),
        (20, _('SPIKES')),
    )
    ITEMS = (
        (10, _('Hz')),
        (11, _('KHz')),
        (12, _('MHz')),
        (13, _('GHz')),
        (20, _('sec')),
        (21, _('ms')),
        (22, _('mcs')),
        (23, _('ns')),
    )
    title = models.CharField(_('title'), max_length=100)
    caption = models.TextField(_('description'), blank=True)
    date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    owner = models.ForeignKey(User, editable=False)
    data = models.TextField(_('data'), blank=True)
    data_type = models.IntegerField(_('data type'), choices=TYPES, default=10)
    start_time = models.DateTimeField(_('start time'), default=datetime.now, blank=True)
    time_step = models.IntegerField(_('data timestep'), default=1)
    time_step_items = models.IntegerField(_('units'), choices=ITEMS  , default=21)
    tags = TagField(_('keywords'))

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("timeseries_list", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

    def get_owner(self):
        return self.owner

    def does_belong_to(self, user):
        if self.owner == user: return True
        return False

    def is_accessible(self, user):
        if (self.owner == user) or (self.is_Public()) or (user in self.shared_with.all()) or (self.is_Friendly() and Friendship.objects.are_friends(user, self.owner)):
            return True
        else:
            return False

    def rename(self, new_title):
        self.title = new_title
        self.save()

    def getNextCounter(self, user):
        c = TimeSeries.objects.filter(owner=user).count()
        title = (_("%s") % c)
        while len(title) < 8:
            title = "0" + title
        return title

    def getData(self):
        return self.data

    def getTimeStep(self):
        return self.time_step



