from django.core.serializers.python import Serializer as PythonSerializer
from django.utils.encoding import smart_unicode, is_protected_type
from django.db import models
from django.db import connection, transaction
from state_machine.models import VersionedM2M, ObjectState, _get_url_base

from datetime import datetime

import settings
import urlparse
import itertools
import re
import numpy as np

class Serializer(PythonSerializer):
    """ 
    Serialises/Deserial. G-Node models into JSON objects for HTTP REST responses
    """

    RESPONSE_MODES = ['link', 'info', 'beard', 'full']

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
    q = settings.DEFAULT_RESPONSE_MODE
    host = ""

    @property
    def serialize_attrs(self):
        return self.q == 'full' or self.q == 'info' or self.q == 'beard'

    @property
    def serialize_rel(self):
        return (self.q == 'full' or self.q == 'beard') and self.show_kids

    def serialize(self, objects, options={}):
        """
        Serialize a set of heterogenious objects. options => dict(request.GET)
        """
        def parse_options(self, options):
            self.options = options
            self.cascade = options.has_key("cascade")
            """ q - amount of information about an object to return:
            - 'link' - just permalink
            - 'info' - object with local attributes
            - 'beard' - object with local attributes AND foreign keys resolved
            - 'full' - everything mentioned above """
            self.q = options.get("q", self.q)
            self.host = options.get("permalink_host", self.host)
            self.selected_fields = options.get("fields", None)
            self.show_kids = options.get("show_kids", self.show_kids)
            """ use natural keys defines the level of FKs serialization:
            - 1: natural key / id for non-versioned
            - 2: local_id or just id for non-versioned objects
            - other: permalink or just id for objects without permalink """
            self.use_natural_keys = options.get("fk_mode", self.use_natural_keys)

        if not len(objects) > 0:
            return None

        parse_options(self, options)

        self.start_serialization()

        for obj in objects: # better if homogenious objects...
            model = obj.__class__

            # list of names of reverse relations
            rev_rel_list = [f.field.rel.related_name or f.model().obj_type + "_set" \
                for f in model._meta.get_all_related_objects() if not \
                    issubclass(f.model, VersionedM2M) and \
                        issubclass(f.model, ObjectState)]

            self.start_object(obj)

            for field in obj._meta.local_fields: # local fields / FK fields
                if field.serialize and (self.selected_fields is None or 
                    field.name in self.selected_fields) and self.serialize_attrs:

                    if field.verbose_name in self.special_for_serialization:
                        # IMPORTANT verbose_name is checked for special fields
                        self.serialize_special(obj, field)
                    else:

                        if self.is_data_field_django(field):
                            if field.rel is None:
                                data = field._get_val_from_obj(obj)
                                if not is_protected_type(data): data = field.value_to_string(obj)
                            else:
                                data = self.handle_fk_field(obj, field)
                            units = smart_unicode(getattr(obj, field.name + "__unit"), \
                                self.encoding, strings_only=True)
                            self._current[field.name] = {
                                "data": data,
                                "units": units
                            }
                        else:
                            if field.name.find("__unit") > 0:
                                pass # ignore unit fields as already processed
                            elif field.rel:
                                self._current[field.name] = self.handle_fk_field(obj, field)
                            else: # TODO resolve choices
                                self.handle_field(obj, field)

            if self.serialize_rel: 

                # m2m fields
                for field in obj._meta.many_to_many:
                    if field.serialize and (self.selected_fields is None or 
                        field.name in self.selected_fields):
                        if hasattr(obj, field.name + "_buffer"):
                            # this relation is versioned and was pre-loaded
                            children = []
                            for child in getattr(obj, field.name + "_buffer", []):
                                if hasattr(child, 'get_absolute_url'):
                                    children.append(''.join([self.host, child.get_absolute_url()]))
                                else:
                                    children.append(''.join([ self.host, child ]))
                            self._current[field.name] = children
                        else: # non-versioned m2m field FIXME ???
                            self.handle_m2m_field(obj, field)

                # process reverse relations (like properties for section)
                for rel_name in rev_rel_list:

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

                    if rel_name[:-4] not in self.excluded_permalink:
                        children = []
                        for child in getattr(obj, rel_name + "_buffer", []):
                            if hasattr(child, 'get_absolute_url'):
                                children.append(''.join([self.host, child.get_absolute_url()]))
                            else:
                                children.append(''.join([self.host, child ]))
                        if not (not children and rel_name[:-4] in self.do_not_show_if_empty):
                            self._current[rel_name] = children

            # extend with object permissions
            if hasattr(obj, '_shared_with'):
                self._current['shared_with'] = getattr(obj, '_shared_with')

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

            # handle special model fields
            if field_name in self.special_for_deserialization:
                field_value = self.deserialize_special(field_name, field_value, user)

            field = model._meta.get_field(field_name)

            # prepare to handle data/units fields
            if self.is_data_field_django(field):
                update_kwargs[field_name + "__unit"] = field_value["units"]
                field_value = field_value["data"]

            # Handle M2M relations
            if field.rel and isinstance(field.rel, models.ManyToManyRel) and field.editable:
                m2m_data = []

                for m2m in field_value: # we support both ID and permalinks
                    m2m_data.append( self._resolve_ref(field.rel.to, m2m, user) )
                m2m_dict[field.name] = [int( x.pk ) for x in m2m_data]

            # Handle FK fields (taken from django.core.Deserializer)
            elif field.rel and isinstance(field.rel, models.ManyToOneRel) and field.editable:
                if field_value is not None:
                    related = self._resolve_ref(field.rel.to, field_value, user)
                    fk_dict[field.name] = related # establish rel
                else:
                    fk_dict[field.name] = None # remove relation

            # handle standard fields
            elif field.editable and not field.name == 'id': 
                #TODO raise error when trying to change id or date_created etc?
                update_kwargs[field_name] = field.to_python(field_value)

        return update_kwargs, m2m_dict, fk_dict

#-------------------------------------------------------------------------------
# Field handlers

    def handle_field(self, obj, field):
        super(Serializer, self).handle_field(obj, field)
        if isinstance(field, models.DateTimeField) and self._current[field.name]:
            self._current[field.name] = self._current[field.name].strftime("%Y-%m-%d %H:%M:%S")

    def handle_fk_field(self, obj, field):
        rid = getattr(obj, field.name + "_id")
        if rid: # build a permalink without fetching an object
            url_base = ''.join([ self.host, _get_url_base( field.rel.to ) ])
            return urlparse.urljoin( url_base, str( rid ) )
        return None

    def handle_m2m_field(self, obj, field):
        # prefetched m2m data in _buffer
        self._current[field.name] = [ self.resolve_permalink(related) 
            for related in getattr(obj, field.name + '_buffer', []) ]

    def is_data_field_django(self, field):
        """ if a field has units, stored in another field - it's a data field """
        if (field.name + "__unit") in [f.name for f in field.model._meta.local_fields]:
            return True
        return False

    def serialize_special(self, obj, field):
        """ abstract method for special fields """
        raise NotImplementedError

    def deserialize_special(self, kwargs_dict, field_name, field_value, user):
        """ abstract method for special fields processing. kwargs_dict is a dict
        which has a structure like: {
            'update_kwargs': <update_kwargs_dict>
            'fk_dict': <fk_dict>
            'm2m_dict': <m2m_dict>
        } 
        should return update_kwargs, fk_dict, m2m_dict 
        """
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




