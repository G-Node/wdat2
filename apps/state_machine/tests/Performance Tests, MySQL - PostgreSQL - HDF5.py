# common test functions --------------------------------------------------------

import numpy as np
import django_access
from neo_api.models import SignalData

def createsignal(count, data):
    for i in range(count):
        s = SignalData(data=data)
        s.save()

def together(start, end, ids=[ i+1 for i in range(10) ] ):
    qs = SignalData.get_slice(ids=ids, start=start, end=end)
    for i in qs:
        print i.id # just do some output

def onebyone(start, end, ids=[ i+1 for i in range(10) ] ):
    for i in ids:
        o = SignalData.get_slice(ids=[ i ], start=start, end=end)
        a = o[0].id


# PosgtreSQl Arrays testing ----------------------------------------------------

# insert tests

data = np.random.rand(1000000).tolist()
%timeit createsignal(10, data)
# 1 loops, best of 3: 39.3 s per loop

data = np.random.rand(100000).tolist()
%timeit createsignal(10, data)
# 1 loops, best of 3: 3.77 s per loop

data = np.random.rand(10000).tolist()
%timeit createsignal(10, data)
# 1 loops, best of 3: 539 ms per loop


# [100000, 200000] - 7 812.5 MB slice ??

%timeit together(100000, 200000)
# 1 loops, best of 3: 1.76 s per loop

%timeit onebyone(100000, 200000, ids=[ i+21 for i in range(10) ])
# 1 loops, best of 3: 1.99 s per loop

%timeit onebyone(0, 100000, ids=[ i+61 for i in range(10) ])
# 1 loops, best of 3: 1.87 s per loop

# [100000, 120000] - 1 562.5 MB slice

%timeit together(100000, 120000)
# 1 loops, best of 3: 405 ms per loop

%timeit onebyone(100000, 120000, ids=[ i+21 for i in range(10) ])
# 1 loops, best of 3: 469 ms per loop

%timeit onebyone(0, 20000, ids=[ i+61 for i in range(10) ])
# 1 loops, best of 3: 359 ms per loop


# MySQL text field testing -----------------------------------------------------

# test create signals

data = np.random.rand(1000000).tolist()
%timeit createsignal(10, data)
# OperationalError: (1153, "Got a packet bigger than 'max_allowed_packet' bytes")
# reconfigured to accept up to 32MB packet size

%timeit createsignal(10, data)
# 1 loops, best of 3: 36 s per loop

data = np.random.rand(100000).tolist()
%timeit createsignal(10, data)
# 1 loops, best of 3: 4.43 s per loop

data = np.random.rand(10000).tolist()
%timeit createsignal(10, data)
# 1 loops, best of 3: 260 ms per loop


# test retrieving signals
# we need to get the whole signal, as slicing is not supported in text fields


# [100000, 200000] - 2.67 MB slice

%timeit together(100000 * 14, 200000 * 14, ids=[ i + 71 for i in range(10) ])
# 1 loops, best of 3: 451 ms per loop

%timeit onebyone(100000 * 14, 200000 * 14, ids=[ i + 71 for i in range(10) ])
# 1 loops, best of 3: 367 ms per loop

%timeit onebyone(0 * 14, 100000 * 14, ids=[ i + 145 for i in range(10) ])
# 10 loops, best of 3: 8.92 ms per loop

# [100000, 120000] - 1.602 MB slice (how come??)

%timeit together(100000 * 14, 120000 * 14, ids=[ i + 71 for i in range(10) ])
# 1 loops, best of 3: 312 ms per loop

%timeit onebyone(100000 * 14, 120000 * 14, ids=[ i + 71 for i in range(10) ])
# 1 loops, best of 3: 289 ms per loop

%timeit onebyone(0 * 14, 20000 * 14, ids=[ i + 145 for i in range(10) ])
# 10 loops, best of 3: 8.36 ms per loop


# HDF5 tests -------------------------------------------------------------------

import numpy as np
import django_access
from neo_api.models import SignalHDF5

def createhdf5(count, data):
    for i in range(count):
        s = SignalHDF5(path='/tmp/temp.h5')
        s.save(data=data)

def onebyone(start, end, ids=[ i+1 for i in range(10) ] ):
    o = SignalHDF5.get_slice(ids=ids, start=start, end=end)
    print "objects retrieved: ", len(o)


data = np.random.rand(1000000).tolist()
%timeit createhdf5(10, data)
# 1 loops, best of 3: 1.65 s per loop


data = np.random.rand(100000).tolist()
%timeit createhdf5(10, data)
# 1 loops, best of 3: 210 ms per loop


data = np.random.rand(10000).tolist()
%timeit createhdf5(10, data)
# 1 loops, best of 3: 81.7 ms per loop



# test retrieving signals
# we need to get the whole signal, as slicing is not supported in text fields


# [100000, 200000] - ?? MB slice

%timeit onebyone(100000, 200000, ids=[ i + 10 for i in range(10) ])
# 1 loops, best of 3: 276 ms per loop

%timeit onebyone(0, 100000, ids=[ i + 45 for i in range(10) ])
# 1 loops, best of 3: 273 ms per loop


# [100000, 120000] - ?? MB slice (how come??)

%timeit onebyone(100000, 120000, ids=[ i + 10 for i in range(10) ])
# 10 loops, best of 3: 83.2 ms per loop

%timeit onebyone(0, 20000, ids=[ i + 110 for i in range(10) ])
# 10 loops, best of 3: 60.8 ms per loop







