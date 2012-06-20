from datetime import datetime

from django.db import models
from django.contrib.auth.models import User

from state_machine.models import SafetyLevel, ObjectState

# TODO make the manager reusable, assigning a model to self

class BookFKManager(models.Manager):

    def __init__(self, *args, **kwargs):
        super(BookFKManager, self).__init__()
        self.core_filters = kwargs

    def get_query_set(self, **kwargs):
        qs = Book.objects.filter( **(self.core_filters) )

        if kwargs.has_key('at_time'):
            at_time = kwargs['at_time']
            qs = qs.filter(starts_at__lte = at_time).filter(ends_at__gt = at_time)
            # TODO check lte and gt - wirklich?
        else:
            qs = qs.filter(ends_at__isnull = True)

        state = 10 # filter all 'active' objects by default
        if kwargs.has_key('current_state'): # change the filter if requested
            state = kwargs['current_state']
        qs = qs.filter(current_state = state)

        return qs

    def select_versioned(self, *args, **kwargs):
        return self.get_query_set( **kwargs ).select_related(*args, **kwargs)


class Author(ObjectState):

    name = models.CharField(max_length=100)

    def __init__(self, *args, **kwargs):
        super(Author, self).__init__(*args, **kwargs)
        kwargs = { "author_fk": self.local_id }
        self.book_set = BookFKManager( **kwargs )


class Book(ObjectState):
    title = models.CharField(max_length=100)
    author_fk = models.IntegerField() # fake FK to Author model

    @property
    def author(self):
        return Author.objects.get( local_id = self.author_fk ) # more kwargs here?

