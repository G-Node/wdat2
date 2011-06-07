from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

name_max_length = 100
label_max_length = 100
unit_max_length = 10

def get_neo_by_id(neo_id):
    """
    Returns a NEO object by its NEO ID.
    For example, 'segment_1435'
    """
    pass

class BaseInfo(models.Model):
    """
    Basic info about any NEO object created at G-Node.
    """
    author = models.ForeignKey(User)
    date_created = models.DateTimeField('date created', default=datetime.now,\
        editable=False)

    class Meta:
        abstract = True


class Block(BaseInfo):
    """
    NEO Block @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    filedatetime = models.DateTimeField('filedatetime', null=True, blank=True)
    index = models.IntegerField('index', null=True, blank=True)


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


class EventArray(BaseInfo):
    """
    NEO EventArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)


class Event(BaseInfo):
    """
    NEO Event @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = models.CharField('time__unit', blank=True, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    eventarray = models.ForeignKey(EventArray, blank=True, null=True)


class EpochArray(BaseInfo):
    """
    NEO EpochArray @ G-Node.
    """
    # no NEO attributes
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)


class Epoch(BaseInfo):
    """
    NEO Epoch @ G-Node.
    """
    # NEO attributes
    label = models.CharField('label', max_length=label_max_length)
    time = models.FloatField('time')
    time__unit = models.CharField('time__unit', blank=True, max_length=unit_max_length)
    duration = models.FloatField('duration')
    duration__unit = models.CharField('duration__unit', blank=True, max_length=unit_max_length)
    # NEO relationships
    segment = models.ForeignKey(Segment, blank=True, null=True)
    epocharray = models.ForeignKey(EpochArray, blank=True, null=True)




