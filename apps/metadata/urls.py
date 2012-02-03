from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # 1. Sections list
    # GET: get list of sections (as list, as tree etc.) POST/PUT - create, copy
    url(r'^sections/$', 'metadata.views.sections', name="sections"),

    # 2. Section details
    # GET: get single section, PUT/POST: update (move), DELETE: archive section.
    # serve partial data requests (info, data etc.) with GET params
    url(r'^sections/(?P<section_id>[\d]+)/?$', \
        'metadata.views.section_details', name="section_details"),

    # 3. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^sections/(?P<section_id>[\d]+)/properties/?$', \
        'metadata.views.properties', name="properties"),
    url(r'^properties/?$', \
        'metadata.views.properties', name="properties"),

    # 4. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both URLs do the same.
    url(r'^sections/(?P<section_id>[\d]+)/properties/(?P<property_id>[\d]+)/?$',\
        'metadata.views.property_details', name="property_details"),
    url(r'^properties/(?P<property_id>[\d]+)/?$',\
        'metadata.views.property_details', name="property_details"),

    # 5. Define in datafiles! #TODO
    # GET: all datafiles in this section
    url(r'^sections/(?P<section_id>[\d]+)/datafiles/?$',\
        'datafiles.views.datafiles', name="datafiles_for_section"),

    # 6. Define in NEO? #TODO
    # GET: all blocks in this section
    url(r'^sections/(?P<section_id>[\d]+)/blocks/?$',\
        'neo_api.views.handle_category', name="blocks_for_section"),

    # 7. Define in LABELS? #TODO
    # GET: all labels for a property
    url(r'^properties/(?P<property_id>[\d]+)/labels/?$',\
        'labels.views.labels', name="labels_for_property"),


    """
    # deprecated URLs ----------------------------------------------------------
    url(r'^section_add/$', 'metadata.views.section_add', name="section_add"),
    url(r'^section_delete/$', 'metadata.views.section_delete', name='section_delete'),
    url(r'^section_edit/$', 'metadata.views.section_edit', name='section_edit'),
    url(r'^section_move/$', 'metadata.views.section_move', name='section_move'),
    url(r'^section_copy/$', 'metadata.views.section_copy', name='section_copy'),

    url(r'^properties_list/(?P<id>\d+)/$', 'metadata.views.properties_list', name="properties_list"),
    url(r'^property_add/(?P<id>\d+)/$', 'metadata.views.property_add', name="property_add"),
    url(r'^property_edit/(?P<id>\d+)/$', 'metadata.views.property_edit', name='property_edit'),
    url(r'^dataset_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="dataset_link"),
    url(r'^datafile_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="datafile_link"),
    url(r'^timeseries_link/(?P<id>\d+)/$', 'metadata.views.object_link', name="timeseries_link"),

    url(r'^import_odml/(?P<id>\d+)/$', 'metadata.views.import_odml', name="import_odml"),
    url(r'^export_odml/(?P<id>\d+)/$', 'metadata.views.export_odml', name="export_odml"),

    url(r'^property_delete/$', 'metadata.views.property_delete', name='property_delete'),
    url(r'^remove_dataset/$', 'metadata.views.remove_object', name='remove_dataset'),
    url(r'^remove_datafile/$', 'metadata.views.remove_object', name='remove_datafile'),
    url(r'^remove_timeseries/$', 'metadata.views.remove_object', name='remove_timeseries'),
    """
)
