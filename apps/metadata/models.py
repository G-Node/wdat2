from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from timeseries.models import TimeSeries

from django.utils.translation import ugettext_lazy as _
from django.shortcuts import get_object_or_404

class Section(models.Model):
    # A metadata "Section". Used to organize experiment / dataset / file / timeseries
    # metadata in a tree-like structure. May be linked to Experiment, 
    # Dataset, File, Timeseries or itself.
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    # the state is not inherited from state_machine module due to 
    # the complexity of the DB structure
    current_state = models.IntegerField(_('state'), choices=STATES, default=10)
    title = models.CharField(_('title'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    parent_exprt = models.ForeignKey(Experiment, null=True)
    parent_dataset = models.ForeignKey(RDataset, null=True)
    parent_datafile = models.ForeignKey(Datafile, null=True)
    parent_timeseries = models.ForeignKey(TimeSeries, null=True)
    parent_section = models.ForeignKey('self', null=True)
    rel_datasets = models.ManyToManyField(RDataset, related_name="sec_datasets", blank=True, verbose_name=_('related datasets'))
    rel_datafiles = models.ManyToManyField(Datafile, related_name="sec_datafiles",  blank=True, verbose_name=_('related datafiles'))
    rel_timeseries = models.ManyToManyField(TimeSeries, related_name="sec_timeseries", blank=True, verbose_name=_('related time series'))
    # position in the tree. to be able to move up and down
    tree_position = models.IntegerField(_('tree position'))
    # field indicates whether it is a "template" section
    is_template = models.BooleanField(_('is template'), default=False)
    # for "template" section this is a pointer to a user, who created this default
    # template. if "NULL" - all users see section as a "template" (odML vocabulary)
    user_custom = models.ForeignKey(User, blank=True, null=True)

    def __unicode__(self):
        return self.title

    def get_owner(self):
        metadata_root = self.get_root()
        if metadata_root:
            return metadata_root.owner
        else:
            return None

    def does_belong_to(self, user):
		metadata_root = self.get_root()
		if metadata_root is not None:
			if metadata_root.owner == user: return True
		return False

    def is_accessible(self, user):
        # indicates whether this section belongs to some complex object
        if self.get_root():
            if self.get_root().is_accessible(user):
                return True
            else:
                return False
        # if there is no "root" object, then it's a template
        else:
            return True

    def rename(self, new_title):
        self.title = new_title
        self.save()

    def deleteObject(self):
        if not self.current_state == 30: 
            self.current_state = 20
            self.save()
            return True
        return False

    def get_root(self):
		if self.parent_section is not None:
			return self.parent_section.get_root()
		elif self.parent_exprt is not None:
			return self.parent_exprt
		elif self.parent_dataset is not None:
			return self.parent_dataset
		elif self.parent_datafile is not None:
			return self.parent_datafile
		elif self.parent_timeseries is not None:
			return self.parent_timeseries
		else:
			return None

    def get_tree(self):
        sec_tree = []
        sec_tree.append(self.id)
        sec_tree.append(self.title)
        if self.section_set.filter(current_state=10):
            for section in self.section_set.filter(current_state=10).order_by("tree_position"):
                sec_tree.append(section.get_tree())
        return sec_tree

    def get_tree_JSON(self):
        sec_tree = '"' + str(self.id) + '": { "ids": "'
        for section in self.section_set.filter(current_state=10).order_by("tree_position"):
            sec_tree += str(section.id) + ', '
        sec_tree += '", '
        if self.section_set.filter(current_state=10):
            for section in self.section_set.filter(current_state=10).order_by("tree_position"):
                sec_tree += section.get_tree_JSON()
        sec_tree += '}, '
        return sec_tree

    def getActiveProperties(self):
        return self.property_set.filter(current_state=10)	    

    def getActiveDatasets(self):
        return self.rel_datasets.filter(current_state=10)	    
    def hasDataset(self, dataset_id):
        if self.rel_datasets.filter(current_state=10, id=dataset_id):
            return True
        return False

    def getActiveDatafiles(self):
        return self.rel_datafiles.filter(current_state=10)	    
    def hasDatafile(self, datafile_id):
        if self.rel_datafiles.filter(current_state=10, id=datafile_id):
            return True
        return False

    def getActiveTimeSeries(self):
        return self.rel_timeseries.filter(current_state=10)	    
    def hasTimeSeries(self, tserie_id):
        if self.rel_timeseries.filter(current_state=10, id=tserie_id):
            return True
        return False

    def hasChild(self):
        if self.getActiveProperties() or self.getActiveDatasets() or self.getActiveDatafiles() or self.getActiveTimeSeries():
            return True
        return False

    def getMaxChildPos(self):
        sec_childs = self.section_set.all().order_by("-tree_position")
        if sec_childs:
            tree_pos = int(sec_childs.all()[0].tree_position)
        else:
            tree_pos = 0
        return tree_pos

    def copy_section(self, section, pos, prnt=0):
        res_tree = []
        # make a copy of a section, self = a place to copy
        section_id = int(section.id)
        section.id = None
        if prnt:
            # parent object is not a Section
            prn_obj = self.getParentObject()
            if isinstance(prn_obj, Experiment):
                section.parent_exprt = prn_obj
            elif isinstance(prn_obj, RDataset):
                section.parent_dataset = prn_obj
            elif isinstance(prn_obj, Datafile):
                section.parent_datafile = prn_obj
            elif isinstance(prn_obj, TimeSeries):
                section.parent_timeseries = prn_obj
        else:
            section.parent_section = self
        section.tree_position = pos
        section.is_template = 0
        #section.date_created = datetime.now # setup later
        section.save()
        cp_section = Section.objects.get(id=section_id)
        new_id = section.id
        res_tree.append(new_id)
        # copy all properties
        for prop in cp_section.getActiveProperties():
            prop.id = None
            prop.parent_section = new_id
            #prop.prop_date_created = datetime.now # setup later
            prop.save()
            prop.setParent(new_id)
        # copy all linked objects
        for dataset in cp_section.rel_datasets.filter(current_state=10):
            section.addLinkedObject(dataset, "dataset")
        for datafile in cp_section.rel_datafiles.filter(current_state=10):
            section.addLinkedObject(datafile, "datafile")
        for timeseries in cp_section.rel_timeseries.filter(current_state=10):
            section.addLinkedObject(timeseries, "timeseries")
        section.save()

        # recursively copy sections inside
        for sec in cp_section.section_set.filter(current_state=10).order_by("tree_position"):
            res_tree.append(section.copy_section(sec, sec.tree_position))
        return res_tree

    def getParentSection(self):
        if self.parent_section:
            return self.parent_section
        else:
            return None

    def getParentObject(self):
        if self.parent_section:
            return self.parent_section
        else:
            if self.parent_exprt:
                return self.parent_exprt
            elif self.parent_dataset:
                return self.parent_dataset
            elif self.parent_datafile:
                return self.parent_datafile
            elif self.parent_timeseries:
                return self.parent_timeseries
            else:
                return None

    def increaseTreePos(self):
        a = self.tree_position
        self.tree_position = a + 1
        self.save()
        #b = self.tree_position
        #f = y5

    def clean_parent(self):
        self.parent_section = None
        self.parent_exprt = None
        self.parent_dataset = None
        self.parent_datafile = None
        self.parent_timeseries = None
        self.save()

    def addLinkedObject(self, obj, obj_type):
        if obj_type == "dataset":
            self.rel_datasets.add(obj)
        elif obj_type == "datafile":
            self.rel_datafiles.add(obj)
        elif obj_type == "timeseries":
            self.rel_timeseries.add(obj)

    def removeLinkedObject(self, obj, obj_type):
        if obj_type == "dataset":
            self.rel_datasets.remove(obj)
        elif obj_type == "datafile":
            self.rel_datafiles.remove(obj)
        elif obj_type == "timeseries":
            self.rel_timeseries.remove(obj)

    # the following method doesn't work actually.
    def get_parents_as_string(self, obj, obj_type):
        # get the parent objects to which this file is linked to
        # types: "dataset", "datafile", "timeseries"
        objs = []
        s = ''
        sections = Section.objects.filter(current_state=10)
        if obj_type == "dataset":
            sections = filter(lambda x: x.hasDataset(obj.id), sections)
        if obj_type == "datafile":
            sections = filter(lambda x: x.hasDatafile(obj.id), sections)
        if obj_type == "timeseries":
            sections = filter(lambda x: x.hasTimeSeries(obj.id), sections)
        else:
            sections = []
        for section in sections:
            rt = section.get_root()
            if rt and (not rt in objs):
                objs.append(section.get_root())
                s += ', <a href="' + rt.get_absolute_url + '">' + rt.title + '</a>'
        return s

class Property(models.Model):
    # A metadata "Property". Defines any kind of metadata property 
    # and may be linked to the section.
    STATES = (
        (10, _('Active')),
        (20, _('Deleted')),
        (30, _('Archived')),
    )
    # the state is not inherited from state_machine module due to 
    # the complexity of the DB structure
    current_state = models.IntegerField(_('state'), choices=STATES, default=10)
    prop_title = models.CharField(_('title'), max_length=100)
    prop_value = models.TextField(_('value'), blank=True)
    prop_description = models.TextField(_('description'), blank=True)
    prop_name_definition = models.TextField(_('name_definition'), blank=True)
    prop_comment = models.TextField(_('comment'), blank=True)
    prop_date_created = models.DateTimeField(_('date created'), default=datetime.now, editable=False)
    prop_parent_section = models.ForeignKey(Section, blank=True)

    def __unicode__(self):
        return self.title

    def does_belong_to(self, user):
        section = self.prop_parent_section
        if section.does_belong_to(user):
            return True
        else:
            return False

    def update(self, title, value, description, comment, definition):
        if title:
            self.prop_title = title
        if value:
            self.prop_value = value
        if description:
            self.prop_description = description
        if comment:
            self.prop_comment = comment
        if definition:
            self.prop_name_definition = definition

    def setParent(self, par_id):
        self.prop_parent_section = Section.objects.get(id=par_id)
        self.save()

    def deleteObject(self):
        if not self.current_state == 30: 
            self.current_state = 20
            self.save()
            return True
        return False


