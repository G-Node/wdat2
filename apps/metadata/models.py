from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from experiments.models import Experiment
from datasets.models import RDataset

from django.utils.translation import ugettext_lazy as _

class Section(models.Model):
    # A metadata "Section". Used to organize experiment / dataset
    # metadata in a tree-like structure. May be linked to Experiment, 
    # Dataset or itself.
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
    parent_section = models.ForeignKey('self', null=True)

    def __unicode__(self):
        return self.title

    def get_owner(self):
        metadata_root = self.get_root()
        return metadata_root.owner

    def does_belong_to(self, user):
		metadata_root = self.get_root()
		if metadata_root is not None:
			if metadata_root.owner == user: return True
		return False

    def is_accessible(self, user):
        if self.get_root().is_accessible(user):
            return True
        else:
            return False

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
		if self.parent_exprt is not None:
			return self.parent_exprt
		elif self.parent_dataset is not None:
			return self.parent_dataset
		elif self.parent_section is not None:
			return self.parent_section.get_root()
		else:
			return None

    def get_tree(self):
        sec_tree = []
        sec_tree.append(self.id)
        sec_tree.append(self.title)
        if self.section_set.filter(current_state=10):
            for section in self.section_set.filter(current_state=10):
                sec_tree.append(section.get_tree())
        return sec_tree
	    

class Property(models.Model):
    # A metadata "Property". Defines any kind of metadata property 
    # and may be linked to the section.

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

    def update(self, title, value, description, comment):
        if title:
            self.prop_title = title
        if value:
            self.prop_value = value
        if description:
            self.prop_description = description
        if comment:
            self.prop_comment = comment



