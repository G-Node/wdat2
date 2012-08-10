from django.core.serializers.python import Serializer as PythonSerializer
from django.utils.encoding import smart_unicode, is_protected_type
from django.db import models
from django.db import connection, transaction
from state_machine.models import VersionedM2M, ObjectState

import settings
import urlparse
import itertools
import re

class Serializer(PythonSerializer):
    """ 
    Serialises/Deserial. G-Node models into JSON objects for HTTP REST responses
    """

    """ configure whether to show FK-relations in the response """
    show_kids = True # on/off - show permalinks of kids by default when cascade=False
    excluded_permalink = () # kid's permalinks are not shown even if show_kids=True
    excluded_cascade = () # do not process these kids when cascade=False
    do_not_show_if_empty = () # empty (no permalink) kids are not shown
    special_for_serialization = () # list of field names
    special_for_deserialization = () # list of field names
    cascade = False
    encoding = settings.DEFAULT_CHARSET
    use_natural_keys = 0 # default is to show permalink for FKs
    q = 'full'
    host = ""

    @property
    def serialize_attrs(self):
        return self.q == 'full' or self.q == 'info' or self.q == 'beard'

    @property
    def serialize_rel(self):
        return self.q == 'full' or self.q == 'beard'

    def serialize(self, queryset, options={}):
        """
        Serialize a queryset. options => dict(request.GET)
        """
        def parse_options(self, options):
            self.options = options
            self.cascade = options.has_key("cascade")
            """ q - amount of information about an object to return:
            - 'link' - just permalink
            - 'info' - object with local attributes
            - 'beard' - object with local attributes AND foreign keys resolved
            - 'full' - everything mentioned above """
            self.q = options.get("q", "full")
            self.host = options.get("permalink_host", self.host)
            self.selected_fields = options.get("fields", None)
            self.show_kids = options.get("show_kids", self.show_kids)
            """ use natural keys defines the level of FKs serialization:
            - 1: natural key / id for non-versioned
            - 2: local_id or just id for non-versioned objects
            - other: permalink or just id for objects without permalink """
            self.use_natural_keys = options.get("fk_mode", self.use_natural_keys)

        if not len(queryset) > 0:
            return None

        parse_options(self, options)
        self.start_serialization()

        # calulate the size of the response, if data is requested

        # if objects have data, start to retrieve it first
        #exobj = queryset[0] # example object
        #if exobj.has_data:
            #data_ids = queryset.values_list('data_key', flat=True)
            # problem: how to retreive a slice with diff time window? hm..
            #ids[obj_id] = exobj.obj_type

        for obj in queryset: # homogenious objects
            self.start_object(obj)

            for field in obj._meta.local_fields: # local fields / FK fields
                if field.serialize:
                    if field.name in self.special_for_serialization:
                        self.serialize_special(obj, field)
                    else:
                        if field.rel is None:
                            if self.selected_fields is None or field.attname in\
                                self.selected_fields:

                                if self.is_data_field_django(obj, field):
                                    if self.serialize_attrs:
                                        self.handle_data_field(obj, field)

                                elif field.attname.find("__unit") > 0:
                                    pass # ignore unit fields as already processed

                                elif self.serialize_attrs: # FIXME resolve choices
                                    self.handle_field(obj, field)

                        elif self.selected_fields is None or field.attname[:-3]\
                            in self.selected_fields:
                            self.handle_fk_field(obj, field)

            if self.serialize_rel: # normal m2m fields
                for field in obj._meta.many_to_many:
                    if field.serialize:
                        if self.selected_fields is None or field.attname in \
                            self.selected_fields:
                            self.handle_m2m_field(obj, field)

                # versioned m2m fields
                #if hasattr( obj._meta, "versioned_m2m_mgrs" ):
                #    for mgr in obj._meta.versioned_m2m_mgrs:
                #        if self.selected_fields is None or mgr.local_field in \
                #            self.selected_fields:
                #            self.handle_versioned_m2m_field(mgr)

            # process specially reverse relations, like properties for section
            for rel_name in [f.model().obj_type + "_set" for f in obj._meta.get_all_related_objects() \
                if not issubclass(f.model, VersionedM2M) and issubclass(f.model, ObjectState)]:

            #for rel_name in filter(lambda l: (l.find("_set") == len(l) - 4), dir(obj)):

                # cascade is switched off
                """
                if self.cascade and rel_name[:-4] not in self.excluded_cascade: # cascade related object load
                    kid_model = getattr(obj, rel_name).model # below is an alternative
                    #kid_model = filter(lambda x: x.get_accessor_name() == rel_name,\
                    #    obj._meta.get_all_related_objects())[0].model # FIXME add many to many?
                    if hasattr(kid_model, 'default_serializer'):
                        serializer = kid_model().default_serializer
                    else: serializer = self.__class__
                    self._current[rel_name] = serializer().serialize(getattr(obj, \
                        rel_name).filter(current_state=10), options=options)
                """
                if self.show_kids and self.serialize_rel and rel_name[:-4] not\
                    in self.excluded_permalink:
                    """ this is used to include some short-relatives into the 
                    serialized object, e.g. permalinks of Properties and Values 
                    into the Section """
                    children = []
                    for child in getattr(obj, rel_name + "_data"):
                        if hasattr(child, 'get_absolute_url'):
                            children.append(''.join([self.host, child.get_absolute_url()]))
                        elif type(child) == type( long(0) ):
                            children.append(''.join([self.host, "here_goes_the_class_base/", str(child) ]))
                        else:
                            children.append( smart_unicode( child.local_id ) + \
                                ": " + smart_unicode(child._meta) )
                    if not (not children and rel_name[:-4] in self.do_not_show_if_empty):
                        self._current[rel_name] = children

            self.end_object(obj)
        self.end_serialization()

        return self.getvalue()

    def deserialize(self, rdata, model, user, encoding=None, m2m_append=True):
        """ parse incoming JSON into a given dicts of attributes and m2m's """
        if not encoding: encoding = self.encoding
        update_kwargs = {} # dict to collect parsed values for update
        fk_dict = {} # dict to collect parsed FK values
        m2m_dict = {} # temporary m2m values to assign them after full_clean
        versioned_m2m_names = getattr( model()._meta, "m2m_dict", {} ).keys()

        # parsing attributes
        for field_name, field_value in rdata.iteritems():
            if isinstance(field_value, str):
                field_value = smart_unicode(field_value, encoding, strings_only=True)

            # Handle special model fields
            if field_name in self.special_for_deserialization:
                update_kwargs = self.deserialize_special(update_kwargs, \
                    field_name, field_value, user)
            else:
                # Handle data/units fields
                if self.is_data_field_json(field_name, field_value):
                    update_kwargs[field_name] = field_value["data"]
                    update_kwargs[field_name + "__unit"] = field_value["units"]

                else:
                    field = model._meta.get_field(field_name)

                    # Handle versioned M2M relations
                    #if field_name in versioned_m2m_names:
                    #    m2m_data = []
                    #    mgr = getattr( model(), field_name )
                    #    for m2m in field_value: # we support both ID and permalinks
                    #        m2m_data.append( self._resolve_ref(mgr.rel_model, m2m, user) )
                    #        m2m_dict[ field_name ] = [int(x.local_id) for x in m2m_data]

                    # Handle M2M relations
                    if field.rel and isinstance(field.rel, models.ManyToManyRel) and field.editable:
                        m2m_data = []

                        for m2m in field_value: # we support both ID and permalinks
                            m2m_data.append( self._resolve_ref(field.rel.to, m2m, user) )
                        if 'local_id' in field.rel.to._meta.get_all_field_names():
                            m2m_dict[field.name] = [int(x.local_id) for x in m2m_data]
                        else:
                            m2m_dict[field.name] = [int(x.id) for x in m2m_data]

                    # Handle FK fields (taken from django.core.Deserializer)
                    elif field.rel and isinstance(field.rel, models.ManyToOneRel) and field.editable:
                        if field_value is not None:
                            related = self._resolve_ref(field.rel.to, field_value, user)
                            fk_dict[field.name] = related # establish rel
                        else:
                            fk_dict[field.name] = None # remove relation

                    # handle standard fields
                    elif field.editable and not field.attname == 'id': 
                        #TODO raise error when trying to change id or date_created etc?
                        update_kwargs[field_name] = field.to_python(field_value)

        return update_kwargs, m2m_dict, fk_dict

