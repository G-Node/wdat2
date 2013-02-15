""" 
This script creates test data for core apps of the NeuREST.

run it normally from the project root folder like:

<project_root>$ python load_test_data.py

NOTE. This script is independent from the test data located at fixtures inside django 
apps. As opposed to fixtures for UnitTests, where small number of test objects 
needed to allow tests run faster, this script is designed for API clients and
in practice creates significant amount of different objects with relatively high
amount of signal data.
"""

import django_access
import os
import settings
import numpy as np
import tables as tb
import random
import binascii, datetime
import json

from datetime import datetime
from django.db import models
from state_machine.models import VersionedForeignKey

from django.contrib.auth.models import User

from metadata.models import Section, Property, Value
from metadata.models import backbone as meta_backbone
from metadata.models import meta_classnames as metadata_classnames

from datafiles.models import Datafile
from settings import FILE_MEDIA_ROOT

from neo_api.models import *
from neo_api.models import backbone as neo_backbone
from neo_api.models import meta_classnames as neo_classnames

"""
NOTE. Loading data from fixtures is possible using:

>>> from django.core.management import call_command
>>> call_command('loaddata', 'users.json')

"""

class LoadData( object ):
    """ test data Loader class """
    verbose = True # print messages while processing
    usernames = ['bob', 'jeff', 'anita']
    RANDOM_VALUES = {
        models.CharField: lambda obj_type, field, user: (obj_type + field.name + 
                binascii.b2a_hex( os.urandom( np.random.randint(1, 20) ) )
        ),
        models.TextField: lambda obj_type, field, user: (obj_type + field.name +
            binascii.b2a_hex( os.urandom( np.random.randint(1, 200) ) )
        ),
        models.IntegerField: lambda obj_type, field, user: (
            np.random.randint(1, 1000)
        ),
        models.FloatField: lambda obj_type, field, user: (
            float( np.random.rand(1) )
        ),
        models.DateTimeField: lambda obj_type, field, user: datetime.now(),
        models.BooleanField: lambda obj_type, field, user: (
            float( np.random.rand(1) ) > 0.5
        ),
        models.ForeignKey: lambda obj_type, field, user: (
            random.choice( field.rel.to.objects.filter(owner=user) )
        ),
        VersionedForeignKey: lambda obj_type, field, user: (
            random.choice( field.rel.to.objects.filter(owner=user) )
        )
        #models.fields.related.ManyToManyField: lambda obj_type, field, user: (
        #    random.choice( field.rel.to.objects.filter(owner=user) )
        #)
    }

    def __call__(self):
        """ executes the whole test data load stack """
        self.load_users()
        self.load_metadata()
        self.load_datafiles()
        self.load_neo()
        self.annotate()

    def load_users(self):
        """ 
        BLOCK #1. USERS
        3 users are created: bob, jeff, anita. Profiles are created 
        automatically for them.

        require: no dependencies
        """
        existing_names = User.objects.all().values_list('username', flat=True)
        for username in self.usernames:
            if username not in existing_names:
                user = User.objects.create_user( username, 
                    '%s@blafoojohndoe.ru' % username, password = 'pass' )
                prof = user.get_profile()
                prof.name = username
                prof.save()

        if self.verbose:
            print "Users done."


    def load_metadata(self):
        """
        BLOCK #2. METADATA
        Loads random metadata tree for every user.

        require: BLOCK #1
        """
        ordered_classes_tuple = (
            ("section", lambda: np.random.randint(5, 50)),
            ("property", lambda: np.random.randint(30, 200)),
            ("value", lambda: np.random.randint(50, 500)),
        )

        users = User.objects.filter( username__in = self.usernames )
        assert len(users) > 0 , "There are no users loaded, run BLOCK 1 first"

        for user in users:
            root_section = Section.objects.create( name="ROOT SECTION", owner=user )
            for obj_type, amount_func in ordered_classes_tuple:
                for i in xrange( amount_func() ): # several objects of every type
                    cls = metadata_classnames[ obj_type ]
                    params = {}

                    attributes = meta_backbone[ obj_type ]['attributes']
                    parents = meta_backbone[ obj_type ]['parents']
                    required = meta_backbone[ obj_type ]['required']

                    for attr in attributes + parents:
                        field = cls._meta.get_field( attr )

                        if field.__class__ in self.RANDOM_VALUES.keys():
                            if attr in required or random.choice([True, False]):
                                # if not required, 50% to set None
                                value = self.RANDOM_VALUES[ field.__class__ ](obj_type, field, user)
                                if hasattr(field, 'max_length') and field.max_length:
                                    value = value[ : field.max_length - 1 ]
                                params[ attr ] = value

                    if np.random.rand(1) > 0.8: # 20% chances
                        params[ 'safety_level' ] = 1
                    params[ 'owner' ] = user
                    obj = cls.objects.create( **params )

        if self.verbose:
            print "Metadata done."


    def load_datafiles(self):
        """
        BLOCK #3. DATAFILES
        For each user simply create n HDF5 files with arbitrary arrays. Every 
        file can be treated as an array for AnalogSignal or a SpikeTrain or just
        as a file.

        require: BLOCKS #1, #2
        """
        sizes = (10**2, 10**4, 10**6) # array length options
        n = np.random.randint(5, 10) # number of files for every length option

        users = User.objects.filter( username__in = self.usernames )
        assert len(users) > 0 , "There are no users loaded, run BLOCK 1 first"

        for user in users:
            assert Section.objects.filter( owner=user ).count() > 0, "Some \
                sections are required for the user %s to create files." % user.username

            for size in sizes:
                for i in range( n ):
                    params = {}
                    rel_path = "test_data/%s/%d/" % (user.username, size)
                    filename = "array%d.h5" % i
                    params[ 'name' ] = filename

                    # make separate dir for test data
                    to_make = os.path.join( FILE_MEDIA_ROOT, rel_path )
                    if not os.path.exists( to_make ):
                        os.makedirs( os.path.join( FILE_MEDIA_ROOT, rel_path ) )

                    fullpath = os.path.join(FILE_MEDIA_ROOT, rel_path, filename)
                    with tb.openFile( fullpath, "w" ) as f:
                        a = np.random.rand( size )
                        f.createArray( "/", "%s_%d_%d" % \
                            (user.username, i, a.size), a )

                    if random.choice([True, False]): # 50% chances
                        sec = random.choice( Section.objects.filter( owner=user ) )
                        params[ 'section' ] = sec
                    if np.random.rand(1) > 0.8: # 20% chances
                        params[ 'safety_level' ] = 1
                    params[ 'owner' ] = user
                    params[ 'file_type' ] = 5
                    params[ 'raw_file' ] = os.path.join(rel_path, filename)

                    d = Datafile.objects.create( **params )

        if self.verbose:
            print "Datafiles done."


    def load_neo(self):
        """
        BLOCK #4. ELECTROPHYSIOLOGY

        Loads random numbers of electrophysiology data.
        """
        # option - load object structures from a .json file
        #with open('requirements.json', 'r') as f:
        #    backbone = json.load(f)

        ordered_classes_tuple = (
            ("block", lambda: np.random.randint(1, 10)),
            ("segment", lambda: np.random.randint(2, 20)),
            ("recordingchannelgroup", lambda: np.random.randint(1, 4)),
            ("recordingchannel", lambda: np.random.randint(1, 12)),
            ("unit", lambda: np.random.randint(1, 10)),
            ("spike", lambda: np.random.randint(1, 200)),
            ("eventarray", lambda: np.random.randint(1, 12)),
            ("event", lambda: np.random.randint(1, 50)),
            ("epocharray", lambda: np.random.randint(1, 8)),
            ("epoch", lambda: np.random.randint(1, 20)),
            ("spiketrain", lambda: np.random.randint(1, 500)),
            ("analogsignalarray", lambda: np.random.randint(1, 10)),
            ("analogsignal", lambda: np.random.randint(1, 500)),
            ("irsaanalogsignal", lambda: np.random.randint(1, 500))
        )

        users = User.objects.filter( username__in = self.usernames )
        assert len(users) > 0 , "There are no users loaded, run BLOCK 1 first"

        for user in users: # for every user
            assert Datafile.objects.filter( owner=user ).count() > 0, "Some \
                files are required for the user %s to create neo data." % user.username
            assert Section.objects.filter( owner=user ).count() > 0, "Some \
                sections are required for the user %s to create neo data." % user.username

            for obj_type, amount_func in ordered_classes_tuple: # for every NEO object type, order!!
                for i in xrange( amount_func() ): # several objects of every type
                    cls = neo_classnames[ obj_type ]
                    params = {}

                    attributes = backbone[ obj_type ]['attributes']
                    data_fields = backbone[ obj_type ]['data_fields']
                    parents = backbone[ obj_type ]['parents']
                    required = backbone[ obj_type ]['required']

                    for attr in attributes + data_fields + parents:
                        field = cls._meta.get_field( attr )

                        if field.__class__ in self.RANDOM_VALUES.keys():
                            if attr in required or random.choice([True, False]):
                                # if not required, 50% to set None
                                params[ attr ] = self.RANDOM_VALUES[ field.__class__ ](obj_type, field, user)

                                if attr in data_fields:
                                    params[ attr + "__unit" ] = "ms"

                    # take care: M2Ms are ignored

                    if np.random.rand(1) > 0.8: # 20% chances
                        params[ 'safety_level' ] = 1

                    params[ 'owner' ] = user
                    obj = cls.objects.create( **params )

        if self.verbose:
            print "NEO done."


    def annotate(self):
        """
        BLOCK #5. ANNOTATION

        Randomly connects metadata to data by tagging.
        """
        users = User.objects.filter( username__in = self.usernames )
        assert len(users) > 0 , "There are no users loaded, run BLOCK 1 first"

        for user in users:
            assert Value.objects.filter( owner=user ).count() > 0, "Some \
                values are required for the user %s for annotation." % user.username

            for i in xrange( np.random.randint(5, 10) ): # number of TAG operations
                # randomly select a few values
                values = Value.objects.filter( owner=user )
                rvalues = []
                for v in xrange( np.random.randint( 1, min(5,len(values)+1) ) ):
                    rvalues.append( random.choice( values ) )

                # randomly select some NEO class
                choices = neo_classnames.keys()
                try:
                    choices.remove('waveform')
                except ValueError:
                    pass
                obj_type = random.choice( choices )
                cls = neo_classnames[ obj_type ]
                assert cls.objects.filter( owner=user ).count() > 0, "Some \
                    %s are required for the user %s to create neo data." % (obj_type, user.username)

                neo = cls.objects.filter( owner=user )
                rneo = []
                for v in xrange( np.random.randint( 1, min(5,len(neo)+1) ) ):
                    rneo.append( random.choice( neo ) )

                # TAG random NEO objects with random values
                cls.save_changes( rneo, {}, {"metadata": [v.pk for v in rvalues]}, {}, False )

        if self.verbose:
            print "Annotation done."

        """
        # Additionally setup Section - Block connections if needed using this:

        for user in users:
            blocks = Block.objects.filter( owner=user )
            for section in Section.objects.filter( owner=user ):
                if random.choice([True, False]): # 50% chances
                    # select random Blocks
                    rblocks = []
                    for i in xrange( np.random.randint( 1, min(3,len(blocks)) ) ):
                        rblocks.append( random.choice( blocks ) )
                    Block.save_changes( rblocks, {"section": section}, {}, {}, False )
        """


"""
BLOCK #5. SHARING

Sharing of some random objects?
"""

if __name__ == '__main__':
    a = LoadData()
    a()
