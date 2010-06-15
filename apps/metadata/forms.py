from django import forms
from django.forms import widgets
from datetime import datetime
from django.utils.translation import ugettext_lazy as _
from pinax.apps.projects.models import Project
from django.db.models import Q
from django.contrib.auth.models import User


from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from metadata.models import Section
from metadata.models import Property
from fields.models import MMCFClearField

class AddSectionForm(forms.ModelForm):
    
    class Meta:
        model = Section
        fields = ['title']
    
    def save(self, user, parent=None, parent_type=3):
	# parent types - "1" Experiment "2" Dataset "3" Section
	if parent_type == 3:
	    if parent.does_belong_to(user):
		section = Section(title=self.cleaned_data['title'], parent_section=parent)
		section.save()
		return section
	elif parent.owner == user:
	    if parent_type == 1:
		section = Section(title=self.cleaned_data['title'], parent_exprt=parent)
	    else:
		section = Section(title=self.cleaned_data['title'], parent_dataset=parent)
	    section.save()
	    return section
	else:
	    pass


class AddPropertyForm(forms.ModelForm):
    
    class Meta:
        model = Property
        fields = ['prop_title', 'prop_value']

class EditPropertyForm(forms.ModelForm):
    
    class Meta:
        model = Property
        fields = ['prop_title', 'prop_value', 'prop_description', 'prop_comment']


class LinkDatasetForm(forms.Form):
    datasets = forms.ModelMultipleChoiceField(queryset=RDataset.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        try:
            section = kwargs.pop('section')
        except:
            section = None
        super(LinkDatasetForm, self).__init__(*args, **kwargs)
        if section:
            for_exclude = section.rel_dataset.all().values_list("id", flat=True)
            choices = RDataset.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        else:
            choices = RDataset.objects.filter(owner=user, current_state=10)
        self.fields['datasets'].queryset = choices

