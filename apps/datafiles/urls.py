from django.conf.urls.defaults import * 
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    # GET: get list of datafiles POST/PUT - bulk update, create
    url(r'^$', 'datafiles.views.datafile_list', name="datafiles"),

    # GET: get single datafile, PUT/POST: update (move), DELETE: archive file.
    url(r'^(?P<id>[\d]+)/?$', 'datafiles.views.datafile', name="datafile_details"),

    # permissions
    url(r'^(?P<id>[\d]+)/acl/?$', 'datafiles.views.acl', name="datafile_acl"),

    # download, convert, extract files from the archive
    url(r'^(?P<id>[\d]+)/(?P<operation>[\w]+)/?$', 'datafiles.views.operations', name="operations"),

    # get the file upload progress by HTTP_X_PROGRESS_ID
    url(r'^upload_progress/$', 'datafiles.views.upload_progress', name='upload_progress'),
)

