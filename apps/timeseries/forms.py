import re
from django import forms
from django.forms import widgets
from datetime import datetime
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User

from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
#from metadata.models import Section
from timeseries.models import TimeSeries

class AddTSfromFieldForm(forms.ModelForm):

    def clean_data(self):
        #regex = re.compile('^[\d+\.\d*,]+$')
        r = re.compile(r'''
            \s*                # Any whitespace.
            (                  # Start capturing here.
              [^,"']+?         # Either a series of non-comma non-quote characters.
              |                # OR
              "(?:             # A double-quote followed by a string of characters...
                  [^"\\]|\\.   # That are either non-quotes or escaped...
               )*              # ...repeated any number of times.
              "                # Followed by a closing double-quote.
              |                # OR
              '(?:[^'\\]|\\.)*'# Same as above, for single quotes.
            )                  # Done capturing.
            \s*                # Allow arbitrary space before the comma.
            (?:,|$)            # Followed by a comma or the end of a string.
            ''', re.VERBOSE)
        values = r.findall(self.cleaned_data["data"])
        cleaned_data = ''
        for value in values:
            try:
                a = float(value)
                cleaned_data += ', ' + str(a)
            except:
                raise forms.ValidationError(_('The data given is not a set of comma-separated float / integer values. Please check your input: %s') % value)
        if len(cleaned_data) > 0:
            cleaned_data = cleaned_data[2:]
        return cleaned_data

    class Meta:
        model = TimeSeries
        fields = ['data', 'data_type', 'time_step', 'time_step_items']

    def __init__(self, *args, **kwargs):
        super(AddTSfromFieldForm, self).__init__(*args, **kwargs)
        self.fields['data'].help_text = 'Please insert comma-separated values (floats or integers) in the field. Example: "0.8386, -0.8372, 0.839, -0.84, 0.8389".'
        self.fields['data_type'].help_text = 'ANALOG - typically a voltage trace. SPIKES - typically a sequence of "0, 0, 0, 1, 0", representing spike times.'

class AddTSfromFileForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ['data']
    
class EditTSForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ['description', 'data', 'data_type', 'start_time', 
            'time_step', 'time_step_items', 'tags']

    def __init__(self, *args, **kwargs):
        super(EditTSForm, self).__init__(*args, **kwargs)
        self.fields['data'].help_text = 'Please insert comma-separated values (floats or integers) in the field. Example: "0.8386, -0.8372, 0.839, -0.84, 0.8389".'
        self.fields['data_type'].help_text = 'ANALOG - typically a voltage trace. SPIKES - typically a sequence of "0, 0, 0, 1, 0", representing spike times.'

class DeleteTSForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        super(DeleteTSForm, self).__init__(*args, **kwargs)
        values = TimeSeries.objects.filter(owner=user, current_state=10)
        # this should give nothing
        values = filter(lambda x: x.is_accessible(user), values)
        self.fields['serie_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in values], required=False,
            widget=widgets.CheckboxSelectMultiple)


