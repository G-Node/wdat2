from django.utils.encoding import smart_unicode
from rest.serializers import Serializer
from django.core.exceptions import ValidationError
from datafiles.models import Datafile


class NEOSerializer(Serializer):
    """ specal Serializer for NEO objects """

    """ here are the fields that require special REST processing. If set-up, you
    HAVE TO define methods for serialization (serialize_special) and 
    deserialization (deserialize_special) which will be used by REST manager for
    processing GET/POST/PUT requests. """
    special_for_deserialization = ('times', 'signal', 'waveform')
    special_for_serialization = ('times', 'signal', 't_start', 'waveform')

    def serialize_special(self, obj, field):
        """ array- fields require special serialization due to the slicing """

        if self.serialize_attrs and field.attname == 't_start':
            # all have t_start attribute, use that as a trigger

                if obj.obj_type == "irsaanalogsignal":
                    signal, times, t_start = obj.get_slice(**self.options)
                    attrs = {"signal": signal, "times": times, "t_start": t_start}

                elif obj.obj_type == "analogsignal":
                    signal, t_start, new_rate = obj.get_slice(**self.options)
                    attrs = {"signal": signal, "t_start": t_start, \
                        "sampling_rate": new_rate}

                elif obj.obj_type == "spiketrain":
                    times, t_start = obj.get_slice(**self.options)
                    attrs = {"times": times, "t_start": t_start}

                elif obj.obj_type == "waveform":
                    waveform, t_start = obj.get_slice(**self.options)
                    attrs = {"waveform": waveform, "t_start": t_start}

                for key, attr in attrs.items():
                    units = smart_unicode(getattr(obj, key + "__unit"), \
                        self.encoding, strings_only=True)
                    self._current[key] = {
                        'data': attr,
                        'units': units
                    }

    def deserialize_special(self, update_kwargs, field_name, field_value, user):
        """ this validates that the reference points to an accessible datasource
            - should be a datafile
            - should be HDF5
            - should have an array of type float64 at '/'
            - should be editable by the user

        All the fields should have 'data' and 'units' inside.
        """
        datafile = self._resolve_ref(Datafile, field_value, user)
        if datafile.has_array():
            update_kwargs[field_name] = datafile.id
            update_kwargs[field_name + "__unit"] = field_value["units"]
            return update_kwargs
        else:
            raise ReferenceError( "Data source is not readable; please provide\
                correct reference. Current value: %s" % (field_value) )



class NEOCategorySerializer(NEOSerializer):
    """ do not show reverse relations when list is requested. do not perform
    bulk update for data-array fields (makes no sense anyway) """
    show_kids = False
    #excluded_bulk_update = ('times', 'signal', 'waveform') # FIXME not used


