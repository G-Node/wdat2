"""
Tests Roadmap
================================================================================
- unauthorized tests:
    - not logged in, no access (create, get list)
    - private section, no access to contents for 3rd party user
    - shared section, no access to contents for 3rd party user, accessible for a
    user shared with
    - not able to modify by non-owner

- generic tests: 
    - create section
    - update section
    - copy sections (random nested structure)
    - move sections (random nested structure)
    - delete section
    - create property
    - update property
    - delete property
    - put/remove file
    - get section (flat/cascade)

- bad requests tests: assert correct bad data handling for all types of requests

Still remaining:
- performance tests!!
- Etag + last-modified
"""

from django.test import TestCase
from django.utils import simplejson as json
from django.contrib.auth.models import User

from rest.tests import TestGeneric
from metadata.models import Section, Property, Value, backbone

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
        self.backbone = dict(backbone)
        self.app_prefix = "metadata"



