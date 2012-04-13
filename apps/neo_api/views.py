from rest.management import BaseHandler, ACLHandler, process_REST
from rest.common import BadRequest, Unauthorized, NotFound
from rest.serializers import Serializer

from neo_api.models import *
from neo_api.serializers import NEOSerializer, NEOCategorySerializer
from neo_api.handlers import NEOHandler, MetadataHandler

NEOCategoryHandlers, NEOObjectHandlers, NEOACLHandlers, MetadataHandlers = {}, {}, {}, {}
for key, classname in meta_classnames.items():
    NEOCategoryHandlers[key] = NEOHandler(NEOCategorySerializer, classname)
    NEOObjectHandlers[key] = NEOHandler(NEOSerializer, classname)
    MetadataHandlers[key] = MetadataHandler(Serializer, classname) # using ordinary serializer
    NEOACLHandlers[key] = ACLHandler(NEOSerializer, classname)


def get_object(obj_type, obj_id, user):
    """ Returns requested NEO object.
    Attention! This function returns HTTP response in case an exception occurs.
    """
    classname = meta_classnames[obj_type]
    try:
        obj = classname.objects.get(id=obj_id)
    except ObjectDoesNotExist:
        return BadRequest(json_obj={"neo_id": "%s_%s" % \
            (obj_type, obj_id)}, message_type="wrong_neo_id")
    if not obj.is_accessible(user):
        return Unauthorized(json_obj={"neo_id": "%s_%s" % \
            (obj_type, obj_id)}, message_type="not_authorized")
    return obj

def check_obj_type(func):
    """ Decorator that checks the correct object type. """
    argnames = func.func_code.co_varnames[:func.func_code.co_argcount]
    fname = func.func_name
    def auth_func(*args, **kwargs):
        if not kwargs["obj_type"] in meta_objects:
            return NotFound(message_type="not_found")
        return func(*args, **kwargs)
    return auth_func


@check_obj_type
def parse_neo_category(request, obj_type, *args, **kwargs):
    return process_REST(request, handler=NEOCategoryHandlers[obj_type], *args, **kwargs)

@check_obj_type
def parse_neo_object(request, obj_type, id, *args, **kwargs):
    return process_REST(request, id, handler=NEOObjectHandlers[obj_type], *args, **kwargs)

@check_obj_type
def get_metadata(request, obj_type, id, *args, **kwargs):
    return process_REST(request, id, handler=MetadataHandlers[obj_type], *args, **kwargs)

@check_obj_type
def parse_object_acl(request, obj_type, id, *args, **kwargs):
    return process_REST(request, id, handler=NEOACLHandlers[obj_type], *args, **kwargs)

