from django.conf.urls.defaults import url, patterns

urlpatterns = patterns('wdat.views',
    url(r'^$', 'data'),
    url(r'^data/$', 'data'),
    url(r'^metadata/$', 'metadata'),
    url(r'^plot/$', 'plot')
)