import sys, os
sys.path.append( "/opt/versioned" )

import django_access
import numpy as np
import tables as tb
from neo_api.models import *
from settings import FILE_MEDIA_ROOT

def init_block( u ):
    """ creates block and segment, if they do not exist """
    bls = Block.objects.filter( owner = u )
    if not bls:
        b = Block.objects.create( name = "pvc-5", owner = u )
    else:
        b = bls[0]

    return b

def create_file_with_array( lpath, data_as_list ):
    """ create test file with array data. can be further used to create any
    data-related objects, like signals, spiketrains etc. """
    fullpath = os.path.join(FILE_MEDIA_ROOT, lpath)
    a = np.array( data_as_list )
    if os.path.exists(fullpath):
        os.remove( fullpath )
    with tb.openFile(fullpath, "a") as f:
        f.createArray("/", "Signal, size: %d" % a.size, a)
