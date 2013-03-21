from django.test import TestCase
from django.utils import simplejson as json
from django.contrib.auth.models import User

from rest.tests import TestGeneric

import numpy as np
import tables as tb
import settings
import uuid
import os

from datafiles.models import Datafile, backbone

""" TODO tests for archiving:
 - add all formats (zip, tar, bz2, gz), files made by zip in different OS!!
 - test validation procedure
 - test data slicing (?)
"""

class TestBasics(TestGeneric, TestCase):
    fixtures = ["users.json", "metadata.json", "datafiles.json"]

    def setUp(self):

        self.user = User.objects.get( pk=1 ) # first user, important!
        # logging in as first user. important as the first user owns all 
        # required objects installed as fixtures, thus tests that need related 
        # objects for their testing purposes will not fail.

        logged_in = self.client.login(username=self.user.username, password="pass")
        self.assertTrue( logged_in )
        self.models_to_test = (Datafile,)
        self.backbone = backbone
        self.app_prefix = "datafiles"

        # create real file(s) as defined in fixtures
        a = np.random.rand( np.random.randint(1, 1000) )
        path = settings.FILE_MEDIA_ROOT + "data/"
        if not "array.h5" in os.listdir( path ):
            with tb.openFile(path + "array.h5", "a") as f:
                f.createArray("/", "fixture_array_data", a)


    def test_create(self):
        """ raw_file FileField is needed to create a file """
        self.backbone['datafile']['attributes'].append( 'raw_file' )
        self.backbone['datafile']['required'].append( 'raw_file' )
        super(TestBasics, self).test_create()

    def test_unauth_create(self):
        """ raw_file FileField is needed to create a file """
        self.backbone['datafile']['attributes'].append( 'raw_file' )
        self.backbone['datafile']['required'].append( 'raw_file' )
        super(TestBasics, self).test_unauth_create()


