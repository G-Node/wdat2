"""
Tests Roadmap
================================================================================
- Unauthorized tests
- Generic tests: 
    - create
    - update + get
    - select
    - size, slicing, downsampling
- Bad requests tests: assert correct bad data handling for all types of requests
- Security tests: try to access objects created by another person
"""

from django.test import TestCase
from neo_api.models import *
from neo_api.tests.samples import sample_objects
import json

SERVER_NAME = "testserver"

class TestUnauthorized(TestCase):

    def test_unauth_create(self):
        """ test: create a block """
        """ expected: 401 Unathorized """
        response = self.client.post("/neo/", {
            "obj_type": "block",
            "name": "Block of recordings from May, 10",
            "filedatetime": "2011-10-05",
            "index": 1
        })
        self.assertEqual(response.status_code, 401)

    def test_unauth_update(self):
        """ test: update a block """
        """ expected: 401 Unathorized """
        response = self.client.post("/neo/", {
            "neo_id": "block_1",
            "index": 5
        })
        self.assertEqual(response.status_code, 401)

    def test_unauth_get(self):
        """ test: get single object """
        """ expected: 401 Unathorized """
        response = self.client.get("/neo/analogsignal_1/")
        self.assertEqual(response.status_code, 401)


class TestGeneric(TestCase):
    fixtures = ["users.json", "parents.json"]

    def setUp(self):
        logged_in = self.client.login(username="bob", password="pass")
        self.assertTrue(logged_in)

    def test_create_objects(self):
        """
        Test of successful creation of all types of NEO objects.
        expected: 201 created
        """
        for obj in sample_objects:
            for i in range(5): # create a few objects
                response = self.client.post("/neo/", json.dumps(obj), \
                    content_type="application/json")
                self.assertEqual(response.status_code, 201)








