from django.conf.urls.defaults import *

from rest.management import ObjectHandler, CategoryHandler
from rest.serializers import Serializer

from neo_api.models import *
from neo_api.serializers import NEOSerializer

NEOCategoryHandlers, NEOObjectHandlers = {}, {}
for key, classname in meta_classnames.items():
    NEOCategoryHandlers[key] = CategoryHandler(NEOSerializer, classname)
    NEOObjectHandlers[key] = ObjectHandler(NEOSerializer, classname)


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
    return NEOCategoryHandlers[obj_type](request, *args, **kwargs)

@check_obj_type
def parse_neo_object(request, obj_type, id, *args, **kwargs):
    return NEOObjectHandlers[obj_type](request, id, *args, **kwargs)


urlpatterns = patterns('',

    # here supported -> GET: query all category, PUT/POST: create new
    url(r'^(?P<obj_type>[\w]+)/?$', 'neo_api.urls.parse_neo_category', \
        name="neo_category"),

    # here supported -> GET: get single object, PUT/POST: update, DELETE: delete
    # serve partial data requests (info, data etc.) using GET params
    url(r'^(?P<obj_type>[\w]+)/(?P<id>[\d]+)/?$', \
        'neo_api.urls.parse_neo_object', name="neo_object_details"),
)



