from rest.management import ObjectHandler, CategoryHandler, ACLHandler, process_REST
from rest.serializers import Serializer

from metadata.serializers import *
from metadata.handlers import PropertyCategoryHandler, ValueCategoryHandler
from metadata.models import Section, Property, Value

def section(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(SectionSerializer, Section), *args, **kwargs)

def acl(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ACLHandler(SectionSerializer, Section), *args, **kwargs)

def section_list(request, *args, **kwargs):
    return process_REST(request, handler=CategoryHandler(SectionListSerializer, Section), *args, **kwargs)

def property(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(PropertySerializer, Property), *args, **kwargs)

def property_list(request, *args, **kwargs):
    return process_REST(request, handler=PropertyCategoryHandler(PropertySerializer, Property), *args, **kwargs)

def value(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ObjectHandler(ValueSerializer, Value), *args, **kwargs)

def value_list(request, *args, **kwargs):
    return process_REST(request, handler=ValueCategoryHandler(ValueSerializer, Value), *args, **kwargs)
