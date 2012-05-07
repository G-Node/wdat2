from django.core.exceptions import ObjectDoesNotExist
from django.core.servers.basehttp import FileWrapper
from django.db import models

from rest.management import BaseHandler
from rest.common import Success

import settings

class NEOHandler(BaseHandler):
    """ add some specific filtering to the base Handler """

    def __init__(self, *args, **kwargs):
        super(NEOHandler, self).__init__(*args, **kwargs)
        self.list_filters['section'] = self.section_filter
        self.list_filters['property'] = self.property_filter
        self.list_filters['value'] = self.value_filter


    def section_filter(self, objects, ss, user=None):
        """ filters objects contained in a particular section """
        db_table = self.model._meta.db_table
        cls = self.model.__name__.lower()
        query = 'select model.* FROM ' + db_table + ' model\
            LEFT JOIN ' + db_table + '_metadata meta ON (model.id = meta.' + cls + '_id)\
            LEFT JOIN metadata_value v ON (meta.value_id = v.id)\
            LEFT JOIN metadata_property p ON (v.parent_property_id = p.id)\
            LEFT JOIN metadata_section s ON (p.section_id = s.id)\
            where s.name LIKE "%%' + ss + '%%"'
        filtered = [f.id for f in self.model.objects.raw(query)]
        return objects.filter(id__in=filtered)


    def property_filter(self, objects, ss, user=None):
        """ filters objects by related metadata property name """
        db_table = self.model._meta.db_table
        cls = self.model.__name__.lower()
        query = 'select model.* FROM ' + db_table + ' model\
            LEFT JOIN ' + db_table + '_metadata meta ON (model.id = meta.' + cls + '_id)\
            LEFT JOIN metadata_value v ON (meta.value_id = v.id)\
            LEFT JOIN metadata_property p ON (v.parent_property_id = p.id)\
            where p.name LIKE "%%' + ss + '%%"'
        filtered = [f.id for f in self.model.objects.raw(query)]
        return objects.filter(id__in=filtered)


    def value_filter(self, objects, ss, user=None):
        """ filters objects tagged with particular metadata values """
        db_table = self.model._meta.db_table
        cls = self.model.__name__.lower()
        query = 'select model.* FROM ' + db_table + ' model\
            LEFT JOIN ' + db_table + '_metadata meta ON (model.id = meta.' + cls + '_id)\
            LEFT JOIN metadata_value v ON (meta.value_id = v.id)\
            where v.data LIKE "%%' + ss + '%%"'
        filtered = [f.id for f in self.model.objects.raw(query)]
        return objects.filter(id__in=filtered)



class MetadataHandler(BaseHandler):
    """ responses containing full object's metadata as a list of property:value
    pairs; a sort of a shortcut to avoid requesting metadata for an object in 
    several requests.

    NEO objects only """

    def __init__(self, *args, **kwargs):
        super(MetadataHandler, self).__init__(*args, **kwargs)
        self.actions = { 'GET': self.get }

    def get(self, request, objects, code=200):
        """ returns object(s) data as binary file """
        assert hasattr(self.model, 'metadata'), "Object cannot have metadata"
        assert self.model.metadata.field.rel.to.__name__.lower() == 'value', "Object cannot have metadata"
        assert len(objects) < 2, "Requested metadata for more than one object"

        message_type = "no_metadata_found"
        resp_data = {}

        if objects:
            values = objects[0].metadata.select_related() # resolves properties in one SQL
            if values:
                pairs = []
                for v in values:
                    pairs.append([self.serializer.serialize([v.parent_property], \
                        options=self.options)[0], self.serializer.serialize([v], \
                            options=self.options)[0]])
                resp_data["metadata"] = pairs
                message_type = "metadata_found"

        return Success(resp_data, message_type, request)



#-------------------------------------------------------------------------------
# Here is an alternative of DataHandler, streaming files to a response in chunks
#-------------------------------------------------------------------------------

class DataHandler(BaseHandler):
    """ Handles binary Data responses for a single data-object, like 
    AnalogSignal, Spiketrain """

    class StreamWrapper(object):
        """Wrapper to iteratively request data arrays from the database, convert
        them to binary and return the whole as iterable"""

        def __init__(self, queryset, bulksize=8192, *args, **kwargs):
            self.queryset = queryset
            self.bulksize = bulksize
            self.args = args
            self.kwargs = kwargs

        def __getitem__(self, key):
            obj = self.queryset.__getitem__(key)

            if obj.obj_type == "irsaanalogsignal":
                signal, times, t_start = obj.get_slice(**self.kwargs)
                attrs = {"signal": signal, "times": times, "t_start": t_start}
            elif obj.obj_type == "analogsignal":
                signal, t_start = obj.get_slice(**self.kwargs)
                attrs = {"signal": signal, "t_start": t_start}
            elif obj.obj_type == "spiketrain":
                times, t_start = obj.get_slice(**self.kwargs)
                attrs = {"times": times, "t_start": t_start}
            elif obj.obj_type == "waveform":
                waveform, t_start = obj.get_slice(**self.kwargs)
                attrs = {"waveform": waveform, "t_start": t_start}

            # data = ????
            #data = self.filelike.read(self.blksize)
            if data:
                return data
            raise IndexError

        def __iter__(self):
            return self

        def next(self):
            #data = self.filelike.read(self.blksize)
            # data = ???
            if data:
                return data
            raise StopIteration

    def __init__(self, *args, **kwargs):
        super(DataHandler, self).__init__(*args, **kwargs)
        self.actions = { 'GET': self.get }

    def get(self, request, objects, code=200):
        """ returns object(s) data as binary file/datastream """

        assert self.model.__name__.lower() in [
            "analogsignal",
            "spiketrain",
            "irsaanalogsignal",
            "waveform"], "Object does not support binary data streaming."

        # when moved to Postgres, replace queryset evaluation here by 
        # requesting only slices, not whole signals
        if obj.obj_type == "irsaanalogsignal":
            signal, times, t_start = obj.get_slice(**self.kwargs)
            attrs = {"signal": signal, "times": times, "t_start": t_start}
        elif obj.obj_type == "analogsignal":
            signal, t_start = obj.get_slice(**self.kwargs)
            attrs = {"signal": signal, "t_start": t_start}
        elif obj.obj_type == "spiketrain":
            times, t_start = obj.get_slice(**self.kwargs)
            attrs = {"times": times, "t_start": t_start}
        elif obj.obj_type == "waveform":
            waveform, t_start = obj.get_slice(**self.kwargs)
            attrs = {"waveform": waveform, "t_start": t_start}

        data = objects.values_list('id', flat=True)

        if data: 

            filename = __file__ # Select your file here.                                
            wrapper = FileWrapper(file(filename))
            response = HttpResponse(wrapper, content_type='text/plain')
            response['Content-Length'] = os.path.getsize(filename)
            return response

            return Success(resp_data, message_type, request)


