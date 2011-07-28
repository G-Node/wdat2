from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    url(r'^$', 'neo_api.views.process', name="create"),
    url(r'^(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.process', name="get_or_update"),
    #url(r'^info/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.info', name="info"),
    #url(r'^data/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.data', name="data"),
    #url(r'^parents/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.parents', name="parents"),
    #url(r'^children/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.children', name="children"),
    url(r'^select/(?P<obj_type>[\w]+)/$', 'neo_api.views.select', name="select"),
    url(r'^assign/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.assign', name="assign"),
    url(r'^delete/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.delete', name="delete"),
    url(r'^(?P<enquery>[\w]+)/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.retrieve', name="retrieve"),
)
