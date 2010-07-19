import re
from django import forms
from django.forms import widgets
from datetime import datetime
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.conf import settings

from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from timeseries.models import TimeSeries
from fields.models import MMCFClearField

def reg_csv():
    #regex = re.compile('^[\d+\.\d*,]+$')
    return re.compile(r'''
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

class AddTSfromFieldForm(forms.ModelForm):

    def clean_data(self):
        r = reg_csv()
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


class AddTSfromFileForm(forms.Form):
    datafiles = forms.ModelChoiceField(queryset=Datafile.objects.all().filter(current_state=10))
    
    def clean_data(self):
        datafile = self.cleaned_data["datafiles"]
        r = reg_csv()
        res = []
        with open(settings.MEDIA_ROOT + str(datafile.raw_file), 'r') as f:
            read_data = f.readline()
            while read_data:
                values = r.findall(read_data)
                cleaned_data = ''
                for value in values:
                    try:
                        a = float(value)
                        cleaned_data += ', ' + str(a)
                    except:
                        raise forms.ValidationError(_('The data given is not a set of comma-separated float / integer values. Please check your input: %s') % value)
                if len(cleaned_data) > 0:
                    cleaned_data = cleaned_data[2:]
                res.append(cleaned_data)
                read_data = f.readline()
            return res

    class Meta:
        model = TimeSeries
        fields = ['data_type', 'time_step', 'time_step_items', 'tags']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        super(AddTSfromFileForm, self).__init__(*args, **kwargs)
        choices = Datafile.objects.filter(owner=user, current_state=10)
        self.fields['datafiles'].queryset = choices

    
class EditTSForm(forms.ModelForm):

    def clean_data(self):
        r = reg_csv()
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

class PrivacyEditForm(forms.ModelForm):
    
    class Meta:
        model = TimeSeries
        fields = ('safety_level', 'shared_with')
    
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(PrivacyEditForm, self).__init__(*args, **kwargs)
        choices = User.objects.exclude(id__exact=user.id)
        self.fields['shared_with'] = MMCFClearField(queryset=choices)

