from django.core.serializers.python import Serializer as PythonSerializer
from django.utils.encoding import smart_unicode


class Serializer(PythonSerializer):
    """ 
    Serialises/Deserial. G-Node models into JSON objects for HTTP REST responses
    """
    object_filters = ("full", "info", "data", "related")
    cascade = False

    def serialize(self, queryset, options=None):
        """
        Serialize a queryset.
        """
        self.options = options # dict(request.GET) from the response
        self.cascade = options.has_key("cascade")
        self.q = options.pop("q", "full")
        self.host = options.pop("permalink_host", "")
        self.selected_fields = options.pop("fields", None)
        self.use_natural_keys = options.pop("use_natural_keys", False)
        self.start_serialization()
        for obj in queryset:
            self.start_object(obj)
            for field in obj._meta.local_fields:
                if field.serialize:
                    if field.rel is None:
                        if self.selected_fields is None or field.attname in self.selected_fields:
                            if hasattr(obj, "is_special_field") and obj.is_special_field(field.attname) \
                                and self.serialize_attrs:
                                self.serialize_special(obj, field)
                            elif self.is_data_field(obj, field) and self.serialize_data:
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
            import pdb
            pdb.set_trace()
            # for field FIXME !!!!!
            if (self.serialize_rel and hasattr(obj, "non_cascade_rel") and \
                field.attname in obj.non_cascade_rel) or self.cascade:
                """ this is used to include some short-relatives into the 
                serialized object, e.g. Properties and Values into the Section, 
                or all relatives ('cascade' mode) """
                self._current[field_name] = self.serialize(getattr(obj, \
                    field_name + "_set").all())
            self.end_object(obj)
        self.end_serialization()
        return self.getvalue()

    def end_object(self, obj):
        self.objects.append({
            "model"     : smart_unicode(obj._meta),
            #"pk"       : smart_unicode(obj._get_pk_val(), strings_only=True),
            "permalink" : ''.join([self.host, obj.get_absolute_url()]),
            "fields"    : self._current
        })
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

    def is_data_field(self, obj, field):
        """ if a field has units, stored in another field - it's a data field """
        if (field.attname + "__unit") in [f.attname for f in obj._meta.local_fields]:
            return True
        return False

    def handle_data_field(self, obj, field):
        """ serialize data field """
        raise NotImplementedError

    def serialize_special(self, obj, field):
        """ abstract method for special fields """
        raise NotImplementedError

