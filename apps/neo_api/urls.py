from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    url(r'^$', 'neo_api.views.process', name="create"), # one more is in root urls!
    url(r'^(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.process', name="get_or_update"),
    url(r'^(?P<neo_id>[\w]+_[\d]+)$', 'neo_api.views.process', name="get_or_update"),
    # - that's a jerky workaround for POST without trailing slash. If there are
    # more POST requests, better change to middleware:
    # http://djangosnippets.org/snippets/601/
    url(r'^select/(?P<obj_type>[\w]+)/$', 'neo_api.views.select', name="select"),
    url(r'^assign/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.assign', name="assign"),
    url(r'^delete/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.delete', name="delete"),
    url(r'^(?P<enquery>[\w]+)/(?P<neo_id>[\w]+_[\d]+)/$', 'neo_api.views.retrieve', name="retrieve"),
)
