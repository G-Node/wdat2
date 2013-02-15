""" 
This script creates test data for core apps of the NeuREST.

This script is independent from the test data located at fixtures inside django 
apps. As opposed to fixtures for UnitTests, where small number of test objects 
needed to allow tests run faster, this script is designed for API clients and
in practice creates significant amount of different objects with relatively high
amount of signal data.
"""

def load_data():
    import os
    import settings
    import django_access
    import numpy as np
    import random

    from django.db import models
    from state_machine.models import VersionedForeignKey

    RANDOM_VALUES = {
        models.CharField: lambda obj_type, field, user: (obj_type + field.name + 
                binascii.b2a_hex( os.urandom( np.random.randint(1, 20) ) )
        ),
        models.TextField: lambda obj_type, field, user: (obj_type + 
            field.name + binascii.b2a_hex( os.urandom( np.random.randint(1, 200) ) )
        ),
        models.IntegerField: lambda obj_type, field, user: np.random.randint(1, 1000),
        models.FloatField: lambda obj_type, field, user: float( np.random.rand(1) ),
        models.DateTimeField: lambda obj_type, field, user: datetime.datetime.now(),
        models.BooleanField: lambda obj_type, field, user: float( np.random.rand(1) ) > 0.5,
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

    """
    NOTE. Loading data from fixtures is possible using:

    >>> from django.core.management import call_command
    >>> call_command('loaddata', 'users.json')

    """

    """ 
    BLOCK #1. USERS
    3 users are created: bob, jeff, anita. Profiles are created automatically for 
    them.

    require: no dependencies
    """

    from django.contrib.auth.models import User

    usernames = ['bob', 'jeff', 'anita']

    existing_names = User.objects.all().values_list('username', flat=True)
    for username in usernames:
        if username not in existing_names:
            user = User.objects.create_user( username, '%s@blafoojohndoe.ru' % username, password = 'pass' )
            prof = user.get_profile()
            prof.name = username
            prof.save()

    users = User.objects.filter( username__in = usernames ) # for other blocks

    """
    BLOCK #2. DATAFILES
    For each user simply create n HDF5 files with arbitrary arrays. Every file can 
    be treated as an array for AnalogSignal or a SpikeTrain or just as a file.

    require: BLOCK #1
    """

    from datafiles.models import Datafile
    from settings import FILE_MEDIA_ROOT

    import numpy as np
    import tables as tb

    sizes = (10**2, 10**4, 10**6) # array length options
    n = np.random.randint(5, 10) # number of files for every length option

    for user in users:
        for size in sizes:
            for i in range( n ):
                rel_path = "test_data/%s/%d/" % (user.username, size)
                filename = "array%d.h5" % i

                # make separate dir for test data
                to_make = os.path.join( FILE_MEDIA_ROOT, rel_path )
                if not os.path.exists( to_make ):
                    os.makedirs( os.path.join( FILE_MEDIA_ROOT, rel_path ) )

                fullpath = os.path.join(FILE_MEDIA_ROOT, rel_path, filename)
                with tb.openFile( fullpath, "w" ) as f:
                    a = np.random.rand( size )
                    f.createArray( "/", "no: %d, owner: %s, size: %d" % \
                        (i, user.username, a.size), a )

                d = Datafile.objects.create( name=filename, owner=user, file_type=5, \
                    raw_file=os.path.join(rel_path, filename) )

    """
    BLOCK #3. ELECTROPHYSIOLOGY

    Loads random numbers of electrophysiology data.
    """

    import os, binascii, datetime
    import numpy as np
    import json

    from neo_api.models import *
    from metadata.models import backbone as neo_backbone
    from neo_api.models import meta_classnames as neo_classnames

    # load object structures from requirements.json
    #with open('requirements.json', 'r') as f:
    #    backbone = json.load(f)

    ordered_classes_tuple = (
        ("block", lambda: np.random.randint(1, 10)),
        ("segment", lambda: np.random.randint(2, 20)),
        ("recordingchannelgroup", lambda: np.random.randint(1, 4)),
        ("recordingchannel", lambda: np.random.randint(1, 12)),
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

    for user in users: # for every user 
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

                    if attr in data_fields:
                        params[ attr + "__unit" ] = "ms"

                    if field.__class__ in RANDOM_VALUES.keys():
                        if attr in required or random.choice([True, False]):
                            # if not required, 50% to set None
                            params[ attr ] = RANDOM_VALUES[ field.__class__ ](obj_type, field, user)

                    # take care: M2Ms are ignored
                params[ 'owner' ] = user
                obj = cls.objects.create( **params )


    """
    BLOCK #4. METADATA

    Loads random metadata tree for every user and randomly connects metadata to the
    data directly and by tagging.
    """

    import os, binascii, datetime
    import numpy as np
    import json

    from metadata.models import Section, Property, Value
    from metadata.models import backbone as meta_backbone
    from metadata.models import meta_classnames as metadata_classnames

    ordered_classes_tuple = (
        ("section", lambda: np.random.randint(5, 50)),
        ("property", lambda: np.random.randint(30, 200)),
        ("value", lambda: np.random.randint(50, 500)),
    )

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

                    if field.__class__ in RANDOM_VALUES.keys():
                        if attr in required or random.choice([True, False]):
                            # if not required, 50% to set None
                            value = RANDOM_VALUES[ field.__class__ ](obj_type, field, user)
                            if hasattr(field, 'max_length') and field.max_length:
                                value = value[ : field.max_length - 1 ]
                            params[ attr ] = value

                params[ 'owner' ] = user
                obj = cls.objects.create( **params )

    # now need to connect data and metadata
    from neo_api.models import *

    # 1. TAGGING
    for user in users:
        for i in xrange( np.random.randint(5, 10) ): # number of TAG operations
            # randomly select a few values
            values = Value.objects.filter( owner=user )
            rvalues = []
            for v in xrange( np.random.randint( 1, max(5,len(values)) ) ):
                rvalues.append( random.choice( values ) )

            # randomly select some NEO class
            obj_type = random.choice( neo_classnames.keys() )
            cls = neo_classnames[ obj_type ]
            neo = cls.objects.filter( owner=user )
            rneo = []
            for v in xrange( np.random.randint( 1, min(5,len(neo)) ) ):
                rneo.append( random.choice( neo ) )

            # TAG random NEO objects with random values
            cls.save_changes( rneo, {}, {"metadata": [v.pk for v in rvalues]}, {}, False )

    # 2. Section - Block connections
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
BLOCK #5. SHARING

Sharing of some random objects?
"""

if __name__ == '__main__':
    load_data()
