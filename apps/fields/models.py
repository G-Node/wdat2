from django import forms
from django.forms.util import ValidationError, ErrorList
from django.utils.encoding import smart_unicode, force_unicode
from django.utils.translation import ugettext_lazy as _
from django.forms.widgets import Select, SelectMultiple, HiddenInput, MultipleHiddenInput
from django.db import models

from neo_api.meta import meta_unit_types


# A ModelMultipleChoiceField with "Clear" helptext.
# Require a javascript code to be inserted to perform clear of selection.

class MMCFClearField(forms.ModelChoiceField):
    """A MultipleChoiceField whose choices are a model QuerySet."""
    widget = SelectMultiple
    hidden_widget = MultipleHiddenInput
    default_error_messages = {
        'list': _(u'Enter a list of values.'),
        'invalid_choice': _(u'Select a valid choice. %s is not one of the'
                            u' available choices.'),
        'invalid_pk_value': _(u'"%s" is not a valid value for a primary key.')
    }

    def __init__(self, queryset, cache_choices=False, required=False,
                 widget=None, label=None, initial=None,
                 help_text=None, *args, **kwargs):
        super(MMCFClearField, self).__init__(queryset, None,
            cache_choices, required, widget, label, initial, help_text,
            *args, **kwargs)
	# this string makes the only difference from 'ModelMultipleChoiceField'
	self.help_text = self.help_text + 'Hold down "Control", or "Command" on a Mac, to select more than one. To clear selection push <span id="clear_selection"><b onClick="unselectAll()">clear</b></span>.'

    def clean(self, value):
        if self.required and not value:
            raise ValidationError(self.error_messages['required'])
        elif not self.required and not value:
            return []
        if not isinstance(value, (list, tuple)):
            raise ValidationError(self.error_messages['list'])
        for pk in value:
            try:
                self.queryset.filter(pk=pk)
            except ValueError:
                raise ValidationError(self.error_messages['invalid_pk_value'] % pk)
        qs = self.queryset.filter(pk__in=value)
        pks = set([force_unicode(o.pk) for o in qs])
        for val in value:
            if force_unicode(val) not in pks:
                raise ValidationError(self.error_messages['invalid_choice'] % val)
        return qs


class UnitField(models.CharField):
    """
    This field is going to store a unit of any measure.
    """
    __metaclass__ = models.SubfieldBase
    _unit_type = None

    empty_strings_allowed = False

    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 10
        super(UnitField, self).__init__(*args, **kwargs)

    def validate(self, value, model_instance):
        super(UnitField, self).validate(value, model_instance)
        if self._unit_type and (not value.lower() in meta_unit_types[self._unit_type]):
            raise forms.ValidationError("Unit provided is not supported: " + str(value))

class TimeUnitField(UnitField):
    """
    This field should store time units.
    """
    def __init__(self, *args, **kwargs):
        super(TimeUnitField, self).__init__(*args, **kwargs)
        self._unit_type = 'time'
    
class SignalUnitField(UnitField):
    """
    This field stores signal units.
    """
    def __init__(self, *args, **kwargs):
        super(SignalUnitField, self).__init__(*args, **kwargs)
        self._unit_type = 'signal'

class SamplingUnitField(UnitField):
    """
    This field stores sampling rate units.
    """
    def __init__(self, *args, **kwargs):
        super(SamplingUnitField, self).__init__(*args, **kwargs)
        self._unit_type = 'sampling'


