import sys
sys.path.append( "/opt/versioned" )

import django_access
from neo.io.hdf5io import NeoHdf5IO
from neo_api.models import *
from settings_to_load import *
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

b, s = init_containers( u )

new_rcg = RecordingChannelGroup.objects.create( name = rcg.name, block = b, \
    owner = u )

for i in rcg.channel_indexes:
    if not i == 2:
        rc = RecordingChannel.objects.create( name = rcg.channel_names[i], \
            index = i, recordingchannelgroup = new_rcg, owner = u )

        unit = Unit.objects.create( name = rcg.channel_names[i], owner = u )
        unit.recordingchannel.add( rc )

        st = sts[i]
        times = [ float( w ) for w in st.times.tolist() ]
        new = SpikeTrain.objects.create( times = times, owner = u, unit = unit,\
            t_start = float( st.t_start ), t_start__unit = 's', \
            t_stop = float( st.t_stop ), t_stop__unit = 's', segment = s )
        print st.name + ": completed."

print "NEO object structure created.."
