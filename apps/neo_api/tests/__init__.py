"""
Tests Roadmap
================================================================================
- unauthorized tests
- generic tests: 
    - create
    - get full, info, data, parents, children
    - update + get
    - select
- bad requests tests: assert correct bad data handling for all types of requests
- security tests: try to access objects created by another person

Still remaining:
- versioning
- size, slicing, downsampling, unicode etc.
- data consistency tests: post/get data values do not differ significantly
- wrong URLs
- performance tests!!
- cascade
- Etag + last-modified
"""

from django.test import TestCase
from neo_api.models import *
from neo_api.tests.samples import sample_objects
from rest.meta import meta_attributes
from neo_api.serializers import NEOSerializer
from datetime import datetime
from django.utils import simplejson as json
from django.core.serializers.json import DjangoJSONEncoder

import tables as tb
import numpy as np
import settings
import time

SERVER_NAME = "testserver"

TEST_VALUES = [1, 0, 1.5, "this is a test", None]
# TODO make the test with ALL django field types!!


def reserved_field_names( model ):
    """ returns names of the 'system' non-editable fields """
    # non-editable fields
    names = [ fi.name for fi in model._meta.local_fields if not fi.editable ]
    # reserved fields
    names += [ 'current_state', 'safety_level', 'id' ]
    return names

def available_simple_fields( model ):
    """ returns non-'system' editable simple (non-relational) fields """
    reserved = reserved_field_names( model )
    return [ f for f in model._meta.local_fields if not f.name in reserved and not f.rel ]

def available_fk_fields( model ):
    """ returns non-'system' editable FK fields """
    reserved = reserved_field_names( model )
    return [ f for f in model._meta.local_fields if not f.name in reserved and f.rel ]



class TestUnauthorized(TestCase):
    # TODO update that to test all the objects
    def test_unauth_create(self):
        """ test: create a block """
        """ expected: 401 Unathorized """
        response = self.client.post("/neo/block/", {
            "name": "Block of recordings from May, 10",
            "filedatetime": "2011-10-05",
            "index": 1
        })
        self.assertEqual(response.status_code, 401)

    def test_unauth_update(self):
        """ test: update a block """
        """ expected: 401 Unathorized """
        response = self.client.post("/neo/block/1/", {
            "index": 5
        })
        self.assertEqual(response.status_code, 401)

    def test_unauth_get(self):
        """ test: get single object """
        """ expected: 401 Unathorized """
        response = self.client.get("/neo/block/1/")
        self.assertEqual(response.status_code, 401)


