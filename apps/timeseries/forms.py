from django import forms
from django.forms import widgets
from datetime import datetime
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User

from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from metadata.models import Section
from timeseries.models import TimeSeries

class AddTSfromFieldForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ['data']

class AddTSfromFileForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ['data']
    
class EditTSForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ['description', 'data_type', 'start_time', 'end_time', 
            'time_step', 'time_step_items', 'tags']

