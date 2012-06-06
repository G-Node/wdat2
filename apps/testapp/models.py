from datetime import datetime

from django.db import models
from django.contrib.auth.models import User

from state_machine.models import SafetyLevel, ObjectState


class BookFKManager(models.Manager):
    def get_query_set(self, **kwargs):
        qs = Book.objects.filter( **(self.core_filters) )

        if kwargs.has_key('at_time'):
            at_time = kwargs['at_time']
            qs = qs.filter(starts_at__lte = at_time).filter(ends_at__gt = at_time)
        else:
            qs = qs.filter(ends_at__isnull = True)

        state = 10 # filter all 'active' objects by default
        if kwargs.has_key('current_state'): # change the filter if requested
            state = kwargs['current_state']
        qs = qs.filter(current_state = state)

        return qs


class Author(ObjectState):
    name = models.CharField(max_length=100)
    book = BookFKManager()


class Book(ObjectState):
    title = models.CharField(max_length=100)
    author = models.IntegerField() # fake FK to Author model
