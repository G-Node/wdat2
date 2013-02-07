from rest.serializers import Serializer
from rest.meta import meta_objects

class UserSerializer(Serializer):
    """ do not show all relations with NEO data objects. Deserialize reverse m2m
    with all NEO objects """
    show_kids = False
    excluded_permalink = tuple(x + "_set" for x in meta_objects)
    special_for_serialization = ("email", "is_active", "is_staff", \
        "is_superuser", "last_login", "password", "user_permissions")

    def serialize_special(self, obj, field):
        """ ignore these fields """
        pass

