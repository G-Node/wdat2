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
)

in_development = (
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
)
