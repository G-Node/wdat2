import datetime
import time
import random, binascii
import numpy as np
import tables as tb
import os
import uuid

from rest.serializers import Serializer
from rest.meta import meta_unit_types
from state_machine.models import VersionedForeignKey

from django.db import models
from django.utils import simplejson as json
from django.core.serializers.json import DjangoJSONEncoder
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

"""
This module contains abstract classes for testing basic REST functionality for a
typical REST app. Tests include:

1. CRUD
2. Permissions
3. response mode (full, etc.)
4. filters
5. Etag + last-modified + parent obj update in case of relations change

Inherit these tests in tests module for your custom django app to test 
REST-fulness of the models. Example:

>>>

class TestBasics(TestGeneric, TestCase):
    fixtures = ["users.json", "metadata.json"]

    def setUp(self):

        self.user = User.objects.get( pk=1 ) # first user, important!
        # logging in as first user. important as the first user owns all 
        # required objects installed as fixtures, thus tests that need related 
        # objects for their testing purposes will not fail.

        logged_in = self.client.login(username=self.user.username, password="pass")
        self.assertTrue(logged_in)
        self.models_to_test = (Section, Property, Value)
        self.backbone = backbone
        self.app_prefix = "metadata"

>>>

"""

#-------------------------------------------------------------------------------
# helper functions
#-------------------------------------------------------------------------------


def _create_temp_file( size, ftype='ascii' ):
    """ create test file with ascii or array data. can be used to create any 
    data-related objects, like signals, spiketrains etc. or just arbitrary 
    files.

    size - int
    returns OPENED python file object !!
    """
    a = np.random.rand( size )

    if ftype=='ascii':
        filepath = '/tmp/' + str( uuid.uuid4() ) + '.txt'
        with open(filepath, 'w') as f:
            a.tofile(f, ',')

    elif ftype=='binary':
        filepath = '/tmp/' + str( uuid.uuid4() ) + '.dat'
        with open(filepath, 'w') as f:
            a.tofile(f)

    elif ftype=='hdf5':
        name = str( uuid.uuid4() )
        filepath = '/tmp/' + name + '.h5'
        with tb.openFile(filepath, "a") as f:
            f.createArray("/", name, a)

    try:
        return open(filepath, 'r') # fuck opened handles
    except:
        raise NotImplementedError('This file type is not supported')

def _has_file_data( model ):
    """ defines whether there is a file in the model. if a model has a file 
    field request POST should have no content type """
    return len([x for x in model._meta.local_fields if isinstance(x, models.FileField)]) > 0


