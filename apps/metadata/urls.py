from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # add section
    url(r'^section_add/$', 'metadata.views.section_add', name="section_add"),
    # remove section
    url(r'^section_delete/$', 'metadata.views.section_delete', name='section_delete'),
    # edit section
    url(r'^section_edit/$', 'metadata.views.section_edit', name='section_edit'),
    # move section
    url(r'^section_move/$', 'metadata.views.section_move', name='section_move'),
    # copy section
    url(r'^section_copy/$', 'metadata.views.section_copy', name='section_copy'),

    # properties list
    url(r'^properties_list/(?P<id>\d+)/$', 'metadata.views.properties_list', name="properties_list"),
    # add property
    url(r'^property_add/(?P<id>\d+)/$', 'metadata.views.property_add', name="property_add"),
    # edit property
    url(r'^property_edit/(?P<id>\d+)/$', 'metadata.views.property_edit', name='property_edit'),
    # link dataset
    url(r'^dataset_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="dataset_link"),
    # link datafile
    url(r'^datafile_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="datafile_link"),
    # link timeseries
    url(r'^timeseries_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="timeseries_link"),

    # import odml
    url(r'^import_odml/(?P<id>\d+)/$', 'metadata.views.import_odml', name="import_odml"),

    # remove property
    url(r'^property_delete/$', 'metadata.views.property_delete', name='property_delete'),
    # remove dataset
    url(r'^remove_dataset/$', 'metadata.views.remove_object', name='remove_dataset'),
    # remove datafile
    url(r'^remove_datafile/$', 'metadata.views.remove_object', name='remove_datafile'),
    # remove timeseries
    url(r'^remove_timeseries/$', 'metadata.views.remove_object', name='remove_timeseries'),

)
