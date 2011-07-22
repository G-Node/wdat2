from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.core.exceptions import PermissionDenied

from fields import models as fmodels
from datafiles.models import Datafile

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
    """
    l = []
    if len(data):
        for s in str(data).split(', '):
            l.append(float(s))
    return l

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


class BaseInfo(models.Model):
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
    _current_state = models.IntegerField('current state', choices=STATES, default=10)
    author = models.ForeignKey(User)
    date_created = models.DateTimeField('date created', default=datetime.now,\
        editable=False)
    file_origin = models.ForeignKey(Datafile, blank=True, null=True)

    # this is temporary unless the integration with Datafiles is implemented
    def is_accessible(self, user):
        return self.author == user

    def can_edit(self, user):
        return self.author == user

    class Meta:
        abstract = True

    @property
    def neo_id(self):
        """
        Returns NEO_ID. Example of neo_id: 'segment_1435'
        """
        return str(self.obj_type + "_" + str(self.id))

    @property
    def obj_type(self):
        """
        Returns the type of the object (string), like 'segment' or 'event'.
        """
        for obj_type in meta_objects:
            if isinstance(self, meta_classnames[obj_type]):
                return obj_type
        raise TypeError("Critical error. Panic. NEO object can't define it's own type. Tell system developers.")

    @property
    def current_state(self):
        return self._current_state

    def is_active(self):
        return self.current_state == 10

    def delete(self):
        self._current_state = 20

    def archive(self):
        self._current_state = 30

    def restore(self):
        self._current_state = 10

# basic NEO classes
#===============================================================================

# 1
class Block(BaseInfo):
    """
    NEO Block @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    filedatetime = models.DateTimeField('filedatetime', null=True, blank=True)
    index = models.IntegerField('index', null=True, blank=True)


# 2
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

# 3
class EventArray(BaseInfo):
    """
    NEO EventArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)

# 4
class Event(BaseInfo):
    """
    NEO Event @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = fmodels.UnitField('time__unit', default=def_time_unit)
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

# 5
class EpochArray(BaseInfo):
    """
    NEO EpochArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)

# 6
class Epoch(BaseInfo):
    """
    NEO Epoch @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = fmodels.UnitField('time__unit', default=def_time_unit)
    duration = models.FloatField('duration')
    duration__unit = fmodels.UnitField('duration__unit', default=def_time_unit)
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

# 7
class RecordingChannelGroup(BaseInfo):
    """
    NEO RecordingChannelGroup @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    # NEO relationships
    block = models.ForeignKey(Block, blank=True, null=True)

# 8
class RecordingChannel(BaseInfo):
    """
    NEO RecordingChannel @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    index = models.IntegerField('index', null=True, blank=True)
    # NEO relationships
    recordingchannelgroup = models.ForeignKey(RecordingChannelGroup, blank=True, null=True)

