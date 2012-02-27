from django.db import models
from state_machine.models import ObjectState
from rest.meta import meta_objects

class Label(ObjectState):
    """
    A label connects odML Value (see metadata module) and a NEO object.
    """
    NEO_CHOICES = set([(i, obj_type) for i, obj_type in enumerate(meta_objects)])

    odml_value = models.ForeignKey(Value, editable=False)
    neo_id = models.ForeignKey(Value, editable=False)
    neo_type = models.IntegerField(_('neo type'), choices=NEO_CHOICES, editable=False)

