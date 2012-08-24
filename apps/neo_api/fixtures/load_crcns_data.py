"""
This script reads the HDF5 file with CRCNS data (by J. Teeters), stored in the
NEO format. In line with the data read, the appropriate objects are created 
using the local object model.
"""


import os, sys
path = os.path.abspath(os.path.dirname(__file__))
sys.path.append(path[:path.find("apps/neo_api/fixtures")])

import django_access
from neo.io.hdf5io import NeoHdf5IO
from neo_api.models import *
from settings_to_load import *
from common import *
from datetime import datetime
from datafiles.models import Datafile
print "imports completed.."


# read the NEO data
iom = NeoHdf5IO( path_to_crcns )
bl = iom.get()
sts = bl.segments[0].spiketrains
rcg = bl.recordingchannelgroups[0]
print "initial data extracted.."

# get the appropriate user
from django.contrib.auth.models import User
u = User.objects.get(username = username)

# create a structure
print "uploading data.."

b = init_block( u )

segs = Segment.objects.filter( owner = u, block=b )
s = Segment.objects.create( owner=u, name="CRCNS dataset", block=b )

new_rcg = RecordingChannelGroup.objects.create( name = rcg.name, block = b, \
    owner = u )

for i in rcg.channel_indexes:
    if not i == 2:
        # step 1. create RC
        rc = RecordingChannel.objects.create( name = rcg.channel_names[i], \
            index = i, recordingchannelgroup = new_rcg, owner = u )

        # step 2. create Unit
        unit = Unit.objects.create( name = rcg.channel_names[i], owner = u )

        # step 3. create an m2m connection
        now = datetime.now()
        urc = unit_recordingchannel()
        urc.date_created = now
        urc.unit_id = unit.local_id
        urc.recordingchannel_id = rc.local_id 
        urc.save()

        # step 4. create Spiketrain
        st = sts[i]
        times = [ float( w ) for w in st.times.tolist() ]
        lpath = "data/%d_crcns.h5" % i
        create_file_with_array( lpath, times )
        times = []
        d = Datafile.objects.create( title = lpath, owner = u, file_type=5, \
            raw_file = lpath )

        size = len(times) * 4
        update_kwargs = {
            "t_start": float( st.t_start ),
            "t_start__unit": 's',
            "t_stop": float( st.t_stop ),
            "t_stop__unit": 's',
            "times": d,
            "times__unit": 's',
            "segment": s,
            "owner": u,
            "unit": unit,
        }

        new = SpikeTrain.objects.create( **update_kwargs )
        print st.name + ": completed."

print "NEO object structure created.."



