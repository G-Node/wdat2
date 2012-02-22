from rest.serializers import Serializer
from django.core.exceptions import ObjectDoesNotExist
from metadata.models import Value

class PropertySerializer(Serializer):
    """ specal Serializer for Properties """

    non_cascade_rel = ("value",) # reversed children are shown in REST responses

    """ here are the fields that require special REST processing. If set-up, you
    HAVE TO define methods for serialization (serialize_special) and 
    deserialization (deserialize_special) which will be used by REST manager for
    processing GET/POST/PUT requests. """
    special_for_deserialization = ('value_set',)  

    def deserialize_special(self, obj, field_name, field_value):
        """ process 'value_set' in POST/PUT requests so to update values for 
        this property at once """
        if field_name == 'value_set':
            assert type(field_value) == type([])
            for v in field_value:
                assert v.has_key('fields')
                if v.has_key('pk'):
                    try:
                        value = Value.objects.get(id=v['pk'])
                        if not value.property == obj:
                            raise ObjectDoesNotExist
                    except ObjectDoesNotExist:
                        raise ValueError("Value with this PK does not exist or \
                            does not belong to this property.")
                    value.data = v['fields']['data']
                else:
                    value = Value(property=obj, data=v['fields']['data'])
                value.save()


class SectionSerializer(Serializer):
    non_cascade_rel = ("property",) # reversed children are shown in REST responses

