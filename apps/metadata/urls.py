from django.conf.urls.defaults import *

from rest.management import ObjectHandler, CategoryHandler
from rest.serializers import Serializer

from metadata.models import Section, Property

section_manager_single = ObjectHandler(Serializer, Section)
section_manager_category = CategoryHandler(Serializer, Section)

property_manager_single = ObjectHandler(Serializer, Property)
property_manager_category = CategoryHandler(Serializer, Property)

urlpatterns = patterns('',
    # 1. Sections list
    # GET: get list of sections (as list, as tree etc.) POST/PUT - create, copy
    #url(r'^sections/$', 'metadata.views.sections', name="sections"),
    url(r'^sections/$', section_manager_category, name="sections"),

    # 2. Section details
    # GET: get single section, PUT/POST: update (move), DELETE: archive section.
    # serve partial data requests (info, data etc.) with GET params
    #url(r'^sections/(?P<section_id>[\d]+)/?$', \
    #    'metadata.views.section_details', name="section_details"),
    url(r'^sections/(?P<id>[\d]+)/?$', \
        section_manager_single, name="section_details"),

    # 3. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^sections/(?P<section_id>[\d]+)/properties/?$', \
        property_manager_category, name="properties_for_section"),
    url(r'^properties/?$', \
        property_manager_category, name="properties"),

    # 4. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both URLs do the same.
    url(r'^properties/(?P<id>[\d]+)/?$',\
        property_manager_single, name="property_details"),
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
