from django import forms
from django.forms import widgets
from datetime import datetime
from django.utils.translation import ugettext_lazy as _
from django.db.models import Q
from django.contrib.auth.models import User


from datasets.models import RDataset
from datafiles.models import Datafile
from experiments.models import Experiment

class NewRDatasetForm(forms.ModelForm):
    
    class Meta:
        model = RDataset
        fields = ['title', 'safety_level', 'dataset_qty', 'in_experiments', 'caption', 'tags']

    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(NewRDatasetForm, self).__init__(*args, **kwargs)
        choices = Experiment.objects.all().filter(Q(owner=user))
        self.fields['in_experiments'].queryset = choices
        self.fields['safety_level'].help_text = "Nobody can see your PRIVATE datasets. FRIENDLY datasets can be viewed only by people you know. PUBLIC datasets available for everybody."
        
class RDatasetEditForm(forms.ModelForm):
    
    class Meta:
        model = RDataset
        exclude = ('date_added', 'owner', 'current_state')
        
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(RDatasetEditForm, self).__init__(*args, **kwargs)

class DeleteDatasetsForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        super(DeleteDatasetsForm, self).__init__(*args, **kwargs)
        self.fields['set_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in RDataset.objects.filter(Q(current_state=10, owner=user))],
            widget=widgets.CheckboxSelectMultiple)

class DatasetShortEditForm(forms.ModelForm):
    
    class Meta:
        model = RDataset
        fields = ('title', 'dataset_qty', 'caption', 'tags')
        
class PrivacyEditForm(forms.ModelForm):
    
    class Meta:
        model = RDataset
        fields = ('safety_level', 'shared_with')
    
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(PrivacyEditForm, self).__init__(*args, **kwargs)
        choices = User.objects.exclude(id__exact=user.id)
        self.fields['shared_with'].queryset = choices

class AddDatafileForm(forms.Form):
    datafiles = forms.ModelMultipleChoiceField(queryset=Datafile.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        dataset = kwargs.pop('dataset')
        super(AddDatafileForm, self).__init__(*args, **kwargs)
	for_exclude = dataset.datafile_set.all().values_list("id", flat=True)
        choices = Datafile.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        self.fields['datafiles'].queryset = choices

class RemoveDatafilesForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        dataset = kwargs.pop('dataset')
        super(RemoveDatafilesForm, self).__init__(*args, **kwargs)
	values = dataset.datafile_set.all().filter(Q(current_state=10))
	values = filter(lambda x: x.is_accessible(user), values)
        self.fields['dfile_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in values], required=False,
            widget=widgets.CheckboxSelectMultiple)
