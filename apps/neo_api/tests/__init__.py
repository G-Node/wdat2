from django.test import TestCase
from django.contrib.auth.models import User
from rest.tests import TestGeneric

from neo_api.models import meta_classnames, backbone

import numpy as np
import tables as tb
import settings
import os

# TODO
"""
- mode: full (with data) or just JSON
- size, slicing, downsampling, unicode etc.
- metadata tagging propagation
"""

class TestBasics(TestGeneric, TestCase):
    fixtures = ["users.json", "metadata.json", "datafiles.json", "neo.json"]

    def setUp(self):

        self.user = User.objects.get( pk=1 ) # first user, important!
        # logging in as first user. important as the first user owns all 
        # required objects installed as fixtures, thus tests that need related 
        # objects for their testing purposes will not fail.

        logged_in = self.client.login(username=self.user.username, password="pass")
        self.assertTrue( logged_in )
        self.models_to_test = set( [cls for t, cls in meta_classnames.items()] )
        self.backbone = dict(backbone)
        self.app_prefix = "electrophysiology"

        # create real file(s) as defined in fixtures
        a = np.random.rand( np.random.randint(1, 1000) )
        path = settings.FILE_MEDIA_ROOT + "data/"
        if not "array.h5" in os.listdir( path ):
            with tb.openFile(path + "array.h5", "a") as f:
                f.createArray("/", "fixture_array_data", a)
