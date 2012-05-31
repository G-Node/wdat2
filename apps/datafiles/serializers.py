from rest.serializers import Serializer
from rest.meta import meta_objects

class FileSerializer(Serializer):
    """ do not show all relations with NEO data objects. Do not process raw_file
    field when update """
    do_not_show_if_empty = meta_objects
    special_for_serialization = ("raw_file",)
    special_for_deserialization = ("raw_file",)

    def serialize_special(self, obj, field):
        """ do not serialize raw_file """
        self._current['size'] = obj.hsize

    def deserialize_special(self, obj, field_name, field_value, user):
        """ do not process raw_file field """
        pass
