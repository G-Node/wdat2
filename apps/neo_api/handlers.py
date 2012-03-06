from rest.management import BaseHandler
from metadata.models import Property
from neo_api.models import get_type_by_class


class NEOHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(NEOHandler, self).__init__(*args, **kwargs)
        self.list_filters['property'] = self.property_filter
        self.list_filters['value'] = self.value_filter

    def property_filter(self, objects, ss, user=None):
        """ filters objects by related metadata properties """
        db_table = self.model._meta.db_table
        cls = get_type_by_class(self.model)
        query = 'select model.* FROM ' + db_table + ' model\
            LEFT JOIN ' + db_table + '_metadata meta ON (model.id = meta.' + cls + '_id)\
            LEFT JOIN metadata_value v ON (meta.value_id = v.id)\
            LEFT JOIN metadata_property p ON (v.parent_property_id = p.id)\
            where p.name LIKE "%%' + ss + '%%"'
        return filter(lambda obj: obj in self.model.objects.raw(query), objects)

    def value_filter(self, objects, ss, user=None):
        """ filters objects by related metadata properties """
        db_table = self.model._meta.db_table
        cls = get_type_by_class(self.model)
        query = 'select model.* FROM ' + db_table + ' model\
            LEFT JOIN ' + db_table + '_metadata meta ON (model.id = meta.' + cls + '_id)\
            LEFT JOIN metadata_value v ON (meta.value_id = v.id)\
            where v.data LIKE "%%' + ss + '%%"'
        return filter(lambda obj: obj in self.model.objects.raw(query), objects)

