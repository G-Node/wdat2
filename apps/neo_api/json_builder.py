from meta import meta_attributes, meta_data_attrs, meta_children, meta_parents
from datetime import datetime


def clean_attr(_attr):
    """
    By default attribute names in meta contain prefix "_" to indicate whether an 
    attribute is mandatory. This needs to be cleaned up before assigning to the
    NEO object.
    """
    if _attr.startswith("_"): return _attr[1:]
    return _attr


def assign_attrs(json, obj):
    """
    Assigns attibutes from NEO to json object for later HTTP response.
    """
    json["size"] = getattr(obj, "size")
    for _attr in meta_attributes[obj.obj_type]:
        attr = clean_attr(_attr)
        value = getattr(obj, attr)
        if type(value) == type(datetime.now()):
            value = str(value) # datetime is not JSON serializable
        json[attr] = value
        if hasattr(obj, attr + "__unit"):
            json[attr + "__unit"] = getattr(obj, attr + "__unit")
    return True # we assume object always has a "size" attribute


def assign_data_arrays(json, obj, **params):
    """
    Assigns data-related attrs from NEO to json object for later HTTP response.
    """
    assigned = False
    if meta_data_attrs.has_key(obj.obj_type):
        for arr in meta_data_attrs[obj.obj_type]:
            if arr == "waveforms":
                array = []
                for wf in obj.waveform_set.all():
                    w = {
                        "channel_index": wf.channel_index,
                        "waveform": {
                            "data": wf.waveform,
                            "units": wf.waveform__unit
                        }
                    }
                    if obj.obj_type == "spiketrain":
                        w["time_of_spike"] = {
                            "data": wf.time_of_spike_data,
                            "units": wf.time_of_spike__unit
                        }
                    array.append(w)
            else:
                if arr == "signal" and params:
                    data = obj.get_slice(**params)
                else: data = getattr(obj, arr)
                array = {"data": data, "units": getattr(obj, arr + "__unit")}
            json[arr] = array
        assigned = True
    return assigned
    

def assign_parents(json, obj):
    """
    Assigns parents from NEO to json object for later HTTP response.
    """
    assigned = False
    obj_type = obj.obj_type
    if meta_parents.has_key(obj_type):
        if obj_type == "unit":
            ids = []
            r = meta_parents[obj_type][0]
            parents = getattr(obj, r).all()
            for p in parents:
                ids.append(p.neo_id)
            json[r] = ids
        else:
            for r in meta_parents[obj_type]:
                parent = getattr(obj, r)
                if parent:
                    json[r] = parent.neo_id
                else:
                    json[r] = None
        assigned = True
    return assigned


def assign_children(json, obj):
    """
    Assigns children from NEO to json object for later HTTP response.
    """
    assigned = False
    obj_type = obj.obj_type
    if meta_children.has_key(obj_type):
        for r in meta_children[obj_type]:
            ch = [o.neo_id for o in getattr(obj, r + "_set").all()]
            json[r] = ch
        assigned = True
    return assigned

def assign_common(json, obj):
    """
    Assigns common information from NEO to json object for later HTTP response.
    """
    json["author"] = obj.author.username
    json["date_created"] = str(obj.date_created)


