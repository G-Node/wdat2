from django.core.exceptions import ObjectDoesNotExist
from django.core.servers.basehttp import FileWrapper
from django.db import models

from rest.management import BaseHandler
from rest.common import Success

from state_machine.models import VersionedM2M, ObjectState

import settings

# FIXME reqrite all filters below to include versioning

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

    def run_post_processing(self, *args, **kwargs):
        """ metadata tagging propagates down the hierarchy by default """
        objects = kwargs['objects']
        m2m_dict = kwargs['m2m_dict']
        if not objects: return None

        tags = {}
        if m2m_dict.has_key('metadata') and not (self.options.has_key('cascade') and \
                not self.options['cascade']):
            tags = {'metadata': m2m_dict['metadata']}
            obj_with_related = objects.model.objects.fetch_fks( objects = objects )
            rels = [(f.model, f.model().obj_type + "_set") for f in \
                objects.model._meta.get_all_related_objects() if not \
                issubclass(f.model, VersionedM2M) and issubclass(f.model, ObjectState)]

            # recursively update children
            for rel_model, rel_name in rels:
                # collect children plinks of type rel_name for all requested objects
                for_update = []
                for obj in obj_with_related:
                    for_update += getattr(obj, rel_name + "_buffer")

                # extract ids from permalinks
                processed = [] # ids of related objects which metadata should be updated
                for p in for_update:
                    if p.rfind('/') + 1 == len(p):
                        p = p[ : len(p)-1 ]
                    processed.append( p[ p.rfind('/') + 1 : ] )

                if processed: # update metadata for all children of type rel_name
                    children = rel_model.objects.filter( local_id__in = processed )
                    rel_model.save_changes(children, {}, tags, {}, self.m2m_append)
                    self.run_post_processing( objects=children, m2m_dict=m2m_dict )

                    """ the recursion could be done by calling the 
                    'create_and_update' function of the Handler (self), however
                    the current method is assumed to be a bit faster as it works
                    with objects directly. for any case, consider code below."""
                    #request = kwargs['request']
                    #request.body = json.dumps( tags )
                    #self.attr_filters = {'local_id__in': processed}
                    #self( request ) # executes the recursive update



class MetadataHandler(BaseHandler):
    """ responses containing full object's metadata as a list of property:value
    pairs; a sort of a shortcut to avoid requesting metadata for an object in 
    several requests.

    NEO objects only """

    def __init__(self, *args, **kwargs):
        super(MetadataHandler, self).__init__(*args, **kwargs)
        self.actions = { 'GET': self.get }
        self.mode = settings.RESPONSE_MODES[3] # full load

    def get(self, request, objects, code=200):
        """ returns metadata for an object as a dict of property - value pairs """

        assert hasattr(self.model, 'metadata'), "Object cannot have metadata"
        assert self.model.metadata.field.rel.to.__name__.lower() == 'value', "Object cannot have metadata"
        assert len(objects) < 2, "Requested metadata for more than one object"

        message_type = "no_metadata_found"
        resp_data = {}

        if objects and hasattr(objects[0], 'metadata_buffer_ids'):
            value_model = self.model.metadata.field.rel.to
            prop_model = value_model.parent_property.field.rel.to

            kwargs = {}
            # loading related values (m2m should be loaded by default)
            kwargs["local_id__in"] = objects[0].metadata_buffer_ids
            values = value_model.objects.filter( **kwargs )
            ser_values = self.serializer.serialize(values, options=self.options)

            # mmap is a list of pairs (<value_id>, <property_id>)
            mmap = value_model.objects.filter( **kwargs ).values_list('local_id',\
                'parent_property_id')

            # loading properties
            kwargs["local_id__in"] = [v.parent_property_id for v in values]
            props = prop_model.objects.filter( **kwargs )
            ser_props = self.serializer.serialize(props, options=self.options)

            pairs = []
            for i in mmap:
                v = [x for x in ser_values if x['fields']['local_id'] == i[0]][0]
                p = [x for x in ser_props if x['fields']['local_id'] == i[1]][0]
                pairs.append([ p , v ])
            resp_data["metadata"] = pairs
            message_type = "metadata_found"

        return Success(resp_data, message_type, request)



#-------------------------------------------------------------------------------
# Here is an alternative of DataHandler, streaming files to a response in chunks
# currently not used due to the descision to have files containing data arrays.

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


