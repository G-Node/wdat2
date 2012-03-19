from rest.management import BaseHandler
from django.core.exceptions import ObjectDoesNotExist

# handlers basically add some specific filtering

class PropertyCategoryHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(PropertyCategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['section_id'] = parent_section_filter

    def parent_section_filter(objects, value, user=None):
        """ returns objects in a particular section by ID """
        section = self.model.section.field.rel.to.objects.get(id=value)
        return objects.filter(section=section)


class ValueCategoryHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(ValueCategoryHandler, self).__init__(*args, **kwargs)
        self.list_filters['property_id'] = parent_property_filter

    def parent_property_filter(objects, value, user=None):
        """ returns values for a particular property """
        p = self.model.parent_property.field.rel.to.objects.get(id=value)
        return objects.filter(parent_property=p)