#-------------------------------------------------------------------------------
# Field handlers

    def handle_fk_field(self, obj, field):
        related = getattr(obj, field.name)
        if related:

            """ use natural keys defines the level of FKs serialization:
            - 1: natural key / id for non-versioned
            - 2: permalink or just id for objects without permalink
            - other: local_id or just id for non-versioned objects """

            if self.use_natural_keys == 1 and hasattr(related, 'natural_key'):
                related = related.natural_key()

            elif self.use_natural_keys not in [1, 2] and hasattr(related, 'get_absolute_url'):
                related = self.resolve_permalink( related )

            else:
                if field.rel.field_name == related._meta.pk.name:
                    # Related to remote object via primary key

                    # if object is versioned, return local_id
                    if hasattr(related, 'local_id'):
                        related = related.local_id

                    else: # else just an id
                        related = related._get_pk_val()
                else:
                    # Related to remote object via other field
                    related = smart_unicode(getattr(related, field.rel.field_name), \
                        strings_only=True)
        self._current[field.name] = related


    def handle_data_field(self, obj, field):
        """ serialize data field """
        data = field._get_val_from_obj(obj)
        if not is_protected_type(data): data = field.value_to_string(obj)
        units = smart_unicode(getattr(obj, field.attname + "__unit"), \
            self.encoding, strings_only=True)
        self._current[field.attname] = {
            "data": data,
            "units": units
        }

    def handle_m2m_field(self, obj, field):
        #if field.rel.through._meta.auto_created:
        #    self._current[field.name] = [self.resolve_permalink(related)
        #                       for related in getattr(obj, field.name).iterator()]
        # prefetched m2m data
        self._current[field.name] = [ self.resolve_permalink(related) 
            for related in getattr(obj, field.name + '_buffer') ]


    def handle_versioned_m2m_field(self, mgr):
        self._current[ mgr.local_field ] = [ self.resolve_permalink(related) \
            for related in getattr(obj, mgr.local_field).iterator() ]

    def is_data_field_json(self, attr_name, value):
        """ determines if a given field has units and requires special proc."""
        if type(value) == type({}) and value.has_key("data") and \
            value.has_key("units"):
            return True
        return False

    def is_data_field_django(self, obj, field):
        """ if a field has units, stored in another field - it's a data field """
        if (field.attname + "__unit") in [f.attname for f in obj._meta.local_fields]:
            return True
        return False

    def serialize_special(self, obj, field):
        """ abstract method for special fields """
        raise NotImplementedError

    def deserialize_special(self, update_kwargs, field_name, field_value, user):
        """ abstract method for special fields """
        raise NotImplementedError

