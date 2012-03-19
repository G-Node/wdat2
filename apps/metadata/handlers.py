from rest.management import BaseHandler

# filters

#def name_contains_filter(objects, value, user=None):
#    """ returns values for a particular property """
#    return filter(lambda s: value.lower() in s.name.lower(), objects)

#def value_contains_filter(objects, value, user=None):
#    """ returns values for a particular property """
#    return filter(lambda s: value.lower() in s.data.lower(), objects)

def parent_section_filter(objects, value, user=None):
    try:
        objects.
    """ returns objects in a particular section """
    return objects.filter(section=section)

    return filter(lambda s: s.section.id == value, objects) 

def parent_property_filter(objects, value, user=None):
    """ returns values for a particular property """
    return filter(lambda s: s.property.id == value, objects)


# handlers basically add some specific filtering

class SectionCategoryHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(SectionCategoryHandler, self).__init__(*args, **kwargs)
        #self.list_filters['name'] = name_contains_filter

class PropertyCategoryHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(PropertyCategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['section_id'] = parent_section_filter
        #self.list_filters['name'] = name_contains_filter

class ValueCategoryHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(ValueCategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['property_id'] = parent_property_filter
        #self.list_filters['value'] = value_contains_filter

