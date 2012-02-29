from django.conf.urls.defaults import *

from rest.management import ObjectHandler, CategoryHandler, process_REST
from rest.serializers import Serializer

from metadata.serializers import PropertySerializer, SectionSerializer, ValueSerializer
from metadata.handlers import PropertyCategoryHandler, ValueCategoryHandler
from metadata.models import Section, Property, Value

# TODO move to views.py

def section(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(Serializer, Section), *args, **kwargs)

def section_list(request, *args, **kwargs):
    return process_REST(request, handler=CategoryHandler(SectionSerializer, Section), *args, **kwargs)

def property(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(PropertySerializer, Property), *args, **kwargs)

def property_list(request, *args, **kwargs):
    return process_REST(request, handler=PropertyCategoryHandler(PropertySerializer, Property), *args, **kwargs)

def value(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(ValueSerializer, Value), *args, **kwargs)

def value_list(request, *args, **kwargs):
    return process_REST(request, handler=ValueCategoryHandler(ValueSerializer, Value), *args, **kwargs)


urlpatterns = patterns('',
    # 1. Sections list
    # GET: get list of sections (as list, as tree etc.) POST/PUT - create, copy
    #url(r'^sections/$', 'metadata.views.sections', name="sections"),
    url(r'^sections/$', 'metadata.urls.section_list', name="sections"),

    # 2. Section details
    # GET: get single section, PUT/POST: update (move), DELETE: archive section.
    # serve partial data requests (info, data etc.) with GET params
    #url(r'^sections/(?P<section_id>[\d]+)/?$', \
    #    'metadata.views.section_details', name="section_details"),
    url(r'^sections/(?P<id>[\d]+)/?$', \
        'metadata.urls.section', name="section_details"),

    # 3. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^sections/(?P<section_id>[\d]+)/properties/?$', \
        'metadata.urls.property_list', name="properties_for_section"),
    url(r'^properties/?$', \
        'metadata.urls.property_list', name="properties"),

    # 4. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both URLs do the same.
    url(r'^properties/(?P<id>[\d]+)/?$',\
        'metadata.urls.property', name="property_details"),

    # 5. Properties list (in the section, if provided)
    # GET: list the properties, PUT: create new property, POST: update 
    # properties as a list, DELETE: archive all properties
    url(r'^properties/(?P<property_id>[\d]+)/values/?$', \
        'metadata.urls.value_list', name="values_for_property"),
    url(r'^values/?$', \
        'metadata.urls.value_list', name="values"),

    # 6. Property details
    # GET: get property with all details, POST/PUT: update (move) property, 
    # DELETE: delete. Both URLs do the same.
    url(r'^values/(?P<id>[\d]+)/?$',\
        'metadata.urls.value', name="value_details"),
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
