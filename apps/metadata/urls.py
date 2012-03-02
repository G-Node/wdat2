from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # 1. Sections list
    # GET: get list of sections (as list, as tree etc.) POST/PUT - create, copy
    url(r'^sections/?$', 'metadata.views.section_list', name="sections"),

    # 2. Section details
    # GET: get single section, PUT/POST: update (move), DELETE: archive section.
    # serve partial data requests (info, data etc.) with GET params
    url(r'^sections/(?P<id>[\d]+)/?$', \
        'metadata.views.section', name="section_details"),
    url(r'^sections/(?P<id>[\d]+)/acl/?$', \
        'metadata.views.acl', name="section_acl"),

    # 3. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^sections/(?P<section_id>[\d]+)/properties/?$', \
        'metadata.views.property_list', name="properties_for_section"),
    url(r'^properties/?$', \
        'metadata.views.property_list', name="properties"),

    # 4. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both views do the same.
    url(r'^properties/(?P<id>[\d]+)/?$',\
        'metadata.views.property', name="property_details"),

    # 5. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^properties/(?P<property_id>[\d]+)/values/?$', \
        'metadata.views.value_list', name="values_for_property"),
    url(r'^values/?$', \
        'metadata.views.value_list', name="values"),

    # 6. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both views do the same.
    url(r'^values/(?P<id>[\d]+)/?$',\
        'metadata.views.value', name="value_details"),
)

in_development = (
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
