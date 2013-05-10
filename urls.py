from django.conf.urls.defaults import url, patterns

urlpatterns = patterns('wdat.views',
    url(r'^$', 'wdat'),
    url(r'^wdat/$', 'wdat'),
    url(r'^test/(?P<filename>\w+)(\.html)?$', 'test')
)