class TestGeneric( object ):
    """ Base abstract class for testing common REST functions like CRUD etc. 
    Every REST app could have a test that inherits from this class. 

    This class assumes that test object data is loaded using fixtures.
    """

    user = None                 # login here
    models_to_test = ()         # ordered tuple of model classes to test
    serializer = Serializer()   # custom serializer if needed
    backbone = None             # backbone structure of the app
    app_prefix = ''             # adds before class type in every REST URL

    RANDOM_VALUES = {
        models.CharField: lambda field, user: (
            binascii.b2a_hex( os.urandom( np.random.randint(1, 10) ) )[:field.max_length]
        ),
        models.TextField: lambda field, user: (
            binascii.b2a_hex( os.urandom( np.random.randint(1, 100) ) )[:field.max_length]
        ),
        models.IntegerField: lambda field, user: (
            np.random.randint(1, 1000)
        ),
        models.FloatField: lambda field, user: (
            float( np.random.rand(1) )
        ),
        models.DateTimeField: lambda field, user: datetime.datetime.now(),
        models.BooleanField: lambda field, user: (
            float( np.random.rand(1) ) > 0.5
        ),
        models.FileField: lambda field, user: (
            _create_temp_file( np.random.randint(1, 1000), ftype='hdf5')
        ),
        models.ForeignKey: lambda field, user: (
            random.choice( field.rel.to.objects.filter(owner=user) ).pk
        ),
        VersionedForeignKey: lambda field, user: (
            random.choice( field.rel.to.objects.filter(owner=user) ).pk
        ),
        models.fields.related.ManyToManyField: lambda field, user: (
            random.choice( field.rel.to.objects.filter(owner=user) ).pk
        )
    }

    def _get_test_value_for_field( self, field, user ):
        """ generates test value for a given field/user """
        data = self.RANDOM_VALUES[ field.__class__ ](field, user)

        if self.serializer.is_data_field_django(field):
            in_json = {"data": data}
            ufield = field.model._meta.get_field( field.name + "__unit" )
            unit = random.choice( meta_unit_types[ufield._unit_type] )
            in_json[ field.name + "__unit" ] = unit
            return in_json

        return data

    def _gen_random_post(self, model):
        """ generates a random JSON dict to further POST for a certain model """
        post = {}
        obj_type = model().obj_type

        attributes = self.backbone[ obj_type ]['attributes']
        data_fields = self.backbone[ obj_type ]['data_fields']
        parents = self.backbone[ obj_type ]['parents']
        required = self.backbone[ obj_type ]['required']

        for attr in attributes + data_fields + parents:
            field = model._meta.get_field( attr )

            if field.__class__ in self.RANDOM_VALUES.keys():
                if attr in required or random.choice([True, False]):
                    # if not required, 50% to set None
                    post[ field.name ] = self._get_test_value_for_field( field, self.user )
        return post


    def _compile_url(self, model, obj=None):
        """ returns REST url to query a certain model: objects list, or a 
        particular object if obj is given """
        obj_type = model().obj_type
        if obj:
            return "/%s/%s/%d/" % (self.app_prefix, obj_type, obj.pk)
        else:
            return "/%s/%s/" % (self.app_prefix, obj_type)

    #---------------------------------------------------------------------------
    # CRUD tests
    #---------------------------------------------------------------------------

    def test_create(self):
        """ creates an object for every model with POST request """
        for model in self.models_to_test:
            url = self._compile_url( model )
            post = self._gen_random_post( model )

            kwargs = {}
            if not _has_file_data( model ):
                # make JSON when NO file should be submitted
                post = DjangoJSONEncoder().encode(post)
                kwargs['content_type'] = "application/json"
            response = self.client.post(url, post, **kwargs)

            self.assertEqual(response.status_code, 201, \
                "Obj type %s; response: %s" % (model().obj_type, response.content))

    def test_update(self):
        """ updates an exising object for every model and validates the success
        of the update. expects samples from fixtures """
        for model in self.models_to_test:

            random_obj = random.choice( model.objects.filter(owner=self.user) )
            url = self._compile_url( model, random_obj )
            post = self._gen_random_post( model )

            response = self.client.post(url, DjangoJSONEncoder().encode(post), \
                content_type="application/json")

            self.assertNotEqual(response.status_code, 500, \
                "Obj type %s; response: %s" % (model().obj_type, response.content))

            response = self.client.get( url )
            rdata = json.loads(response.content)

            for f_name, f_value in post.items():
                field = model._meta.get_field( f_name )
                field.to_python( f_value ) # just a validation for f_value
                f_new_value = str(rdata['selected'][0]['fields'][field.name])

                # check only first object
                if field.rel is None:
                    self.assertEqual(f_new_value, str( f_value ), \
                        "Object: %s, field: %s" % (model().obj_type, field.name) )
                else: # validate permalink contains new ID
                    self.assertTrue( f_new_value.find( str( f_value ) ) > -1, \
                        "Object: %s, field: %s" % (model().obj_type, field.name) )


    def test_bulk_update(self):
        """ test BULK UPDATE. expects samples from fixtures """

        for model in self.models_to_test:

            url = self._compile_url( model )
            post = self._gen_random_post( model )

            response = self.client.post(url + '?bulk_update=1', DjangoJSONEncoder().encode(post), \
                content_type="application/json")
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (model().obj_type, response.content))

            response = self.client.get( url )
            rdata = json.loads(response.content)
            for f_name, f_value in post.items():
                field = model._meta.get_field( f_name )
                field.to_python( f_value ) # just a validation for f_value
                f_new_value = str(rdata['selected'][0]['fields'][field.name])

                # check only first object
                if field.rel is None:
                    self.assertEqual(f_new_value, str( f_value ), \
                        "Object: %s, field: %s" % (model().obj_type, field.name) )
                else:
                    self.assertTrue( f_new_value.find( str( f_value ) ) > -1, \
                        "Object: %s, field: %s" % (model().obj_type, field.name) )


    def test_delete(self):
        """ delete object, ensure it's not available anymore, ensure it's 
        available back in time. expects samples from fixtures """

        # objects should be deleted with a delay to check back in time
        dt = datetime.datetime.now()
        time.sleep(1)

        for model in self.models_to_test:

            obj_type = model().obj_type
            random_obj = random.choice( model.objects.filter( owner=self.user ) )
            url = "/%s/%s/%d/" % (self.app_prefix, obj_type, random_obj.pk)

            # delete object
            response = self.client.delete( url )
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get deleted object
            response = self.client.get( url )
            self.assertEqual(response.status_code, 404, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get object back in time
            response = self.client.get( url + "?at_time=" + dt.strftime("%Y-%m-%d %H:%M:%S") )
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

    #---------------------------------------------------------------------------
    # permissions tests
    #---------------------------------------------------------------------------

    """
    Here we test that a user can't access private objects, created (with 
    fixtures) by another user. Tests expect that more than one users are loaded 
    using fixtures.
    """

    def test_unauth_create(self):
        """ test: create an object """
        """ expected: 401 Unathorized """

        self.client.logout()

        for model in self.models_to_test:
            random_obj = random.choice( model.objects.all() )
            url = self._compile_url( model, random_obj )
            post = self._gen_random_post( model )

            kwargs = {}
            if not _has_file_data( model ):
                # make JSON when NO file should be submitted
                post = DjangoJSONEncoder().encode(post)
                kwargs['content_type'] = "application/json"
            response = self.client.post(url, post, **kwargs)

            self.assertEqual(response.status_code, 401)

    def test_unauth_update(self):
        """ test: update an object """
        """ expected: 401 Unathorized """

        self.client.logout()

        for model in self.models_to_test:
            random_obj = random.choice( model.objects.all() )
            url = self._compile_url( model, random_obj )
            post = self._gen_random_post( model )

            response = self.client.post( url, DjangoJSONEncoder().encode(post),\
                content_type="application/json")
            self.assertEqual(response.status_code, 401)

    def test_unauth_get(self):
        """ test: get single object """
        """ expected: 401 Unathorized """

        self.client.logout()

        for model in self.models_to_test:
            random_obj = random.choice( model.objects.all() )
            url = self._compile_url( model, random_obj )

            response = self.client.get( url )
            self.assertEqual(response.status_code, 401)

    def test_access_alien(self):
        """ test a user is not be able to access objects, to which he has no 
        permissions to access """
        aliens = User.objects.exclude( pk=self.user.pk )
        alien = random.choice( list(aliens) ) # random user
        self.client.logout()
        self.client.login(username=alien.username, password="pass")

        for model in self.models_to_test:
            # select all unaccessible objects
            objs = model.objects.exclude( owner=alien, safety_level=1 )
            random_obj = random.choice(objs)
            url = self._compile_url( model, random_obj )

            response = self.client.get( url )
            self.assertEqual(response.status_code, 403, \
                "Obj type %s; response: %s" % (model().obj_type, str(response)))

    def test_update_alien(self):
        """ test a user is not be able to change objects authored by others """
        aliens = User.objects.exclude( pk=self.user.pk )
        alien = random.choice( list(aliens) ) # random user
        self.client.logout()
        self.client.login(username=alien.username, password="pass")

        for model in self.models_to_test:
            # select all unaccessible objects
            objs = model.objects.exclude( owner=alien, safety_level=1 )
            random_obj = random.choice(objs)
            url = self._compile_url( model, random_obj )
            post = self._gen_random_post( model )

            response = self.client.post(url, DjangoJSONEncoder().encode(post),\
                content_type="application/json")

            self.assertEqual(response.status_code, 403)

    #---------------------------------------------------------------------------
    # response mode tests
    #---------------------------------------------------------------------------

    def test_response_modes(self):
        """ test that all response modes (info, link, full, beard) give 
        appropriate results. for the moment it just tests that there is no 
        error. TODO: write the real validation for every mode. """
        for model in self.models_to_test:
            modes = self.serializer.RESPONSE_MODES
            url = self._compile_url( model )

            for m in modes:
                response = self.client.get(url + "?q=%s" % m)
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; response: %s" % (model().obj_type, str(response)))


