from datetime import datetime

from django.db import models
from django.contrib.auth.models import User

from state_machine.models import SafetyLevel, ObjectState, FakeFKField, VersionedM2M

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

