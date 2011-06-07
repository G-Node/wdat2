from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

name_max_length = 100


def get_neo_by_id(neo_id):
    """
    Returns a NEO object by its NEO ID.
    For example, 'segment_1435'
    """
    pass

class BLock(models.Model):
    """
    NEO Block @ G-Node.
    """
    # NEO attributes
    name = models.CharField('name', max_length=name_max_length)
    filedatetime = models.DateTimeField('filedatetime', null=True, blank=True)
    index = models.IntegerField('index', null=True, blank=True)
    # G-Node attributes
    author = models.ForeignKey(User)
    date_created = models.DateTimeField('date created', default=datetime.now,\
        editable=False)