# 9
class Unit(BaseInfo):
    """
    NEO Unit @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    # NEO relationships
    recordingchannel = models.ManyToManyField(RecordingChannel, blank=True, null=True)

# 10
class SpikeTrain(BaseInfo):
    """
    NEO SpikeTrain @ G-Node.
    """
    # NEO attributes
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.UnitField('t_start__unit', default=def_time_unit)
    t_stop = models.FloatField('t_stop', blank=True, null=True)
    t_stop__unit = fmodels.UnitField('t_stop__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)
    # NEO data arrays
    times_data = models.TextField('spike_data', blank=True) # use 'spike_times' property to get data
    times__unit = fmodels.UnitField('spike_data__unit', default=def_data_unit)

    @apply
    def times():
        def fget(self):
            return _data_as_list(self.times_data)
        def fset(self, arr):
            self.times_data = _clean_csv(arr)
        def fdel(self):
            pass
        return property(**locals())


# 11
class AnalogSignalArray(BaseInfo):
    """
    NEO AnalogSignalArray @ G-Node.
    """
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)

    # NEO attributes
    @property
    def sampling_rate(self):
        pass

    @property
    def s_start(self):
        pass

# 12
class AnalogSignal(BaseInfo):
    """
    NEO AnalogSignal @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    sampling_rate = models.FloatField('sampling_rate')
    sampling_rate__unit = fmodels.UnitField('sampling_rate__unit', default=def_samp_unit)
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.UnitField('t_start__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    analogsignalarray = models.ForeignKey(AnalogSignalArray, blank=True, null=True)
    # NEO data arrays
    signal_data = models.TextField('signal_data') # use 'signal' property to get data
    signal__unit = fmodels.UnitField('signal__unit', default=def_data_unit)

    @apply
    def signal():
        def fget(self):
            return _data_as_list(self.signal_data)
        def fset(self, arr):
            self.signal_data = _clean_csv(arr)
        def fdel(self):
            pass
        return property(**locals())

    @property
    def is_alone(self):
        """
        Indicates whether to show an object alone, even if it is organized in
        an AnalogSignalArray. 
        """
        return (self.analogsignalarray.count() == 0)

# 13
class IrSaAnalogSignal(BaseInfo):
    """
    NEO IrSaAnalogSignal @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    t_start = models.FloatField('t_start')
    t_start__unit = fmodels.UnitField('t_start__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    # NEO data arrays
    signal_data = models.TextField('signal_data') # use 'signal' property to get data
    signal__unit = fmodels.UnitField('signal__unit', default=def_data_unit)
    times_data = models.TextField('times_data', blank=True) # use 'times' property to get data
    times__unit = fmodels.UnitField('times__unit', default=def_time_unit)

    @apply
    def signal():
        def fget(self):
            return _data_as_list(self.signal_data)
        def fset(self, arr):
            self.signal_data = _clean_csv(arr)
        def fdel(self):
            pass
        return property(**locals())

    @apply
    def times():
        def fget(self):
            return _data_as_list(self.times_data)
        def fset(self, arr):
            self.times_data = _clean_csv(arr)
        def fdel(self):
            pass
        return property(**locals())

# 14
class Spike(BaseInfo):
    """
    NEO Spike @ G-Node.
    """
    # NEO attributes
    time = models.FloatField('t_start')
    time__unit = fmodels.UnitField('time__unit', default=def_time_unit)
    sampling_rate = models.FloatField('sampling_rate')
    sampling_rate__unit = fmodels.UnitField('sampling_rate__unit', default=def_samp_unit)
    left_sweep = models.FloatField('left_sweep', default=0.0)
    left_sweep__unit = fmodels.UnitField('left_sweep__unit', default=def_time_unit)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)


class WaveForm(BaseInfo):
    """
    Supporting class for Spikes and SpikeTrains.
    """
    channel_index = models.IntegerField('channel_index', null=True, blank=True)
    time_of_spike_data = models.FloatField('time_of_spike_data', default=0.0) # default used when WF is related to a Spike
    time_of_spike__unit = fmodels.UnitField('time_of_spike__unit', default=def_data_unit)
    waveform_data = models.TextField('waveform_data')
    waveform__unit = fmodels.UnitField('waveform__unit', default=def_data_unit)
    spiketrain = models.ForeignKey(SpikeTrain, blank=True, null=True)
    spike = models.ForeignKey(Spike, blank=True, null=True)

    @apply
    def waveform():
        def fget(self):
            return _data_as_list(self.waveform_data)
        def fset(self, arr):
            self.waveform_data = _clean_csv(arr)
        def fdel(self):
            pass
        return property(**locals())


class Sliceable:
    """
    Interface to query data slice for objects having data arrays.
    """
    def signal(self):
        raise NotImplementedError("This is an abstract interface, method is not implemented.")

    def get_slice(self, start_time=None, end_time=None, start_index=None,\
            end_index=None, duration=None, samples_count=None):
        """
        Defines a dataslice to cut. implemented for AnalogSignal / IRsAAs. 
        Method expects float input values.
        """
        data = getattr(obj, arr)
        if start_time:
            # clean start_time
            if start_time > self.t_stop:
                pass
            if end_time:
                pass
            elif duration:
                pass
            elif samples_count:
                pass
            else:
                pass
        elif start_index:
            if end_index:
                pass
            elif duration:
                pass
            elif samples_count:
                pass
            else:
                pass
        elif end_time:
            if duration:
                pass
            elif samples_count:
                pass
            else:
                pass
        elif end_index:
            if duration:
                pass
            elif samples_count:
                pass
            else:
                pass
        array = {"data": data, "units": getattr(obj, arr + "__unit")}
        return data



# supporting functions
#===============================================================================

meta_objects = ["block", "segment", "event", "eventarray", "epoch", "epocharray", \
    "unit", "spiketrain", "analogsignal", "analogsignalarray", \
    "irsaanalogsignal", "spike", "recordingchannelgroup", "recordingchannel"]

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
    "recordingchannel": RecordingChannel}

def get_by_neo_id(neo_id, user):
    """
    Returns a NEO object by its NEO ID. Checks the user can access it.
    Example of neo_id: 'segment_1435'
    """
    mid = neo_id.find("_")
    if mid > 0 and len(neo_id) > mid + 1: # exclude error in case of "segment_"
        obj_type = neo_id[:neo_id.find("_")]
        obj_id  = neo_id[neo_id.find("_")+1:]
        classname = meta_classnames[obj_type]
        obj = classname.objects.get(id=obj_id)
        if obj.is_accessible(user):
            return obj
        else:
            raise PermissionDenied("Sorry, you don't have access to this NEO object.")
    else:
        # totally wrong id
        raise TypeError("totally wrong NEO ID provided.")



