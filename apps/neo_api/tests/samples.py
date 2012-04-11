# 1
block = {
    "name": "Block of recordings from May, 10",
    "filedatetime": "2011-10-05",
    "index": 1}

# 2
segment = {
    "name": "Trial 1",
    "filedatetime": "2011-10-07",
    "index": 1,
    "block": "1"}

# 3
eventarray = {
    "segment": "1"}

# 4
event = {
    "time": {
        "data": 7.22,
        "units": "ms"
    },
    "label": "Stimuli end",
    "segment": "1",
    "eventarray": "1"}

# 5
epocharray = {
    "segment": "1"}

# 6
epoch = {
    "time": {
        "data": 78.22,
        "units": "ms"
    },
    "duration": {
        "data": 0.35,
        "units": "ms"
    },
    "label": "Displaying blue screen",
    "segment": 1,
    "epocharray": 1}

# 7
recordingchannelgroup = {
    "name": "Tethrode #5",
    "block": 1}

# 8
recordingchannel = {
    "name": "Electrode #1",
    "index": 1,
    "recordingchannelgroup": 1}

# 9
unit = {
    "name": "Neuron 34.56 x 28.8 x 245.69",
    "recordingchannel": [
        "1"
    ]}

# 10
analogsignalarray = {
    "segment": "1"}

# 11
analogsignal = {
    "name": "AS-1",
    "sampling_rate": {
        "data": 20000,
        "units": "Hz"
    },
    "t_start": {
        "data": 0.0,
        "units": "ms"
    },
    "signal": {
        "units": "mV", 
        "data": [12.2, 12.7, 19.0, 7.81, 3.42, 9.28, -5.86]
    },
    "segment": 1,
    "recordingchannel": 1}

# 12
irsaanalogsignal = {
    "name": "ISAS-1",
    "t_start": {
        "data": -200.0,
        "units": "ms"
    },
    "signal": {
        "units": "mV", 
        "data": [12.2, 12.7, 19.0, 7.81, 3.42, 9.28, -5.86]
    },
    "times": {
        "units": "ms", 
        "data": [155.0, 158.0, 160.0, 161.0, 162.0, 165.0, 168.0]
    },
    "segment": 1,
    "recordingchannel": 1}

# 13
spike = {
    "time": {
        "data": 300.0,
        "units": "ms"
    },
    "sampling_rate": {
        "data": 20.0,
        "units": "kHz"
    },
    "left_sweep": {
        "data": 15.0,
        "units": "ms"
    },
    "segment": 1,
    "unit": 1}

# 14
spiketrain = {
    "t_start": {
        "data": -400.0,
        "units": "ms"
    },
    "t_stop": {
        "data": 800.0,
        "units": "ms"
    },
    "times": {
        "units": "ms", 
        "data": [-4.88, 3.42, 2.44]
    },
    "segment": 1,
    "unit": 1
}

# 15
waveform = {
    "channel_index": 0,
    "time_of_spike": {
        "units": "ms",
        "data": 469.1
    },
    "waveform": {
        "units": "mV", 
        "data": [5.86, -1.46, -0.488, -7.32, -9.77, -12.7, -12.7]
    },
    "spiketrain": 1,
    "spike": 1,
}

sample_objects = {
    "block": block,
    "segment": segment,
    "event": event,
    "eventarray": eventarray,
    "epoch": epoch,
    "epocharray": epocharray,
    "unit": unit,
    "spiketrain": spiketrain,
    "analogsignal": analogsignal,
    "analogsignalarray": analogsignalarray,
    "irsaanalogsignal": irsaanalogsignal,
    "spike": spike,
    "recordingchannelgroup": recordingchannelgroup,
    "recordingchannel": recordingchannel
}
