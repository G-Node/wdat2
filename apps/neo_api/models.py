from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.core.exceptions import PermissionDenied, ValidationError

import numpy as np
from scipy import signal as spsignal
from fields import models as fmodels
from state_machine.models import ObjectState, SafetyLevel
from datafiles.models import Datafile, ArrayInHDF5
from metadata.models import Section, Value
from rest.meta import meta_unit_types, meta_objects, meta_messages, meta_children, factor_options, meta_parents
from neo_api.serializers import NEOSerializer


# default unit values and values limits
name_max_length = 100
label_max_length = 100
unit_max_length = 10

def_time_unit = "ms"
def_data_unit = "mV"
def_samp_unit = "Hz"

# supporting functions
#===============================================================================

def _data_as_list(data):
    """
    Returns a list of floats from comma-separated text or empty list.

    # old way:
    l = []
    if len(data):
        for s in str(data).split(','):
            l.append(float(s))
    return l
    """
    return list(l)

def _clean_csv(arr):
    """
    Parses a given list and returns a string of comma-separated float values.
    """
    if not type(arr) == type([]):
        raise ValueError("data provided is not a list.")
    cleaned_data = ""
    for value in arr:
        try:
            a = float(value)
            cleaned_data += ', ' + str(a)
        except:
            raise ValueError(str(value))
    if len(cleaned_data) > 0:
        cleaned_data = cleaned_data[2:]
    return cleaned_data


class BaseInfo(SafetyLevel, ObjectState):
    """
    Basic info about any NEO object created at G-Node.

    State:
    Active <--> Deleted -> Archived

    """
    STATES = (
        (10, 'Active'),
        (20, 'Deleted'),
        (30, 'Archived'),
    )
    file_origin = models.ForeignKey(Datafile, blank=True, null=True, editable=False)
    metadata = models.ManyToManyField(Value, blank=True, null=True)

    @models.permalink
    def get_absolute_url(self):
        return ('neo_object_details', [self.obj_type, str(self.id)])

    class Meta:
        abstract = True

    @property
    def neo_id(self):
        """ Returns NEO_ID. Example of neo_id: 'segment_1435' """
        return "%s_%d" % (self.obj_type, self.id)

    @property
    def default_serializer(self):
        return NEOSerializer

    @property
    def has_data(self):
        return False # no data by default

    @property
    def info(self):
        raise NotImplementedError("This is an abstract class")

    @property
    def size(self):
        """
        used as default for Events, Epochs etc. which have a fixed small
        non-significant size
        """
        return 0 


class DataObject(models.Model):
    """ implements methods and attributes for objects containing array data """

    # related data in bytes
    data_size = models.IntegerField('data_size', blank=True, null=True)

    class Meta:
        abstract = True

    @property
    def has_data(self):
        return True

    @property
    def size(self):
        return self.data_size

    def update_size(self):
        """ retrieves data from file, updates size. hits the Database (1-2) """
        s = 0
        if hasattr(self, 'signal'):
            s += ArrayInHDF5.objects.get( id = self.signal ).get_slice().nbytes
        if hasattr(self, 'times'):
            s += ArrayInHDF5.objects.get( id = self.times ).get_slice().nbytes
        if hasattr(self, 'waveform'):
            s += ArrayInHDF5.objects.get( id = self.waveform ).get_slice().nbytes
        self.data_size = s

    def save(self, *args, **kwargs):
        """ need to update size """
        self.update_size()
        super(DataObject, self).save(*args, **kwargs)


# basic NEO classes
#===============================================================================

# 1 (of 15)
class Block(BaseInfo):
    """
    NEO Block @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    filedatetime = models.DateTimeField('filedatetime', null=True, blank=True)
    index = models.IntegerField('index', null=True, blank=True)
    section = models.ForeignKey(Section, blank=True, null=True)

    @property
    def info(self):
        pass

    @property
    def size(self): # FIXME select only current revision and state = 10
        return int(np.array([w.size for w in self.segment_set.all()]).sum())


# 2 (of 15)
class Segment(BaseInfo):
    """
    NEO Segment @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    filedatetime = models.DateTimeField('filedatetime', null=True, blank=True)
    index = models.IntegerField('index', null=True, blank=True)
    # NEO relationships
    block = models.ForeignKey(Block, blank=True, null=True)

    @property
    def size(self): # FIXME select only current revision and state = 10
        return int(np.array([np.array([w.size for w in getattr(self, child + \
            "_set").all()]).sum() for child in meta_children["segment"]]).sum())