class TestGeneric(TestCase):
    fixtures = ["users.json", "samples.json"]

    def create_file_with_array( self, size ):
        """ create test file with array data. can be further used to create any
        data-related objects, like signals, spiketrains etc. size - int """
        path = settings.FILE_MEDIA_ROOT + "data/"
        a = np.random.rand( size )
        with tb.openFile(path + "array.h5", "a") as f:
            f.createArray("/", "Random array, size: %d" % a.size, a)

    def setUp(self):
        # create test HDF5 file with array data
        import os
        path = settings.FILE_MEDIA_ROOT + "data/"
        if not "array.h5" in os.listdir( path ):
            create_file_with_array( 1000 )

        # login
        logged_in = self.client.login(username="nick", password="pass")
        self.assertTrue(logged_in)

        # populate test JSON NEO object bodies, save in globals
        ser = NEOSerializer()
        ser.host = "http://testhost.org"
        sample_objects = {}
        for cls in meta_classnames.values():
            obj = cls.objects.get( local_id=1 )
            sobj = ser.serialize( [obj] )[0]['fields']

            # non-editable fields
            names = reserved_field_names( obj )
            # reversed relations
            names += [l for l in sobj.keys() if (l.find("_set") == len(l) - 4)]
            for i in names:
                if sobj.has_key(i):
                    sobj.pop( i ) # remove reserved fields
            sample_objects[ obj.obj_type ] = sobj
        globals()[ 'sample_objects' ] = sample_objects


    def zz_test_create_objects(self):
        """
        Test of successful creation of all types of NEO objects.
        expected: 201 created
        """
        for obj_type, obj in sample_objects.items():
            for i in range(5): # create a few objects
                response = self.client.post("/neo/%s/" % obj_type, \
                    json.dumps(obj, cls=DjangoJSONEncoder), content_type="application/json")
                self.assertEqual(response.status_code, 201, \
                    "Obj type %s; response: %s" % (obj_type, response.content))

    def zz_test_get_object(self):
        """
        Test the GET single object URLs.
        expected: 200 successful
        """
        for key in sample_objects.keys():
            response = self.client.get("/neo/%s/1/" % key)
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (key, str(response)))
            self.assertContains(response, key) # TODO add full check


    def test_crud_and_versioning(self):
        """ basically test that you can go back in time to a system state, when 
        objects and relations were different. """
        def _set_post(field, model, v):
            go = True
            post = {}
            try:
                self.new_value = field.to_python( v )
                if self.ser.is_data_field_django(model, field):
                    self.new_value = {
                        "data": self.new_value,
                        "units": "ms"
                    }
                post[field.name] = self.new_value
            except ValidationError:
                go = False
            return post, go

        self.go = True
        self.new_value = ""
        stamp0 = datetime.now() # a point in time to go back and validate

        # step 1. Create original objects ( test CREATE )
        ids = {}
        for obj_type, obj in sample_objects.items():
            ids[obj_type] = []
            for i in range(3): # create a few objects
                response = self.client.post("/neo/%s/" % obj_type, \
                    json.dumps(obj, cls=DjangoJSONEncoder), content_type="application/json")
                self.assertEqual(response.status_code, 201, \
                    "Obj type %s; response: %s" % (obj_type, response.content))
                # save object ids for later
                rdata = json.loads(response.content)
                ids[obj_type].append( int(rdata['selected'][0]['fields']['local_id']) )
                #time.sleep(2) # objects should be created at different time

        stamp1 = datetime.now() # a point in time to go back and validate
        print "test objects created.. ( test CREATE ) OK"

        # step 2. change objects ( test UPDATE and GET )
        self.ser = NEOSerializer()
        for obj_type, model in meta_classnames.items():
            for field in available_simple_fields(model):
                for v in TEST_VALUES:
                    post, go = _set_post(field, model, v)
                    id = ids[obj_type][0] # just test one object
                    response = self.client.post("/neo/%s/%d" % (obj_type, id),\
                        DjangoJSONEncoder().encode(post), content_type="application/json")
                    # DjangoJSONEncoder can encode datetime
                    self.assertNotEqual(response.status_code, 500, \
                        "Obj type %s; response: %s" % (obj_type, response.content))
                    if response.status_code == 200 and go:
                        response = self.client.get("/neo/%s/%d/" % (obj_type, id))
                        rdata = json.loads(response.content)
                        self.assertEqual(str(rdata['selected'][0]['fields'][field.name]),\
                            str( self.new_value ), "Object: %s, field: %s" % (obj_type, field.name) )

        stamp2 = datetime.now() # a point in time to go back and validate
        print "changes made.. ( test UPDATE and GET ) OK"

        # step 3. do bulk update ( test BULK_UPDATE )
        for obj_type, model in meta_classnames.items():
            for field in available_simple_fields(model):
                for v in TEST_VALUES:
                    post, go = _set_post(field, model, v)
                    response = self.client.post("/neo/%s/?bulk_update=1" % obj_type,\
                        DjangoJSONEncoder().encode(post), content_type="application/json")
                    self.assertNotEqual(response.status_code, 500, \
                        "Obj type %s; response: %s" % (obj_type, response.content))
                    if response.status_code == 200 and go:
                        response = self.client.get("/neo/%s/" % obj_type)
                        rdata = json.loads(response.content)
                        self.assertEqual(str(rdata['selected'][0]['fields'][field.name]),\
                            str( self.new_value ), "Object: %s, field: %s" % (obj_type, field.name) )

        stamp3 = datetime.now() # a point in time to go back and validate
        print "bulk updates made.. ( test BULK UPDATE ) OK"

        # step 4. change relations ( test FKs and M2Ms )


        stamp4 = datetime.now() # a point in time to go back and validate

        # step 5. go back in time and check ( test VERSIONING )
        for obj_type, model in meta_classnames.items():
            pass



    def test_update_relations(self):
        pass


    def test_select_objects(self):
        """
        Test to retreive list of objects.
        expected: 200 successful, number of objects is correct
        """
        for key in sample_objects.keys():
            response = self.client.get("/neo/%s/" % key)
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (key, str(response)))
            r = json.loads(response.content)
            self.assertEqual(len(r["selected"]), 1) # from fixtures
            # TODO more convenient checks?
            

    def test_delete(self):
        """ delete object, ensure it's not available anymore, ensure it's 
        available at the moment after creation. expects samples from fixtures"""
        for obj_type, model in meta_classnames.items():
            # get objects of a certain type
            response = self.client.get("/neo/%s/" % obj_type)
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            dt = datetime.now()
            rdata = json.loads(response.content)
            lid = rdata['selected'][0]['fields']['local_id']
            # delete object
            response = self.client.delete("/neo/%s/%d" % ( obj_type, lid ))
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get deleted object
            response = self.client.get("/neo/%s/%d" % ( obj_type, lid ))
            self.assertEqual(response.status_code, 404, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get object back in time
            response = self.client.get("/neo/%s/%d/?at_time=%s" % \
                ( obj_type, lid, str( dt ) ))
            self.assertEqual(response.status_code, 404, \
                "Obj type %s; response: %s" % (obj_type, str(response)))





class TestFilters:
    pass


# Add test recursive metadata propagation


# Add test recursive eTag / last modified change


# DELETE - does not appear in queries - test

class TestSecurity(TestCase):
    """
    Here we test that a fake user 'joe' can't access objects, created (with
    fixtures) by another fake user 'nick'. More tests here, when object sharing 
    is implemented.
    """

    fixtures = ["users.json", "samples.json"]

    def setUp(self):
        logged_in = self.client.login(username="joe", password="pass")
        self.assertTrue(logged_in)

    def test_access_alien(self):
        for key in sample_objects.keys():
            # all IDs from fixtures are just <object_type>_1
            response = self.client.get("/neo/%s/1/" % key)
            self.assertEqual(response.status_code, 403)

    def test_update_alien(self):
        for key, obj in sample_objects.items():
            # all alien object IDs are just <object_type>_1
            response = self.client.post("/neo/%s/1/" % key, json.dumps(obj), \
                content_type="application/json")
            self.assertEqual(response.status_code, 403)


# alternative option how to load sample objects from fixtures.
# not the best way because it doesn't resolve data fields etc.
"""
sample_objects = {}
with open("../fixtures/samples.json") as f:
    j = json.load(f) # it's a list

# extract NEO objects into sample_objects
for obj in j:
    offset = obj['model'].find('neo_api')
    if not ( offset == -1 ):
        key = obj['model'][ obj['model'].rfind('.') + 1 : ].lower()
        sample_objects[ key ] = obj[ 'fields' ]
"""
