from django import forms
from django.forms import widgets
from django.utils.safestring import mark_safe
from datafiles.models import Datafile
from django.db.models import Q

        
class RestoreFilesForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        super(RestoreFilesForm, self).__init__(*args, **kwargs)
        self.fields['fil_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in Datafile.objects.filter(Q(current_state=20, owner=user))],
            widget=widgets.CheckboxSelectMultiple)
