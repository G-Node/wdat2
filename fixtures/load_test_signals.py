""" 
This script creates test data for core apps of the NeuREST.

This script is independent from the test data located at fixtures inside django 
apps. As opposed to fixtures for UnitTests, where small number of test objects 
needed to allow tests run faster, this script is designed for API clients and
in practice creates significant amount of different objects with relatively high
amount of signal data.
"""

import sys
import os
import settings
import django_access

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
        user = User.objects.create_user( username, password = 'pass' )
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
n = 3 # number of files for every length option

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
This code creates a simple test NEO structure: a block, a segment (if there 
aren't any) and several random analogsignals. Use it if you need some test 
signal data for any purposes.
"""

from neo_api.models import *


def init_block( u ):
    """ creates block and segment, if they do not exist """
    bls = Block.objects.filter( owner = u )
    if not bls:
        b = Block.objects.create( name = "pvc-5", owner = u )
    else:
        b = bls[0]

    return b

b = init_block( u )

segs = Segment.objects.filter( owner = u, block=b )
s = Segment.objects.create( owner=u, name="Random signals, trial %d" % len(segs), block=b )

# create 10 AnalogSignals
for i in range(10):
    size = 5 * 10**5

    # step 1. create file with array data
    path = "data/%d_array.h5" % i
    arr = np.random.rand( size )
    create_file_with_array( path, arr )

    # step 2. create Datafile
    d = Datafile.objects.create( title = path, owner = u, file_type=5, \
        raw_file = path )

    # step 3. create AnalogSignal
    update_kwargs = {
        "name": "R. LFP Signal, #%d, size %d" % ( i, size ),
        "t_start": 0.0,
        "t_start__unit": 's',
        "sampling_rate": 20000,
        "sampling_rate__unit": 'Hz',
        "signal__unit": 'mV',
        "segment": s,
        "signal": d,
        "owner": u
    }
    AnalogSignal.objects.create( **update_kwargs )

    print "%d signal created." % i


# what the hell are these things here?
#factor = factor_options.get("%s%s" % (a.t_start__unit.lower(), a.sampling_rate__unit.lower()), 1.0)
#start_time = float( "7440.898345153524" )
#s_index = int(round(a.sampling_rate * (start_time - a.t_start) * factor))
