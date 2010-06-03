from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # add section
    url(r'^section_add/$', 'metadata.views.section_add', name="section_add"),
    # remove section
    url(r'^section_delete/$', 'metadata.views.section_delete', name='section_delete'),
    # edit section
    url(r'^section_edit/$', 'metadata.views.section_edit', name='section_edit'),

    # properties list
    url(r'^properties_list/(?P<id>\d+)/$', 'metadata.views.properties_list', name="properties_list"),
    # add property
    url(r'^property_add/(?P<id>\d+)/$', 'metadata.views.property_add', name="property_add"),
    # edit property
    url(r'^property_edit/(?P<id>\d+)/$', 'metadata.views.property_edit', name='property_edit'),
    # link dataset
    url(r'^dataset_link/(?P<id>\d+)/$', 'metadata.views.dataset_link', name="dataset_link"),

    # remove property
    url(r'^property_delete/$', 'metadata.views.property_delete', name='property_delete'),
    # remove dataset
    url(r'^remove_dataset/$', 'metadata.views.remove_dataset', name='remove_dataset'),

)
