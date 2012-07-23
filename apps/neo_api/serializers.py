from django.utils.encoding import smart_unicode
from rest.serializers import Serializer
from django.core.exceptions import ValidationError
from datafiles.models import Datafile
import urlparse


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
        def param_clean(s_index = None, e_index = None, downsample = None):
            params = '' # construct the params for the link to the data slice
            if s_index and not s_index == 0:
                params += "start_index=%s&" % s_index
            if e_index and e_index <= 10**9:
                params += "end_index=%s&" % e_index
            if downsample:
                params += "downsample=%s&" % downsample
            return params

        if self.serialize_attrs and field.attname == 't_start' or \
            obj.obj_type == "waveform":
            # almoal all have t_start attribute, use that as a trigger

            if obj.obj_type == "irsaanalogsignal":
                signal, times, s_index, e_index, downsample, t_start = \
                    obj.get_slice(**self.options)
                signallink = self.resolve_permalink( signal, add_str='/data' )
                timeslink = self.resolve_permalink( times, add_str='/data' )

                params = param_clean(s_index, e_index, downsample)
                if params:
                    signallink = urlparse.urljoin( signallink, "?" + params )
                    timeslink = urlparse.urljoin( timeslink, "?" + params )

                attrs = {"signal": signallink, "times": timeslink, \
                    "t_start": t_start}

            elif obj.obj_type == "analogsignal":
                signal, s_index, e_index, downsample, t_start, new_rate = \
                    obj.get_slice(**self.options)
                datalink = self.resolve_permalink( signal, add_str='/data' )

                params = param_clean(s_index, e_index, downsample)
                if params:
                    datalink = urlparse.urljoin( datalink, "?" + params )

                attrs = {"signal": datalink, "t_start": t_start, \
                    "sampling_rate": new_rate}

            elif obj.obj_type == "spiketrain":
                times, s_index, e_index, t_start = obj.get_slice(**self.options)
                datalink = self.resolve_permalink( times, add_str='/data' )

                params = param_clean(s_index, e_index)
                if params:
                    datalink = urlparse.urljoin( datalink, "?" + params )

                attrs = {"times": datalink, "t_start": t_start}

            elif obj.obj_type == "waveform":
                waveform, s_index, e_index = obj.get_slice(**self.options)
                datalink = self.resolve_permalink( waveform, add_str='/data' )

                params = param_clean(s_index, e_index)
                if params:
                    datalink = urlparse.urljoin( datalink, "?" + params )

                attrs = {"waveform": datalink}

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
        datafile = self._resolve_ref(Datafile, field_value["data"], user)
        if datafile.has_array:
            update_kwargs[field_name] = datafile
            update_kwargs[field_name + "__unit"] = field_value["units"]
            return update_kwargs
        else:
            raise ReferenceError( "Data source is not readable; please provide\
                correct reference. Current value: %s" % (field_value["data"]) )



class NEOCategorySerializer(NEOSerializer):
    """ do not show reverse relations when list is requested. do not perform
    bulk update for data-array fields (makes no sense anyway) """
    #show_kids = False
    #excluded_bulk_update = ('times', 'signal', 'waveform') # FIXME not used


