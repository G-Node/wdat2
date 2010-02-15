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

class CreateExperimentForm(forms.ModelForm):
    title = forms.CharField(initial="[" + str(datetime.now().strftime("%b %d") + "]"), help_text="It's useful to start the name of your experiment by the month / date it was recorded")
    
    class Meta:
        model = Experiment
        fields = ['title', 'safety_level', 'exp_type', 'subject', 'in_projects', 'caption', 'tags']

    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(CreateExperimentForm, self).__init__(*args, **kwargs)
        choices = Project.objects.all().filter(Q(creator=user))
        self.fields['in_projects'].queryset = choices
        self.fields['safety_level'].help_text = "Nobody can see your PRIVATE experiments. FRIENDLY experiments can be viewed only by people you know. PUBLIC experiments available for everybody."

class ExperimentEditForm(forms.ModelForm):
    
    class Meta:
        model = Experiment
        exclude = ('date_created', 'owner', 'current_state')
        
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(ExperimentEditForm, self).__init__(*args, **kwargs)

class ExperimentShortEditForm(forms.ModelForm):
    
    class Meta:
        model = Experiment
        fields = ('title', 'exp_type', 'subject', 'caption', 'tags')
        
class PrivacyEditForm(forms.ModelForm):
    
    class Meta:
        model = Experiment
        fields = ('safety_level', 'shared_with')
    
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(PrivacyEditForm, self).__init__(*args, **kwargs)
        choices = User.objects.exclude(id__exact=user.id)
        self.fields['shared_with'].queryset = choices        

class AddDatasetForm(forms.Form):
    datasets = forms.ModelMultipleChoiceField(queryset=RDataset.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        exprt = kwargs.pop('exprt')
        super(AddDatasetForm, self).__init__(*args, **kwargs)
	for_exclude = exprt.rdataset_set.all().values_list("id", flat=True)
        choices = RDataset.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        self.fields['datasets'].queryset = choices

class RemoveDatasetsForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        exprt = kwargs.pop('exprt')
        super(RemoveDatasetsForm, self).__init__(*args, **kwargs)
        values = exprt.rdataset_set.all().filter(Q(current_state=10))
        values = filter(lambda x: x.is_accessible(user), values)
        self.fields['dset_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in values], required=False,
            widget=widgets.CheckboxSelectMultiple)

class AddDatafileForm(forms.Form):
    datafiles = forms.ModelMultipleChoiceField(queryset=Datafile.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        exprt = kwargs.pop('exprt')
        super(AddDatafileForm, self).__init__(*args, **kwargs)
	for_exclude = exprt.datafile_set.all().values_list("id", flat=True)
        choices = Datafile.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        self.fields['datafiles'].queryset = choices

class RemoveDatafilesForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        exprt = kwargs.pop('exprt')
        super(RemoveDatafilesForm, self).__init__(*args, **kwargs)
	values = exprt.datafile_set.all().filter(Q(current_state=10))
	values = filter(lambda x: x.is_accessible(user), values)
        self.fields['dfile_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in values], required=False,
            widget=widgets.CheckboxSelectMultiple)

