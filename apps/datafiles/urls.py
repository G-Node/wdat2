from django.conf.urls.defaults import * 
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    # GET: get list of datafiles POST/PUT - bulk update, create
    url(r'^$', 'datafiles.views.datafile_list', name="datafiles"),
    url(r'^datafile/?$', 'datafiles.views.datafile_list', name="datafiles_alias"),

    # GET: get single datafile, PUT/POST: update (move), DELETE: archive file.
    url(r'^(?P<id>[\d]+)/?$', 'datafiles.views.datafile', name="datafile_details"),
    url(r'^datafile/(?P<id>[\d]+)/?$', 'datafiles.views.datafile', name="datafile_details_alias"),

    # permissions
    url(r'^(?P<id>[\d]+)/acl/?$', 'datafiles.views.acl', name="datafile_acl"),
    url(r'^datafile/(?P<id>[\d]+)/acl/?$', 'datafiles.views.acl', name="datafile_acl_alias"),

    # download, convert, extract files from the archive
    url(r'^(?P<id>[\d]+)/(?P<operation>[\w]+)/?$', 'datafiles.views.operations', name="operations"),
    url(r'^datafile/(?P<id>[\d]+)/(?P<operation>[\w]+)/?$', 'datafiles.views.operations', name="operations_alias"),

    # get the file upload progress by HTTP_X_PROGRESS_ID
    url(r'^upload_progress/$', 'datafiles.views.upload_progress', name='upload_progress'),
)

