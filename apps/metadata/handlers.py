from rest.management import CategoryHandler

def parent_section_filter(objects, value, user=None):
    """ returns objects in a particular section """
    return filter(lambda s: s.section.id == value, objects) 

class PropertyCategoryHandler(CategoryHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(CategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['section_id'] = parent_section_filter


def parent_property_filter(objects, value, user=None):
    """ returns values for a particular property """
    return filter(lambda s: s.property.id == value, objects) 

class ValueCategoryHandler(CategoryHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(CategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['property_id'] = parent_property_filter


