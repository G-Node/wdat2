from datetime import datetime

from django.db import models
from django.contrib.auth.models import User

from state_machine.models import SafetyLevel, ObjectState, VersionedM2M


class FakeFKField( models.IntegerField ):

    def __init__(self, *args, **kwargs):
        if not kwargs.has_key('fk_model'):
            raise ValueError("You should provide a Model class to initialize fake foreign key")
        self.fk_model = kwargs.pop('fk_model')
        super(FakeFKField, self).__init__(*args, **kwargs)


class FakeM2MManager( object ):

    def __init__(self, *args, **kwargs):
        # m2m model, local field name, reverse field name, qs (related objs)
        required_attrs = ['parent', 'm2m_model', 'local_field', 'reverse_field']
        for attr in required_attrs:
            setattr( self, attr, kwargs[attr] )

    @property
    def rel_model(self):
        return getattr( self.m2m_model, self.local_field ).fk_model

    """
    def related(self):
        filt = {}
        filt[ self.local_field ] = self.parent.local_id

        if not self.parent.end_time == None:
            # inlude time range from parent
            filt[ "start_time" + "__gte" ] = self.parent.start_time
            filt[ "end_time" + "__lte" ] = self.parent.end_time

        return = self.m2m_model.objects.filter( filt ) # could be more than one!
    """

"""
class FakeFKManager( models.Manager ):

    def __init__(self, *args, **kwargs):
        super(FakeFKManager, self).__init__()
        self.rel_model = kwargs.pop('rel_model')
        self.core_filters = kwargs

    def get_query_set(self, **kwargs):
        qs = self.rel_model.objects.filter( **(self.core_filters) )

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
"""

class Author(ObjectState):

    name = models.CharField(max_length=100)

    #def __init__(self, *args, **kwargs):
    #    super(Author, self).__init__(*args, **kwargs)
    #    kwargs = { "author": self.local_id }
    #    self.book_set = FakeFKManager( rel_model = Book, **kwargs )


class Book(ObjectState):
    title = models.CharField(max_length=100)
    #author = FakeFKField( fk_model = Author, null=True, blank=True ) # fake FK to Author model
    author = models.ForeignKey(Author, null=True, blank=True)

    def __init__(self, *args, **kwargs):
        self._meta.m2m_dict = { "translations": Translations_Books }
        super(Book, self).__init__(*args, **kwargs)


class Translation(ObjectState):
    lang = models.CharField(max_length=20)

    def __init__(self, *args, **kwargs):
        self._meta.m2m_dict = { "books": Translations_Books }
        super(Translation, self).__init__(*args, **kwargs)


class Translations_Books( VersionedM2M ):
    """ m2m which books are translated to which language """
    books = FakeFKField( fk_model = Book )
    translations = FakeFKField( fk_model = Translation )

