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
from fields.models import MMCFClearField

class CreateExperimentForm(forms.ModelForm):
    title = forms.CharField(label="Name", initial="[" + str(datetime.now().strftime("%y-%m-%d") + "] "), help_text="It can be useful to include the date of the experiment in the name.")
    subject = forms.CharField(label="Topic")
    
    class Meta:
        model = Experiment
        fields = ['title', 'safety_level', 'in_projects', 'caption', 'tags']

    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(CreateExperimentForm, self).__init__(*args, **kwargs)
        choices = Project.objects.all().filter(Q(creator=user))
        self.fields['in_projects'] = MMCFClearField(queryset=choices)
        self.fields['in_projects'].label = "Related to projects"
        self.fields['in_projects'].help_text = 'List the project or projects in the context of which the experiment was performed. <br>Hold down "Control", or "Command" on a Mac, to select more than one. To clear selection push <span id="clear_selection"><a href="#" onClick="unselectAll()">clear</a></span>.'
        self.fields['safety_level'].help_text = "Nobody can see your PRIVATE experiments. FRIENDLY experiments can be viewed only by people you know. PUBLIC experiments available for everybody."


class ExperimentShortEditForm(forms.ModelForm):
    
    class Meta:
        model = Experiment
        fields = ('title', 'caption', 'tags')
        
class PrivacyEditForm(forms.ModelForm):

    class Meta:
        model = Experiment
        fields = ('safety_level', 'shared_with')
    
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(PrivacyEditForm, self).__init__(*args, **kwargs)
        choices = User.objects.exclude(id__exact=user.id)
        self.fields['shared_with'] = MMCFClearField(queryset=choices)
	# another way how to keep empty values
	#self.fields['shared_with'].empty_label="--(nobody)--"
	#self.fields['shared_with'].required=False

