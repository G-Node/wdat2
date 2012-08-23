import sys
sys.path.append( "/opt/versioned" )
import django_access

import os
import settings
import numpy as np
import tables as tb

from neo_api.models import *
from datafiles.models import Datafile
from settings_to_load import *
from common import init_block
from settings import FILE_MEDIA_ROOT
print "imports completed.."

# get the appropriate user
from django.contrib.auth.models import User
u = User.objects.get(username = username)

# create a structure
print "uploading data.."

b = init_block( u )

segs = Segment.objects.filter( owner = u, block=b )
s = Segment.objects.create( owner=u, name="Random signals, trial %d" % len(segs), block=b )


def create_file_with_array( path, size ):
    """ create test file with array data. can be further used to create any
    data-related objects, like signals, spiketrains etc. size - int """
    fullpath = os.path.join(FILE_MEDIA_ROOT, path)
    a = np.random.rand( size )
    if not os.path.exists(fullpath):
        with tb.openFile(fullpath, "a") as f:
            f.createArray("/", "Random array, size: %d" % a.size, a)

# create 10 AnalogSignals
for i in range(10):
    size = 5 * 10**5

    # step 1. create file with array data
    path = "data/%d_array.h5" % i
    create_file_with_array( path, 5 * 10**5 )

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
