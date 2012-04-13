from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # here supported -> GET: query all category, PUT/POST: create new
    url(r'^(?P<obj_type>[\w]+)/?$', 'neo_api.views.parse_neo_category', \
        name="neo_category"),

    # here supported -> GET: get single object, PUT/POST: update, DELETE: delete
    # serve partial data requests (info, data etc.) using GET params
    url(r'^(?P<obj_type>[\w]+)/(?P<id>[\d]+)/?$', \
        'neo_api.views.parse_neo_object', name="neo_object_details"),

    # responds with full object metadata, only GET supported
    url(r'^(?P<obj_type>[\w]+)/(?P<id>[\d]+)/metadata/?$', \
        'neo_api.views.get_metadata', name="neo_object_metadata"),

    # access lists, manage permissions
    url(r'^(?P<obj_type>[\w]+)/(?P<id>[\d]+)/acl/?$', \
        'neo_api.views.parse_object_acl', name="neo_object_acl"),
)



