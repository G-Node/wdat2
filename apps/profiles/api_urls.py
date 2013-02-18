from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url(r'^$', 'profiles.views.api_users', name="api_user_list"),
    url(r'^(?P<id>[\d]+)/?$', 'profiles.views.api_user_details', name="api_user_by_id"),
    url(r'^(?P<username>[\w]+)/?$', 'profiles.views.api_user_details', name="api_user_by_name"),
)
