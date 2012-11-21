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
- wrong URLs
- performance tests!!
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
from state_machine.models import _get_url_base

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
    names += [ 'safety_level', 'id', 'section' ]
    # 'section' is excluded because it's a different module, not tested here
    return names

def available_simple_fields( model ):
    """ returns non-'system' editable simple (non-relational) fields """
    reserved = reserved_field_names( model )
    return [ f for f in model._meta.local_fields if not f.name in reserved and not f.rel ]

def available_fk_fields( model ):
    """ returns non-'system' editable FK fields """
    reserved = reserved_field_names( model )
    return [ f for f in model._meta.local_fields if not f.name in reserved and f.rel ]

def create_simple_objects():
    ser = NEOSerializer()
    ser.host = "http://testhost.org"
    sample_objects = {}
    for cls in meta_classnames.values():
        objs = cls.objects.get_related( pk=1 )
        sobj = ser.serialize( objs )[0]['fields']

        # non-editable fields
        names = reserved_field_names( objs[0] )
        # reversed relations
        names += [l for l in sobj.keys() if (l.find("_set") == len(l) - 4)]
        for i in names:
            if sobj.has_key(i):
                sobj.pop( i ) # remove reserved fields
        sample_objects[ objs[0].obj_type ] = sobj
    return sample_objects


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
    ser = NEOSerializer()
    sample_objects = None
    ids = {}
    go = True
    new_value = ""

    def _set_post(self, field, model, v):
        go = True
        post = {}
        units="ms"
        if not field.name == 'times':
            units = 'mV'
        try:
            self.new_value = field.to_python( v )
            if self.ser.is_data_field_django(model, field):
                self.new_value = {
                    "data": self.new_value,
                    "units": units
                }
            post[field.name] = self.new_value
        except ValidationError:
            go = False
        return post, go

    def _create_file_with_array( self, size ):
        """ create test file with array data. can be further used to create any
        data-related objects, like signals, spiketrains etc. size - int """
        path = settings.FILE_MEDIA_ROOT + "data/"
        a = np.random.rand( size )
        with tb.openFile(path + "array.h5", "a") as f:
            f.createArray("/", "Random array, size: %d" % a.size, a)

    def _get_id_from_permalink(self, permalink):
        if permalink.endswith('/'): # remove trailing slash
            permalink = permalink[:permalink.rfind("/")]
        res = permalink[ permalink.rfind("/") + 1 : ]
        try:
            id = int( res )
            return id
        except ValueError:
            return None

    def setUp(self):
        # create test HDF5 file with array data
        import os
        path = settings.FILE_MEDIA_ROOT + "data/"
        if not "array.h5" in os.listdir( path ):
            _create_file_with_array( 1000 )

        # login
        logged_in = self.client.login(username="nick", password="pass")
        self.assertTrue(logged_in)

        # populate test JSON NEO object bodies if not done yet, create objects
        if self.sample_objects is None:
            self.sample_objects = create_simple_objects()

            # step 1. Create original objects ( test CREATE )
            # must be here to create objects for other tests
            ids = {}
            for obj_type, obj in self.sample_objects.items():
                ids[obj_type] = []
                for i in range(3): # create a few objects
                    try:
                        response = self.client.post("/neo/%s/" % obj_type, \
                            json.dumps(obj, cls=DjangoJSONEncoder), content_type="application/json")
                    except AttributeError:
                        print obj_type, obj
                    self.assertEqual(response.status_code, 201, \
                        "Obj type %s; response: %s" % (obj_type, response.content))
                    # save object ids for later
                    rdata = json.loads(response.content)
                    ids[obj_type].append( self._get_id_from_permalink( rdata['selected'][0]['permalink'] ) )
            self.ids = ids

    def test_change(self):
        """ test UPDATE and GET """
        for obj_type, model in meta_classnames.items():
            for field in available_simple_fields(model):
                for v in TEST_VALUES:
                    post, go = self._set_post(field, model, v)
                    id = self.ids[obj_type][0] # just test one object
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

    def test_bulk_update(self):
        """ test BULK UPDATE """
        for obj_type, model in meta_classnames.items():
            for field in available_simple_fields(model):
                for v in TEST_VALUES:
                    post, go = self._set_post(field, model, v)
                    response = self.client.post("/neo/%s/?bulk_update=1" % obj_type,\
                        DjangoJSONEncoder().encode(post), content_type="application/json")
                    self.assertNotEqual(response.status_code, 500, \
                        "Obj type %s; response: %s" % (obj_type, response.content))
                    if response.status_code == 200 and go:
                        response = self.client.get("/neo/%s/" % obj_type)
                        rdata = json.loads(response.content)
                        self.assertEqual(str(rdata['selected'][0]['fields'][field.name]),\
                            str( self.new_value ), "Object: %s, field: %s" % (obj_type, field.name) )

    def test_relations(self):
        """ test FKs and M2Ms. The structure created in the setup is a biased 
        tree from the relational point of view (all FKs are set to 1). At the 
        same time several objects of every type exists. So the relations test 
        could be done as:
        - changing the FK from 1 to, say, 2 for a particular object;
        - test the parent object that it does not have this particular object 
            anymore;
        - test the parent object that it has this particular object if requested
            back in time. """
        def _parse_ids( obj_type, name, content ):
            rdata = json.loads( content )
            rev_set = rdata['selected'][0]['fields'][name]
            return [int(a[ a.rfind('/') + 1: ]) for a in rev_set] # ids

        dt = datetime.now() # a point in time to go back and validate
        time.sleep(2)
        for obj_type, model in meta_classnames.items():
            for field in available_fk_fields(model):

                # name of the reversed field in the response
                fname = field.rel.related_name or obj_type + "_set"

                # get full object with reversed relations BEFORE the change
                response = self.client.get("%s1/?q=full" % _get_url_base( field.rel.to ))
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; field: %s, response: %s" % \
                    (obj_type, field.name, response.content))
                rev_set = _parse_ids( obj_type, fname, response.content ) # ids

                self.assertIn( 1, rev_set, "Object: %s, field: %s, rev_set: %s" % \
                    (obj_type, field.name, str(rev_set) ) )

                # change some relationship
                post, go = self._set_post(field, model, 2)
                response = self.client.post("/neo/%s/1" % obj_type, DjangoJSONEncoder().encode(post), content_type="application/json")
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; field: %s, response: %s" % \
                    (obj_type, field.name, response.content))

                # get full object with reversed relations AFTER the change
                response = self.client.get("%s1/?q=full" % _get_url_base( field.rel.to ))
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; field: %s, response: %s" % \
                    (obj_type, field.name, response.content))
                rev_set = _parse_ids( obj_type, fname, response.content ) # ids
                self.assertNotIn( 1, rev_set, "Object: %s, field: %s, rev_set: %s" % \
                    (obj_type, field.name, str(rev_set) ) )

                # check previous version has NO changes
                response = self.client.get("%s1/?q=full&at_time=%s" % \
                    (_get_url_base( field.rel.to ), dt.strftime("%Y-%m-%d %H:%M:%S")))
                rev_set = _parse_ids( obj_type, fname, response.content ) # ids
                self.assertIn( 1, rev_set, "Object: %s, field: %s, rev_set: %s" % \
                    (obj_type, field.name, str(rev_set) ) )


    def test_delete(self):
        """ delete object, ensure it's not available anymore, ensure it's 
        available at the moment after creation. expects samples from fixtures.
        test has to sleep between object creation / deletion, which is 
        time-consuming """
        for obj_type, model in meta_classnames.items():
            # get objects of a certain type
            response = self.client.get("/neo/%s/" % obj_type)
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            dt = datetime.now()
            rdata = json.loads(response.content)
            lid = self._get_id_from_permalink( rdata['selected'][0]['permalink'] )

            # objects should be deleted with a delay to check versioning
            time.sleep(1)
            response = self.client.delete("/neo/%s/%d" % ( obj_type, lid ))
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get deleted object
            response = self.client.get("/neo/%s/%d" % ( obj_type, lid ))
            self.assertEqual(response.status_code, 404, \
                "Obj type %s; response: %s" % (obj_type, str(response)))

            # try to get object back in time
            response = self.client.get("/neo/%s/%d/?at_time=%s" % \
                ( obj_type, lid, dt.strftime("%Y-%m-%d %H:%M:%S") ))
            self.assertEqual(response.status_code, 200, \
                "Obj type %s; response: %s" % (obj_type, str(response)))


    def test_response_mode(self):
        """ test that allresponse modes (info, link, full, beard) give 
        appropriate results. for the moment it juat tests that there is no 
        error. TODO: write the real validation for every mode. """
        for obj_type, model in meta_classnames.items():
            modes = NEOSerializer().RESPONSE_MODES
            for m in modes:
                response = self.client.get("/neo/%s/?q=%s" % (obj_type, m))
                self.assertEqual(response.status_code, 200, \
                    "Obj type %s; response: %s" % (obj_type, str(response)))


class TestFilters:
    pass
# Add test recursive metadata propagation


# Add test recursive eTag / last modified change


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
        self.sample_objects = create_simple_objects()

    def test_access_alien(self):
        for key in self.sample_objects.keys():
            # all IDs from fixtures are just <object_type>_1
            response = self.client.get("/neo/%s/1/" % key)
            self.assertEqual(response.status_code, 403)

    def test_update_alien(self):
        for key, obj in self.sample_objects.items():
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
