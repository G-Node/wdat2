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
from timeseries.models import TimeSeries
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
    prop_value = forms.CharField()
    
    class Meta:
        model = Property
        fields = ['prop_title', 'prop_value']


class EditPropertyForm(forms.ModelForm):
    prop_value = forms.CharField(required=False, widget=widgets.TextInput())
    prop_description = forms.CharField(required=False, widget=widgets.TextInput())
    prop_comment = forms.CharField(required=False, widget=forms.TextInput())
    prop_name_definition = forms.CharField(required=False, widget=forms.TextInput())
    
    class Meta:
        model = Property
        fields = ['prop_title', 'prop_value']

    def __init__(self, *args, **kwargs):
        try:
            prop = kwargs.pop('prop')
        except:
            prop = None
        super(EditPropertyForm, self).__init__(*args, **kwargs)
        self.fields['prop_value'].initial = prop.prop_value
        self.fields['prop_description'].initial = prop.prop_description
        self.fields['prop_comment'].initial = prop.prop_comment
        self.fields['prop_name_definition'].initial = prop.prop_name_definition


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


class LinkDatafileForm(forms.Form):
    datafiles = forms.ModelMultipleChoiceField(queryset=Datafile.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        try:
            section = kwargs.pop('section')
        except:
            section = None
        super(LinkDatafileForm, self).__init__(*args, **kwargs)
        if section:
            for_exclude = section.rel_datafiles.all().values_list("id", flat=True)
            choices = Datafile.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        else:
            choices = Datafile.objects.filter(owner=user, current_state=10)
        self.fields['datafiles'].queryset = choices


class LinkTSForm(forms.Form):
    timeseries = forms.ModelMultipleChoiceField(queryset=TimeSeries.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        try:
            section = kwargs.pop('section')
        except:
            section = None
        super(LinkTSForm, self).__init__(*args, **kwargs)
        if section:
            for_exclude = section.rel_timeseries.all().values_list("id", flat=True)
            choices = TimeSeries.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        else:
            choices = TimeSeries.objects.filter(owner=user, current_state=10)
        self.fields['timeseries'].queryset = choices


