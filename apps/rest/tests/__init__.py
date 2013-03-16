import datetime
import time
import random, binascii
import numpy as np
import os

from rest.serializers import Serializer
from rest.meta import meta_unit_types
from state_machine.models import VersionedForeignKey

from django.db import models
from django.utils import simplejson as json
from django.core.serializers.json import DjangoJSONEncoder
from django.core.exceptions import ValidationError

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


class TestGeneric( object ):
    """ Base abstract class for testing common REST functions like CRUD etc. 
    Every REST app could have a test that inherits from this class. 

    This class assumes that test object data is loaded using fixtures.
    """

    user = None # login here
    models_to_test = () # ordered tuple of model classes to test
    serializer = Serializer() # custom serializer if needed
    backbone = None # backbone structure of the app
    app_prefix = "" # adds before class type in the REST URL

    RANDOM_VALUES = {
        models.CharField: lambda field, user: (field.model().obj_type + "_" + 
            field.name + "_" + binascii.b2a_hex( os.urandom( np.random.randint(1, 20) ) )
        ),
        models.TextField: lambda field, user: (field.model().obj_type + "_" + 
            field.name + "_" + binascii.b2a_hex( os.urandom( np.random.randint(1, 20) ) )
        ),
        models.IntegerField: lambda field, user: (
            np.random.randint(1, 1000)
        ),
        models.FloatField: lambda field, user: (
            float( np.random.rand(1) )
        ),
        models.DateTimeField: lambda field, user: datetime.now(),
        models.BooleanField: lambda field, user: (
            float( np.random.rand(1) ) > 0.5
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

    #---------------------------------------------------------------------------
    # CRUD tests
    #---------------------------------------------------------------------------

    def test_create(self):
        """ creates an object for every model with POST request """
        for model in self.models_to_test:
            obj_type = model().obj_type
            url = "/%s/%s/" % (self.app_prefix, obj_type)
            post = {} # POST request body to create an object

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

            response = self.client.post(url, \
                json.dumps(post, cls=DjangoJSONEncoder), content_type="application/json")

            self.assertEqual(response.status_code, 201, \
                "Obj type %s; response: %s" % (obj_type, response.content))

    def test_update(self):
        """ updates an exising object for every model and validates the success
        of the update. expects samples from fixtures """
        for model in self.models_to_test:

            post = {} # POST request body to update an object
            obj_type = model().obj_type
            #pk_field = [f for f in model._meta.local_fields if f.primary_key][0]
            #pk = self._get_test_value_for_field( pk_field, self.user )
            #url = "/%s/%s/%d" % (self.app_prefix, obj_type, pk)
            random_obj = random.choice( model.objects.all( owner=self.user ) )
            url = "/%s/%s/%d/" % (self.app_prefix, obj_type, random_obj.pk)

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

            try:
                DjangoJSONEncoder().encode(post)
            except TypeError: # fix the bug in bulk_update too!!
                import ipdb
                ipdb.set_trace()

            response = self.client.post(url,\
                DjangoJSONEncoder().encode(post), content_type="application/json")
            self.assertNotEqual(response.status_code, 500, \
                "Obj type %s; response: %s" % (obj_type, response.content))

            response = self.client.get( url )
            rdata = json.loads(response.content)
            for f_name, f_value in post.items():
                field = model._meta.get_field( f_name )
                field.to_python( f_value ) # just a validation for f_value
                self.assertEqual(
                    str(rdata['selected'][0]['fields'][field.name]),\
                    str( f_value ), "Object: %s, field: %s" % (obj_type, field.name) )

    def test_bulk_update(self):
        """ test BULK UPDATE. expects samples from fixtures """

        for model in self.models_to_test:

            post = {} # POST request body to update an object
            obj_type = model().obj_type
            url = "/%s/%s/" % (self.app_prefix, obj_type)

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

            response = self.client.post(url + '?bulk_update=1',\
                DjangoJSONEncoder().encode(post), content_type="application/json")
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, response.content))

            response = self.client.get( url )
            rdata = json.loads(response.content)
            for f_name, f_value in post.items():
                field = model._meta.get_field( f_name )
                field.to_python( f_value ) # just a validation for f_value

                # check only first object
                self.assertEqual(
                    str(rdata['selected'][0]['fields'][field.name]),\
                    str( f_value ), "Object: %s, field: %s" % (obj_type, field.name) )

    def test_delete(self):
        """ delete object, ensure it's not available anymore, ensure it's 
        available back in time. expects samples from fixtures """

        # objects should be deleted with a delay to check back in time
        dt = datetime.now()
        time.sleep(1)

        for model in self.models_to_test:

            obj_type = model().obj_type
            random_obj = random.choice( model.objects.all( owner=self.user ) )
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
            response = self.client.get( url + dt.strftime("%Y-%m-%d %H:%M:%S") )
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
            obj_type = model().obj_type
            random_obj = random.choice( model.objects.all() )
            url = "/%s/%s/" % (self.app_prefix, obj_type)

            response = self.client.post( url, json.dumps(random_obj, \
                cls=DjangoJSONEncoder), content_type="application/json")
            self.assertEqual(response.status_code, 401)

    def test_unauth_update(self):
        """ test: update an object """
        """ expected: 401 Unathorized """

        self.client.logout()

        for model in self.models_to_test:
            obj_type = model().obj_type
            random_obj = random.choice( model.objects.all() )
            url = "/%s/%s/%d/" % (self.app_prefix, obj_type, random_obj.pk)

            response = self.client.post( url, json.dumps(random_obj, \
                cls=DjangoJSONEncoder), content_type="application/json")
            self.assertEqual(response.status_code, 401)

    def test_unauth_get(self):
        """ test: get single object """
        """ expected: 401 Unathorized """

        self.client.logout()

        for model in self.models_to_test:
            obj_type = model().obj_type
            random_obj = random.choice( model.objects.all() )
            url = "/%s/%s/%d/" % (self.app_prefix, obj_type, random_obj.pk)

            response = self.client.get( url )
            self.assertEqual(response.status_code, 401)

    def test_access_alien(self):
        """ test a user is not be able to access objects, to which he has no 
        permissions to access """
        aliens = User.objects.exclude( pk=self.user.pk )
        alien = random.choice( list(aliens) ) # random user

        for model in self.models_to_test:
            obj_type = model().obj_type

            # select all unaccessible objects
            objs = model.objects.exclude( owner=alien, safety_level=1 )
            random_obj = random.choice(objs)
            url = "/%s/%s/%d" % (self.app_prefix, obj_type, random_obj.pk)

            response = self.client.get( url )
            self.assertEqual(response.status_code, 403)

    def test_update_alien(self):
        """ test a user is not be able to change objects authored by others """
        aliens = User.objects.exclude( pk=self.user.pk )
        alien = random.choice( list(aliens) ) # random user

        for model in self.models_to_test:
            obj_type = model().obj_type

            # select all unaccessible objects
            objs = model.objects.exclude( owner=alien, safety_level=1 )
            random_obj = random.choice(objs)
            url = "/%s/%s/%d" % (self.app_prefix, obj_type, random_obj.pk)

            response = self.client.post( url, json.dumps(random_obj, \
                cls=DjangoJSONEncoder), content_type="application/json")
            self.assertEqual(response.status_code, 403)

    #---------------------------------------------------------------------------
    # response mode tests
    #---------------------------------------------------------------------------

    def test_response_modes(self):
        """ test that all response modes (info, link, full, beard) give 
        appropriate results. for the moment it just tests that there is no 
        error. TODO: write the real validation for every mode. """
        for model in self.models_to_test:
            obj_type = model().obj_type
            modes = self.serializer.RESPONSE_MODES
            for m in modes:
                response = self.client.get("/neo/%s/?q=%s" % (obj_type, m))
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; response: %s" % (obj_type, str(response)))

