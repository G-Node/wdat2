from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    url(r'^$', 'neo_api.views.new', name="new"),
    url(r'^(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.operations', name="operations"),
    url(r'^data/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.data_only', name="data_only"),
    url(r'^list/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.contents', name="contents"),
    url(r'^assign/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.assign', name="assign"),
    url(r'^select/$', 'neo_api.select', name="select"),
)
