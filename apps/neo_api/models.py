from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

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

def data_as_list(data):
    """
    Returns a list of floats from comma-separated text.
    """
    l = []
    for s in data.split(', '):
        l.append(float(s))
    return l



def reg_csv():
    # old version - re.compile('^[\d+\.\d*,]+$')
    return re.compile(r'''
        \s*                # Any whitespace.
        (                  # Start capturing here.
          [^,"']+?         # Either a series of non-comma non-quote characters.
          |                # OR
          "(?:             # A double-quote followed by a string of characters...
              [^"\\]|\\.   # That are either non-quotes or escaped...
           )*              # ...repeated any number of times.
          "                # Followed by a closing double-quote.
          |                # OR
          '(?:[^'\\]|\\.)*'# Same as above, for single quotes.
        )                  # Done capturing.
        \s*                # Allow arbitrary space before the comma.
        (?:,|$)            # Followed by a comma or the end of a string.
        ''', re.VERBOSE)

class BaseInfo(models.Model):
    """
    Basic info about any NEO object created at G-Node.
    """
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
    time__unit = models.CharField('time__unit', default=def_time_unit, max_length=unit_max_length)
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
    time__unit = models.CharField('time__unit', default=def_time_unit, max_length=unit_max_length)
    duration = models.FloatField('duration')
    duration__unit = models.CharField('duration__unit', default=def_time_unit, max_length=unit_max_length)
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
class WaveForm(BaseInfo):
    """
    Supporting class for Spikes and SpikeTrains.
    """
    channel_index = models.IntegerField('channel_index', null=True, blank=True)
    waveform_data = models.TextField('waveform_data')
    waveform__unit = models.CharField('waveform__unit', default=def_data_unit, max_length=unit_max_length)

    @property
    def waveform(self):
        return data_as_list(self.waveform_data)

class SpikeTrain(BaseInfo):
    """
    NEO SpikeTrain @ G-Node.
    """
    # NEO attributes
    t_start = models.FloatField('t_start')
    t_start__unit = models.CharField('t_start__unit', default=def_time_unit, max_length=unit_max_length)
    t_stop = models.FloatField('t_stop', blank=True, null=True)
    t_stop__unit = models.CharField('t_stop__unit', default=def_time_unit, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)
    # NEO data arrays
    spike_data = models.TextField('spike_data', blank=True) # use 'spike_times' property to get data
    spike_times__unit = models.CharField('spike_data__unit', default=def_data_unit, max_length=unit_max_length)
    waveforms = models.ForeignKey(WaveForm, blank=True)

    @property
    def spike_times(self):
        return data_as_list(self.spike_data)

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
    sampling_rate__unit = models.CharField('sampling_rate__unit', default=def_samp_unit, max_length=unit_max_length)
    t_start = models.FloatField('t_start')
    t_start__unit = models.CharField('t_start__unit', default=def_time_unit, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    analogsignalarray = models.ForeignKey(AnalogSignalArray, blank=True, null=True)
    # NEO data arrays
    signal_data = models.TextField('signal_data') # use 'signal' property to get data
    signal__unit = models.CharField('signal__unit', default=def_data_unit, max_length=unit_max_length)

    @property
    def signal(self):
        return data_as_list(self.signal_data)

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
    t_start__unit = models.CharField('t_start__unit', default=def_time_unit, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    recordingchannel = models.ForeignKey(RecordingChannel, blank=True, null=True)
    # NEO data arrays
    signal_data = models.TextField('signal_data') # use 'signal' property to get data
    signal__unit = models.CharField('signal__unit', default=def_data_unit, max_length=unit_max_length)
    times_data = models.TextField('times_data', blank=True) # use 'times' property to get data
    times__unit = models.CharField('times__unit', default=def_time_unit, max_length=unit_max_length)

    @property
    def signal(self):
        return data_as_list(self.signal_data)

    @property
    def times(self):
        return data_as_list(self.times_data)

# 14
class Spike(BaseInfo):
    """
    NEO Spike @ G-Node.
    """
    # NEO attributes
    time = models.FloatField('t_start')
    time__unit = models.CharField('time__unit', default=def_time_unit, max_length=unit_max_length)
    sampling_rate = models.FloatField('sampling_rate')
    sampling_rate__unit = models.CharField('sampling_rate__unit', default=def_samp_unit, max_length=unit_max_length)
    left_sweep = models.FloatField('left_sweep', default=0.0)
    left_sweep__unit = models.CharField('left_sweep__unit', default=def_time_unit, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    unit = models.ForeignKey(Unit, blank=True, null=True)
    # NEO data arrays
    waveform = models.ForeignKey(WaveForm)



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
    "recordingchannel": RecordingChannel}

def get_by_neo_id(neo_id):
    """
    Returns a NEO object by its NEO ID.
    Example of neo_id: 'segment_1435'
    """
    mid = neo_id.find("_")
    if mid > 0 and len(neo_id) > mid + 1: # exclude error in case of "segment_"
        obj_type = neo_id[:neo_id.find("_")]
        obj_id  = neo_id[neo_id.find("_")+1:]
        try:
            classname = meta_classnames[obj_type]
            return classname.objects.get(id=obj_id)
        except KeyError:
            # invalid non-NEO prefix
            return -1
    else:
        # totally wrong id
        return -1
