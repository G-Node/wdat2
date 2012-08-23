# add performance testing!!

import os
import sys

path = os.path.abspath(os.path.dirname(__file__))
sys.path.append(path[:path.find("apps/neo_api/fixtures")])

import django_access
import unittest
import datetime as dte
import math
import numpy as np
import tables as tb
from neo_api.models import *
from django.contrib.auth.models import User
from common import init_block
from settings_to_load import *
from settings import FILE_MEDIA_ROOT

meta_channels = [1, 2, 4, 5, 6, 9, 10, 11, 12, 13, 14, 16]

def convert_to_timeseries(line):
    """
    Converts a string of floats into a list. 
    """
    s = line.split(" ")
    for i in range(s.count('')):
        s.remove('')
    return s


def create_thomas():
    """
    This function creates NEO objects using Django ORM. It requires initial data
    in files, located in the same folder
    - lfp_fix080707.dat
    - lfp_sac080707.dat
    Normally, one can find these files at 
    gate.g-node.org:/groups/g-node-core/data/spike_lfp/
    """
    u = User.objects.get(username = username)
    b = Block.objects.create( owner=u, name="Block with Dr. Wachtler recordings, 2009" )

    # processing LFP FIX
    ids = []
    r_ids = []
    flag = math.floor(176*12/10)
    f = open(path_to_wachtler + '/lfp_fix080707.dat', 'r')

    for i, l in enumerate(f):
        if i < 176:
            s = Segment.objects.create( owner=u, \
                name="V1 FIX signals, trial %d" % i, block=b )
            ids.append( s.local_id )
        else:
            s = Segment.objects.get( local_id = ids[ int(math.fmod(i, 176)) ] )

        if float(i)/176 == math.floor(float(i)/176):
            # create new recording channel
            r = RecordingChannel.objects.create( name = "Channel %d" % \
                meta_channels[int(math.floor(float(i)/176))], index = meta_channels[int(math.floor(float(i)/176))],\
                owner = u)
            r_ids.append( r.local_id )

        # creating analogsignal
        ts = convert_to_timeseries(l)
        a = new_signal(i, "FIX", s, r, ts, u)
        # every 10% of file processed
        if float(i)/flag == math.floor(float(i)/flag):
            print "%s percent of LFP FIX processed." % int(math.floor(float(i)/flag) * 10)
    f.close()

    # processing LFP SAC
    ids = []
    flag = math.floor(368*12/10)
    f = open(path + '/lfp_sac080707.dat', 'r')
    for i, l in enumerate(f):
        if i < 368:
            # create new segment
            s = Segment.objects.create( owner=u, \
                name="V1 SAC signals, trial %d" % i, block=b )
            ids.append( s.local_id )
        else:
            s = Segment.objects.get( local_id = ids[ int(math.fmod(i, 176)) ] )
        if float(i)/368 == math.floor(float(i)/368):
            # get the recording channel
            r = RecordingChannel.objects.get( local_id=r_ids[ int(math.floor(float(i)/368)) ] )
        ts = convert_to_timeseries(l)
        a = new_signal(i, "SAC", s, r, ts, u)
        # every 10% of file processed
        if float(i)/flag == math.floor(float(i)/flag):
            print "%s percent of LFP SAC processed." % int(math.floor(float(i)/flag) * 10)
    f.close()
    print "Data imported successfully. Bye."


def new_signal(i, typ, s, r, ts, u):
    def create_file_with_array( lpath, data_as_list ):
        fullpath = os.path.join(FILE_MEDIA_ROOT, lpath)
        a = np.array( data_as_list )
        if os.path.exists(fullpath):
            os.remove( fullpath )
        with tb.openFile(fullpath, "a") as f:
            f.createArray("/", "LFP V1, size: %d" % a.size, a)

    # step 1. create file with array data
    lpath = "data/%d_array.h5" % i
    create_file_with_array( lpath, ts )

    # step 2. create Datafile
    d = Datafile.objects.create( title = lpath, owner = u, file_type=5, \
        raw_file = lpath )

    # step 3. create AnalogSignal
    size = len(ts) * 4
    update_kwargs = {
        "name": "LFP %s Signal-%d, size: %d" % (typ, i, size),
        "t_start": 0.0,
        "t_start__unit": 'ms',
        "sampling_rate": 20000,
        "sampling_rate__unit": 'hz',
        "signal__unit": 'mv',
        "signal_size": size,
        "segment": s,
        "signal": d,
        "recordingchannel": r,
        "owner": u,
    }
    a = AnalogSignal.objects.create( **update_kwargs )
    return a


if __name__ == '__main__':
    create_thomas()



