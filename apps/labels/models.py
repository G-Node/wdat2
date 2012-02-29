from django.db import models
from django.utils.translation import ugettext_lazy as _

from rest.meta import meta_objects
from state_machine.models import ObjectState
from metadata.models import Value

class Label(ObjectState):
    """
    A label connects odML Value (see metadata module) and a NEO object.
    """

    NEO_CHOICES = set([(i, obj_type) for i, obj_type in enumerate(meta_objects)])

    odml_value = models.ForeignKey(Value, editable=False)
    neo_id = models.IntegerField(editable=False)
    neo_type = models.IntegerField(_('neo type'), choices=NEO_CHOICES, editable=False)

    @classmethod
    def neo_int_type(self, obj_type):
        """ given an obj_type (str) returns an index using NEO_CHOICES """
        for k, v in dict(self.NEO_CHOICES).items():
            if obj_type == v: return k
        return None

