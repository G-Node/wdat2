from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from state_machine.models import SafetyLevel
from experiments.models import Experiment
from pinax.apps.projects.models import Project
from django.db.models import Q
#from django.db.models import Min, Max
from friends.models import Friendship

from tagging.fields import TagField
from django.utils.translation import ugettext_lazy as _

class RDataset(SafetyLevel):
    """
    A dataset with its details
    """
    QUALITY = (
        (1, u'low'),
        (2, u'average'),
        (3, u'medium'),
        (4, u'good'),
        (5, u'excellent'),
        (6, u'n/a'),
    )

    title = models.CharField(_('title'), max_length=200)
    caption = models.TextField(_('description'), blank=True)
    date_added = models.DateTimeField(_('date added'), default=datetime.now, editable=False)
    # the following field is legacy after rel. 2; remove if not used in 2011
    #dataset_qty = models.IntegerField(_('dataset quality'), choices=QUALITY, default=4)
    owner = models.ForeignKey(User, related_name="added_datasets", blank=True, null=False)
    # the following field is legacy after rel. 2; remove if not used in 2011
    #in_experiments = models.ManyToManyField(Experiment, blank=True, verbose_name=_('related experiments'))
    in_projects = models.ManyToManyField(Project, blank=True, verbose_name=_('related projects'))
    tags = TagField(_('keywords'))

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return ("dataset_details", [self.pk])
    get_absolute_url = models.permalink(get_absolute_url)

    def addLinkedProject(self, project):
        self.in_projects.add(project)

    def removeLinkedProject(self, project):
        self.in_projects.remove(project)

    # defines whether an object (dataset) is accessible for a given user
    # <<< maybe better to migrate it inside the state_machine with the "owner" property >>>, but kept like that to keep DB structure easier
    def is_accessible(self, user):
        if (self.owner == user) or (self.is_Public()) or (user in self.shared_with.all()) or (self.is_Friendly() and Friendship.objects.are_friends(user, self.owner)):
            return True
        else:
            return False

    def objects_count(self):
        datasets_no = 0
        datafiles_no = 0
        timeseries_no = 0
        files_vo = 0
        sections = self.section_set.all().filter(Q(current_state=10))
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
        if s1: 
            result = "Datasets (" + str(s1) + "), "
        if s2: 
            result = result + "Files (" + str(s2) + "), "
        if s3: 
            result = result + "Time Series (" + str(s3) + "), "
        if result: 
            result = result[:len(result)-2]
        return result


    # The methods below are legacy after implementation of 
    # the metadata section/property objects. So only applicable
    # for older objects in the database. Remove when no longer
    # required (in 2011).
    
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


