import sys
sys.path.append( "/opt/versioned" )

import django_access
import numpy as np
from neo_api.models import *

def init_block( u ):
    """ creates block and segment, if they do not exist """

    bls = Block.objects.filter( owner = u )
    if not bls:
        b = Block.objects.create( name = "pvc-5", owner = u )
    else:
        b = bls[0]

    return b
