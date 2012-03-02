from django.utils.encoding import smart_unicode
from rest.serializers import Serializer


class NEOSerializer(Serializer):
    """ specal Serializer for NEO objects """

    """ here are the fields that require special REST processing. If set-up, you
    HAVE TO define methods for serialization (serialize_special) and 
    deserialization (deserialize_special) which will be used by REST manager for
    processing GET/POST/PUT requests. """
    special_for_serialization = ('times_data', 'signal_data', 'waveform_data')

    def serialize_special(self, obj, field):
        """ fields containing comma-separated float values require special 
        serialization, similar to data-fields """
        field_short = field.name[:field.name.find("_data")]
        units = smart_unicode(getattr(obj, field_short + "__unit"), self.encoding,\
            strings_only=True)
        self._current[field_short] = {
            'data': getattr(obj, field_short),
            'unit': units
        }


class NEOCategorySerializer(NEOSerializer):
    """ do not show reverse relations when list is requested """
    show_kids = False
