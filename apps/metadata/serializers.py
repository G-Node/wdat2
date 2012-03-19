from django.core.exceptions import ObjectDoesNotExist

from rest.serializers import Serializer
from rest.meta import meta_objects

class PropertySerializer(Serializer):
    """ specal Serializer for Properties """

    """ here are the fields that require special REST processing. If set-up, you
    HAVE TO define methods for serialization (serialize_special) and 
    deserialization (deserialize_special) which will be used by REST manager for
    processing GET/POST/PUT requests. """
    special_for_deserialization = ('value_set',)
    excluded_cascade = ("value",)

    def deserialize_special(self, obj, field_name, field_value, user):
        """ process 'value_set' in POST/PUT requests so to update values for 
         this property at once """
        if not obj.id:
            raise ReferenceError("Please save the Property before providing values.")
        if field_name == 'value_set':
            model = getattr(obj, 'value_set').model
            assert type(field_value) == type([]), "Values should be provided as list."
            for v in field_value:
                assert type(v) == type({}), "Each Value provided should be of type dict."
                if v.has_key('fields'):
                    v = v['fields']
                value = model(parent_property=obj, owner=user, data=v['data'])
                value.save()

class SectionSerializer(Serializer):
    """ do not show properties within the list of sections """
    excluded_cascade = ("block",)


class SectionListSerializer(SectionSerializer):
    """ do not show properties within the list of sections """
    excluded_permalink = ("property",)


class ValueSerializer(Serializer):
    """ do not show all relations with NEO data objects. Deserialize reverse m2m
    with all NEO objects """
    do_not_show_if_empty = meta_objects
    special_for_deserialization = tuple(x + "_set" for x in meta_objects)

    def deserialize_special(self, obj, field_name, field_value, user):
        assert type(field_value) == type([])
        model = filter(lambda x: x.get_accessor_name() == field_name, \
            obj._meta.get_all_related_many_to_many_objects())[0].model

        m2m_data = [] # parse reverse NEO objects for this value
        for m2m in field_value:
            if self.is_permalink(m2m):
                m2m_obj = self.get_by_permalink(model, m2m)
            else:
                assert type(m2m) == int
                m2m_obj = model.objects.get(id=m2m)
            if not m2m_obj.is_editable(user):
                raise ReferenceError("Name: %s; Value: %s" % (field_name, field_value)) 
            m2m_data.append(m2m_obj)

        # old connections (to remove)
        old = list(set(getattr(obj, field_name).all()) - set(m2m_data))

        # new connections (create)
        new = list(set(m2m_data) - set(getattr(obj, field_name).all()))

        for o in old: 
            o.metadata.remove(obj)
            o.save()
        for n in new: 
            n.metadata.add(obj)
            n.save()
        """ importantly, this m2m processing in 'special' actually breaks the 
        'transactional' approach for processing HTTP POST requests, as these m2m
        relations are saved BEFORE the full parsing and processing is done (and 
        obj.full_clean() is executed). Special fields must be processed first 
        (so the method overwriting make sense in parent Serializer classes). 
        That means, this could lead to the situation that some of the relations 
        are updated and saved, but the response returns an error. """