# 3 (of 15)
class EventArray(BaseInfo):
    """
    NEO EventArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)

# 4 (of 15)
class Event(BaseInfo):
    """
    NEO Event @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = fmodels.TimeUnitField('time__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    eventarray = models.ForeignKey(EventArray, blank=True, null=True)

    @property
    def is_alone(self):
        """
        Indicates whether to show an object alone, even if it is organized in
        an EventArray.
        """
        return (self.eventarray.count() == 0)

# 5 (of 15)
class EpochArray(BaseInfo):
    """
    NEO EpochArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)

# 6 (of 15)
class Epoch(BaseInfo):
    """
    NEO Epoch @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = fmodels.TimeUnitField('time__unit', default=def_time_unit)
    duration = models.FloatField('duration')
    duration__unit = fmodels.TimeUnitField('duration__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    epocharray = models.ForeignKey(EpochArray, blank=True, null=True)

    @property
    def is_alone(self):
        """
        Indicates whether to show an object alone, even if it is organized in
        an EpochArray.
        """
        return (self.epocharray.count() == 0)

# 7 (of 15)
class RecordingChannelGroup(BaseInfo):
    """
    NEO RecordingChannelGroup @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    # NEO relationships
    block = models.ForeignKey(Block, blank=True, null=True)


# 8 (of 15)
class RecordingChannel(BaseInfo):
    """
    NEO RecordingChannel @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    index = models.IntegerField('index', null=True, blank=True)
    # NEO relationships
    recordingchannelgroup = models.ForeignKey(RecordingChannelGroup, blank=True, null=True)


# 9 (of 15)
class Unit(BaseInfo):
    """
    NEO Unit @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    # NEO relationships
    recordingchannel = models.ManyToManyField(RecordingChannel, blank=True, null=True)


# 10 (of 15)
class SpikeTrain(BaseInfo, DataObject):
    """
    NEO SpikeTrain @ G-Node.
    """
    # NEO attributes
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.TimeUnitField('t_start__unit', default=def_time_unit)
    t_stop = models.FloatField('t_stop', blank=True, null=True)
    t_stop__unit = fmodels.TimeUnitField('t_stop__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)
    # NEO data arrays
    times = models.IntegerField('times', blank=True) # ID of the ArrayInHDF5
    times__unit = fmodels.TimeUnitField('times__unit', default=def_data_unit)

    def get_slice(self, **kwargs):
        """ implements dataslicing/downsampling. Floats/integers are expected.
        'downsample' parameter defines the new resampled resolution.  """

        def _find_nearest(array, value):
            """ Finds index of the nearest value to the given value in the 
            given array. """
            return (np.abs(array - float(value))).argmin()

        # compute the boundaries if indexes are given
        s_index = kwargs.get('start_index', 0)
        e_index = kwargs.get('end_index', 10**9)

        if kwargs.has_key('samples_count'):
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = s_index + samples_count
            else:
                s_index = e_index - samples_count

        # compute the boundaries if times are given
        t = ArrayInHDF5.objects.get( id = self.times )
        times = t.get_slice() # need full array to compute the boundaries

        if kwargs.has_key('start_time'):
            s_index = _find_nearest(times, kwargs['start_time'])
        if kwargs.has_key('end_time'):
            e_index = _find_nearest(times, kwargs['end_time'])

        if kwargs.has_key('duration'):
            duration = kwargs['duration']
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = _find_nearest(times, times[start_index] + duration)
            else:
                s_index = _find_nearest(times, times[end_index] + duration)

        # load the signal, sliced
        if s_index >= 0 and s_index < e_index:
            times = times[ s_index : e_index+1 ]
            t_start = times[0] # compute new t_start
        else:
            raise IndexError("Index is out of range. From the values provided \
we can't get the slice of the SpikeTrain. We calculated the start index as %d \
and end index as %d. The size of the signal is %d bytes." % (s_index, e_index, \
self.size ))

        # downsampling..
        downsample = kwargs.get('downsample', None)
        if downsample and downsample < len(signal):
            times = spsignal.resample(times, downsample).tolist()
        return times, t_start
    # overwrite the size property when waveforms are supported

    """
    @property
    def size(self):
        return int(np.array([w.size for w in self.waveform_set.all()]).sum()) +\
            self.times_size
    """

# 11 (of 15)
class AnalogSignalArray(BaseInfo):
    """
    NEO AnalogSignalArray @ G-Node.
    """
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannelgroup = models.ForeignKey(RecordingChannelGroup, blank=True, null=True)

    # NEO attributes
    @property
    def sampling_rate(self):
        pass

    @property
    def s_start(self):
        pass

    @property
    def size(self): # FIXME select only current revision and state = 10
        return int(np.array([w.size for w in self.analogsignal_set.all()]).sum())


# 12 (of 15)
class AnalogSignal(BaseInfo, DataObject):
    """
    NEO AnalogSignal @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    sampling_rate = models.FloatField('sampling_rate')
    sampling_rate__unit = fmodels.SamplingUnitField('sampling_rate__unit', default=def_samp_unit)
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.TimeUnitField('t_start__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    analogsignalarray = models.ForeignKey(AnalogSignalArray, blank=True, null=True)
    # NEO data arrays
    signal = models.IntegerField('signal') # ID of the ArrayInHDF5
    signal__unit = fmodels.SignalUnitField('signal__unit', default=def_data_unit)

    def get_slice(self, **kwargs):
        """ implements dataslicing/downsampling. Floats/integers are expected.
        'downsample' parameter defines the new resampled resolution. hits the 
        Database """

        # calculate the factor to align time / sampling rate units
        factor = factor_options.get("%s%s" % (self.t_start__unit.lower(), \
            self.sampling_rate__unit.lower()), 1.0)

        # compute the boundaries if indexes are given
        s_index = kwargs.get('start_index', 0)
        e_index = kwargs.get('end_index', 10**9)

        samples_count = kwargs.get('samples_count', None)
        if samples_count:
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = s_index + samples_count
            else:
                s_index = e_index - samples_count

        if kwargs.has_key('start_time'):
            s_index = int(round(self.sampling_rate * (kwargs['start_time'] - t_start) * factor))
        if kwargs.has_key('end_time'):
            e_index = int(round(self.sampling_rate * (kwargs['end_time'] - t_start) * factor))
        duration = kwargs.get('duration', None)
        if duration:
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = s_index + int(round(self.sampling_rate * duration * factor))
            else:
                s_index = e_index - int(round(self.sampling_rate * duration * factor))

        if s_index >= 0 and s_index < e_index:
            s = ArrayInHDF5.objects.get( id = self.signal )
            signal = s.get_slice( s_index, e_index+1 )
            t_start += (s_index * 1.0 / self.sampling_rate * 1.0 / factor) # compute new t_start
        else:
            raise IndexError( "Index is out of range for an. signal %s. From the\
values provided we can't get the slice of the signal. We calculated the start \
index as %d and end index as %d. Please check those. The sampling rate is %s %s,\
 t_start is %s %s" % (self.id, s_index, e_index, self.sampling_rate, \
self.sampling_rate__unit.lower(), self.t_start, self.t_start__unit.lower() ) )

        downsample = kwargs.get('downsample', None)
        if downsample and downsample < len(signal):
            new_rate = ( float(downsample) / float(len(signal)) ) * self.sampling_rate
            dataslice = spsignal.resample(signal, downsample).tolist()
        return dataslice, t_start, new_rate

    @property
    def is_alone(self):
        """
        Indicates whether to show an object alone, even if it is organized in
        an AnalogSignalArray. 
        """
        return (self.analogsignalarray.count() == 0)


# 13 (of 15)
class IrSaAnalogSignal(BaseInfo, DataObject):
    """
    NEO IrSaAnalogSignal @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.TimeUnitField('t_start__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    # NEO data arrays
    signal = models.IntegerField('signal') # ID of the signal ArrayInHDF5
    signal__unit = fmodels.SignalUnitField('signal__unit', default=def_data_unit)
    times = models.IntegerField('times') # ID of the times ArrayInHDF5
    times__unit = fmodels.TimeUnitField('times__unit', default=def_time_unit)

    def get_slice(self, **kwargs):
        """ implements dataslicing/downsampling. Floats/integers are expected.
        'downsample' parameter defines the new resampled resolution.  """

        def _find_nearest(array, value):
            """ Finds index of the nearest value to the given value in the 
            given array. """
            return (np.abs(array - float(value))).argmin()

        # compute the boundaries if indexes are given
        s_index = kwargs.get('start_index', 0)
        e_index = kwargs.get('end_index', 10**9)

        if kwargs.has_key('samples_count'):
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = s_index + samples_count
            else:
                s_index = e_index - samples_count

        # compute the boundaries if times are given
        t = ArrayInHDF5.objects.get( id = self.times )
        times = t.get_slice() # need full array to compute the boundaries

        if kwargs.has_key('start_time'):
            s_index = _find_nearest(times, kwargs['start_time'])
        if kwargs.has_key('end_time'):
            e_index = _find_nearest(times, kwargs['end_time'])

        if kwargs.has_key('duration'):
            duration = kwargs['duration']
            if kwargs.has_key('start_time') or kwargs.has_key('start_index'):
                e_index = _find_nearest(times, times[start_index] + duration)
            else:
                s_index = _find_nearest(times, times[end_index] + duration)

        # load the signal, sliced
        if s_index >= 0 and s_index < e_index:
            s = ArrayInHDF5.objects.get( id = self.signal )
            signal = s.get_slice( s_index, e_index+1 )
            times = times[ s_index : e_index+1 ]
            t_start = times[0] # compute new t_start
        else:
            raise IndexError("Index is out of range. From the values provided \
we can't get the slice of the signal. We calculated the start index as %d and \
end index as %d. The size of the signal is %d bytes." % (s_index, e_index, \
self.size ))

        # downsampling..
        downsample = kwargs.get('downsample', None)
        if downsample and downsample < len(signal):
            dataslice = spsignal.resample(signal, downsample).tolist()
            times = spsignal.resample(times, downsample).tolist()

        return signal, times, t_start

    def full_clean(self, *args, **kwargs):
        """ Add some validation to keep 'signal' and 'times' dimensions 
        consistent. """
        signal, times, t_start = self.get_slice()
        if not len( signal ) == len( self.times ):
            raise ValidationError({"Data Inconsistent": \
                meta_messages["data_inconsistency"]})
        super(IrSaAnalogSignal, self).full_clean(*args, **kwargs)

# 14 (of 15)
class Spike(BaseInfo):
    """
    NEO Spike @ G-Node.
    """
    # NEO attributes
    time = models.FloatField('t_start')
    time__unit = fmodels.TimeUnitField('time__unit', default=def_time_unit)
    sampling_rate = models.FloatField('sampling_rate')
    sampling_rate__unit = fmodels.SamplingUnitField('sampling_rate__unit', default=def_samp_unit)
    left_sweep = models.FloatField('left_sweep', default=0.0)
    left_sweep__unit = fmodels.TimeUnitField('left_sweep__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)

    @property
    def size(self): # FIXME select only current revision and state = 10
        return int(np.array([w.size for w in self.waveform_set.all()]).sum())

# 15 (of 15)
class WaveForm(BaseInfo, DataObject):
    """
    Supporting class for Spikes and SpikeTrains.
    """
    channel_index = models.IntegerField('channel_index', null=True, blank=True)
    time_of_spike = models.FloatField('time_of_spike', default=0.0) # default used when WF is related to a Spike
    time_of_spike__unit = fmodels.TimeUnitField('time_of_spike__unit', default=def_data_unit)
    #waveform_data = models.TextField('waveform_data')
    waveform = models.IntegerField('waveform') # ID of the ArrayInHDF5
    waveform__unit = fmodels.SignalUnitField('waveform__unit', default=def_data_unit)
    spiketrain = models.ForeignKey(SpikeTrain, blank=True, null=True)
    spike = models.ForeignKey(Spike, blank=True, null=True)
    metadata = "Please look at the metadata of the parent object"

    def get_slice(self, **kwargs):
        """ only start_index, end_index are supported. hits the Database """

        start_index = kwargs.get('start_index', 0)
        end_index = kwargs.get('end_index', 10**9)

        a = ArrayInHDF5.objects.get( id = self.waveform )
        return a.get_slice( start_index, end_index ) # returns array as list

    """ # DEPRECATED way for handling data attribute
    @apply
    def waveform():
        def fget(self, **kwargs):
            # try to cache signal - could be a trick with new slices..
            if not hasattr(self, '_waveform'):

                start_index = kwargs.get('start_index', 0)
                end_index = kwargs.get('end_index', 10**9)

                a = ArrayInHDF5.objects.get( id = self.waveform_data )
                self._waveform = a.get_slice( start_index, end_index )

            return self._waveform

        def fset(self, ref):
            self.waveform_data = ref
            self._waveform = self.waveform # update the waveform
        def fdel(self):
            pass
        return property(**locals())
    """


# supporting functions
#===============================================================================

meta_classnames = {
    "block": Block,
    "segment": Segment,
    "event": Event,
    "eventarray": EventArray,
    "epoch": Epoch,
    "epocharray": EpochArray,
    "unit": Unit,
    "spiketrain": SpikeTrain,
    "analogsignal": AnalogSignal,
    "analogsignalarray": AnalogSignalArray,
    "irsaanalogsignal": IrSaAnalogSignal,
    "spike": Spike,
    "recordingchannelgroup": RecordingChannelGroup,
    "recordingchannel": RecordingChannel,
    "waveform": WaveForm}


def get_type_by_class(cls):
    """
    Returns the type of the object (string), like 'segment' or 'event'.
    """
    for obj_type in meta_objects:
        if issubclass(cls, meta_classnames[obj_type]):
            return obj_type