#-------------------------------------------------------------------------------
# supporting functions

    @classmethod
    def is_permalink(self, link):
        """ add more validation here? everything is a valid url.."""
        return str(link).find("http://") > -1 

    def _resolve_ref(self, model, ref, user):
        """ resolves a reference - can be permalink, ID of the object or a hash.
        validates permissions. returns back resolved object or error """
        if self.is_permalink( ref ):
            obj = self.get_by_permalink( model, ref )
        else:
            try: # ID is provided as local_id / id, int
                ref = int(ref)
                if 'local_id' in model._meta.get_all_field_names():
                    obj = model.objects.get( local_id=ref )
                else:
                    obj = model.objects.get( id=ref )
            except (ValueError, TypeError):
                if len( ref ) == 40: # hash is provided
                    obj = model.objects.get_by_guid( guid=ref )
                else:
                    raise ReferenceError( "A reference to a data source is not \
                        valid. It must be a permalink, ID or the hash of a valid \
                        object." )

        if not obj.is_editable(user):
            raise ReferenceError("Name: %s; Value: %s" % (model.__name__, ref))
        return obj

    def resolve_permalink(self, obj, add_str = None):
        if hasattr(obj, 'get_absolute_url'):
            pl = ''.join([self.host, obj.get_absolute_url()])
            # this helps to add something to the end of the URL when needed
            if add_str: # urlparse is crap :( just add
                pl += add_str
            return pl
        return smart_unicode(obj._get_pk_val(), strings_only=True)

    def get_by_permalink(self, model, plink):
        path = urlparse.urlparse(plink).path
        id = re.search("(?P<id>[\d]+)", path).group()

        if hasattr(model(), 'local_id'): # versioned model
            return model.objects.get( local_id=id )
        return model.objects.get( id=id )

    def end_object(self, obj):
        serialized = {
            "model"     : smart_unicode(obj._meta),
            "fields"    : self._current,
            "permalink" : self.resolve_permalink(obj)
        }
        self.objects.append(serialized)
        self._current = None




