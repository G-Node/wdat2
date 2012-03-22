from django.utils.encoding import smart_unicode
from rest.serializers import Serializer
from django.core.exceptions import ValidationError


class NEOSerializer(Serializer):
    """ specal Serializer for NEO objects """

    """ here are the fields that require special REST processing. If set-up, you
    HAVE TO define methods for serialization (serialize_special) and 
    deserialization (deserialize_special) which will be used by REST manager for
    processing GET/POST/PUT requests. """
    special_for_serialization = ('times_data', 'signal_data', 't_start', 'waveform_data')
    special_for_deserialization = ('times', 'signal', 'waveform')

    def serialize_special(self, obj, field):
        """ fields containing comma-separated float values require special 
        serialization, similar to data-fields """
        if self.serialize_data:
            if field.attname == 't_start': # all have this attribute, skip other fields

                if obj.obj_type == "irsaanalogsignal":
                    signal, times, t_start = obj.get_slice(**self.options)
                    attrs = {"signal": signal, "times": times, "t_start": t_start}
                elif obj.obj_type == "analogsignal":
                    signal, t_start = obj.get_slice(**self.options)
                    attrs = {"signal": signal, "t_start": t_start}
                elif obj.obj_type == "spiketrain":
                    times, t_start = obj.get_slice(**self.options)
                    attrs = {"times": times, "t_start": t_start}
                for key, attr in attrs.items():
                    units = smart_unicode(getattr(obj, key + "__unit"), \
                        self.encoding, strings_only=True)
                    self._current[key] = {
                        'data': attr,
                        'units': units
                    }

    def deserialize_special(self, obj, field_name, field_value, user):
        """ process special data fields having decorated properties as fields """
        if not self.is_data_field_json(field_name, field_value):
            raise ValidationError("The field %s must be a dict with 'data' and\
 'units' keys." % field_name)
        setattr(obj, field_name, field_value["data"])
        setattr(obj, field_name + "__unit", field_value["units"])


class NEOCategorySerializer(NEOSerializer):
    """ do not show reverse relations when list is requested """
    show_kids = False


