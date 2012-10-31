from django.conf.urls.defaults import url, patterns

urlpatterns = patterns('wdat.views',
    url(r'^$', 'data'),
    url(r'^data/$', 'data'),
    url(r'^test/(?P<filename>\w+)(\.html)?$', 'test')
)