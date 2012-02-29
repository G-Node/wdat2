from django.core.serializers.python import Serializer as PythonSerializer
from django.utils.encoding import smart_unicode, is_protected_type
from django.db import models
import settings


class Serializer(PythonSerializer):
    """ 
    Serialises/Deserial. G-Node models into JSON objects for HTTP REST responses
    """

    """ configure whether to show reversed relations (their permalinks) in the 
    response by default """
    show_kids = True # on/off
    excluded_rel = () # some can be excluded
    special_for_serialization = () # list of field names
    special_for_deserialization = () # list of field names
    object_filters = ("full", "info", "data", "related")
    cascade = False
    encoding = settings.DEFAULT_CHARSET

    def serialize(self, queryset, options={}):
        """
        Serialize a queryset. options => dict(request.GET)
        """
        #self.init_options = dict(options) # keep options for recursive
        self.cascade = options.has_key("cascade")
        self.q = options.get("q", ["full"])[0] # request feature, values in []
        self.host = options.get("permalink_host", "")
        self.selected_fields = options.get("fields", None)
        self.use_natural_keys = options.get("use_natural_keys", False)
        self.start_serialization()
        for obj in queryset:
            self.start_object(obj)
            for field in obj._meta.local_fields:
                if field.serialize:
                    if field.rel is None:
                        if self.selected_fields is None or field.attname in self.selected_fields:
                            if field.attname in self.special_for_serialization \
                                and self.serialize_attrs:
                                self.serialize_special(obj, field)
                            elif self.is_data_field_django(obj, field) and self.serialize_data:
                                self.handle_data_field(obj, field)
                            elif field.attname.find("__unit") > 0:
                                pass # ignore unit fields as they are processed above
                            elif self.serialize_attrs: # FIXME resolve choices
                                self.handle_field(obj, field)
                    else:
                        if self.selected_fields is None or field.attname[:-3] in self.selected_fields:
                            self.handle_fk_field(obj, field)
            for field in obj._meta.many_to_many:
                if field.serialize:
                    if self.selected_fields is None or field.attname in self.selected_fields:
                        self.handle_m2m_field(obj, field)
            # process specially reverse relations, like properties for section
            for rel_name in filter(lambda l: (l.find("_set") == len(l) - 4), dir(obj)):
                if self.cascade: # cascade related object load
                    self._current[rel_name] = self.__class__().serialize(getattr(obj, \
                        rel_name).all(), options=options) # FIXME does not work recursively
                elif self.show_kids and self.serialize_rel and rel_name[:-4] not in self.excluded_rel:
                    """ this is used to include some short-relatives into the 
                    serialized object, e.g. permalinks of Properties and Values 
                    into the Section """
                    children = []
                    for child in getattr(obj, rel_name).all():
                        if hasattr(child, 'get_absolute_url'):
                            children.append(''.join([self.host, child.get_absolute_url()]))
                        else:
                            children.append(smart_unicode(child._get_pk_val()) + \
                                ": " + smart_unicode(child._meta))
                    self._current[rel_name] = children
            self.end_object(obj)
        self.end_serialization()
        return self.getvalue()

    def deserialize(self, rdata, obj, user, encoding=None):
        """ parse incoming JSON into a given object (obj) skeleton """
        if not encoding: encoding = self.encoding
        # processing attributes
        for field_name, field_value in rdata.iteritems():
            if isinstance(field_value, str):
                field_value = smart_unicode(field_value, encoding, strings_only=True)

            # Handle special fields
            if field_name in self.special_for_deserialization:
                self.deserialize_special(obj, field_name, field_value)
            else:
                field = obj._meta.get_field(field_name)

                # Handle M2M relations TODO

                # Handle FK fields (taken from django.core.Deserializer)
                if field.rel and isinstance(field.rel, models.ManyToOneRel) and field.editable:
                    if field_value is not None:
                        related = field.rel.to.objects.get(id=field_value)
                        if not related.is_editable(user): # security check
                            raise ReferenceError("Name: %s; Value: %s" % (field_name, field_value)) 
                        if hasattr(field.rel.to._default_manager, 'get_by_natural_key'):
                            if hasattr(field_value, '__iter__'):
                                relativ = field.rel.to._default_manager.db_manager(db).get_by_natural_key(*field_value)
                                value = getattr(relativ, field.rel.field_name)
                                # If this is a natural foreign key to an object that
                                # has a FK/O2O as the foreign key, use the FK value
                                if field.rel.to._meta.pk.rel:
                                    value = value.pk
                            else:
                                value = field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value)
                            setattr(obj, field.attname, value)
                        else:
                            setattr(obj, field.attname, \
                                field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value))
                    else:
                        setattr(obj, field.attname, None)

                # Handle data/units fields
                elif self.is_data_field_json(field_name, field_value):
                    setattr(obj, field_name, field_value["data"])
                    setattr(obj, field_name + "__unit", field_value["unit"])
                elif field.editable:
                    setattr(obj, field_name, field.to_python(field_value))
        obj.full_clean()
        obj.save()

    def end_object(self, obj):
        serialized = {
            "model"     : smart_unicode(obj._meta),
            "fields"    : self._current
        }
        if hasattr(obj, 'get_absolute_url'):
            serialized["permalink"] = ''.join([self.host, obj.get_absolute_url()])
        else:
            serialized["pk"] = smart_unicode(obj._get_pk_val(), strings_only=True)
        self.objects.append(serialized)
        self._current = None

    @property
    def serialize_data(self):
        if self.q == 'full' or self.q == 'data':
            return True
        return False

    @property
    def serialize_attrs(self):
        if self.q == 'full' or self.q == 'info':
            return True
        return False

    @property
    def serialize_rel(self):
        if self.q == 'full' or self.q == 'related':
            return True
        return False

    def is_data_field_json(self, attr_name, value):
        """ determines if a given field has units and requires special proc."""
        if type(value) == type({}) and value.has_key("data") and \
            value.has_key("unit"):
            return True
        return False

    def is_data_field_django(self, obj, field):
        """ if a field has units, stored in another field - it's a data field """
        if (field.attname + "__unit") in [f.attname for f in obj._meta.local_fields]:
            return True
        return False


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


    def serialize_special(self, obj, field):
        """ abstract method for special fields """
        raise NotImplementedError

    def deserialize_special(self, obj, field_name, field_value):
        """ abstract method for special fields """
        raise NotImplementedError


