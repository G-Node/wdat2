from rest.serializers import serialize, deserialize
from rest.common import *

class RESTMachine(object):
    """
    An abstract class that implements basic REST API functions like get single 
    object, get list of objects, create, update and delete objects.
    """
    self.model = None # required, set up in a parent class
    self.list_filters = { # this is a full list, overwrite in a parent class
        'top': top_filter,
        'section_id': parent_section_filter,
        'visibility': visibility_filter,
        'owner': owner_filter,
        'created_min': created_min_filter,
        'created_max': created_max_filter,
    }
    self.assistant = {} # to store some params for serialization/deserial.

    def get_obj_etag(self, request, obj_id):
        """ computes etag for object: for the moment it is just the hash of 
        last modified """
        try:
            obj = self.model.objects.get(id = obj_id)
            return hashlib.md5(str(obj.last_modified)).hexdigest()
        except ObjectDoesNotExist:
            return None

    def get_obj_lmodified(self, request, obj_id):
        """ returns last modified """
        try:
            obj = self.model.objects.get(id = obj_id)
            return obj.last_modified
        except ObjectDoesNotExist:
            return None

    @condition(etag_func=get_obj_etag, last_modified_func=get_obj_lmodified)
    @auth_required
    def handle_object(self, request, obj_id):
        """
        GET: get, PUT/POST: update, DELETE: delete single NEO object. Serves 
        partial data requests (info, data etc.) using GET params.

        request: incoming HTTP request
        obj_id: ID of the object from request URL
        """
        actions = {
            'GET': self.get,
            'PUT': self.create_or_update,
            'POST': self.create_or_update,
            'DELETE': self.delete}
        if request.method in actions.keys():
            try: # check the object exists
                obj = self.model.objects.get(id=obj_id)
            except ObjectDoesNotExist:
                return BadRequest(message_type="does_not_exist", request=request)
            if not obj.is_accessible(request.user): # security check
                return Unauthorized(message_type="not_authorized", request=request)
            response = actions[request.method](request, obj)
        else:
            response = NotSupported(message_type="invalid_method", request=request)
        return response

    @auth_required
    def handle_category(self, request):
        """ 
        GET: query all objects, PUT/POST: create new, copy.

        request: incoming HTTP request
        """
        actions = {
            'GET': self.get_list,
            'PUT': self.create_or_update,
            'POST': self.create_or_update}
        if request.method in actions.keys():
            return actions[request.method](request)
        return NotSupported(message_type="invalid_method", request=request)


    def get(self, request, obj):
        """ retrieve and serialize single object """
        resp_data = serialize(get_serial_type(request), [obj], \
            request.GET, ensure_ascii=False) # type(resp_data) == json (list)
        return BasicJSONResponse(resp_data, "retrieved", request)

    def get_list(self, request):
        """ returns requested objects list """
        message_type = "no_objects_found"
        start_index, max_results = 0, 1000 # default
        try: # assert GET parameters
            params = {} # a dict to later filter requested data
            for k, v in request.GET.items():
                if k in request_params_cleaner.keys() and request_params_cleaner.get(k)(v):
                    params[str(k)] = request_params_cleaner.get(k)(v)
        except (ObjectDoesNotExist, ValueError, IndexError), e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="wrong_params", request=request)
        # pre- filters
        objects = filter(lambda s: s.is_accessible(request.user), self.model.objects.all())
        objects_total = len(objects)
        # model-dependent filters
        for filter_name in self.list_filters:
            if filter_name in params.keys() and objects:
                filter_func = get_filter_by_name(filter_name)
                objects = filter_func(objects, params[filter_name], request.user)
        # post- filters
        if "start_index" in params.keys() and params["start_index"] < \
            len(objects) and objects:
            start_index = params["start_index"]
        objects = objects[start_index:]
        if "max_results" in params.keys() and params["max_results"] < \
            len(objects) and objects:
            max_results = params["max_results"]
        objects = objects[:max_results]
        resp_data = {
            "objects_total": objects_total,
            "objects_selected": len(objects),
            "selected_range": [start_index, start_index + len(objects)],
        }
        if objects:
            message_type = "object_selected"
            resp_data["selected"] = serialize(get_serial_type(request), \
                objects, ensure_ascii=False))
        else:
            resp_data["selected"] = None
        return BasicJSONResponse(resp_data, message_type, request)


    def create_or_update(self, request, obj=None):
        """
        We "boycott" everything "that's not made by our hands" for security and
        practical reasons (no automatic JSON parsing into an object). Create and
        update have very similar functionality thus implemented as one function.
        """
        to_link, parents = None, None # handlers for specials (waveforms, units)
        try:
            rdata = json.loads(request._get_raw_post_data())
        except ValueError:
            return BadRequest(message_type="data_parsing_error", request=request)

        if not type(rdata) == type({}) or not hasattr(rdata, 'fields'):
            return BadRequest(message_type="data_parsing_error", request=request)

        if obj:
            update = True
            if not obj.is_editable(request.user): # method should exist, ensure
                return Unauthorized(message_type="not_authorized", request=request)
        else:
            update = False
            obj = self.model() # create object skeleton
            if hasattr(obj, "author"):
                obj.author = request.user
            else:
                obj.owner = request.user

        # processing attributes
        for field_name, field_value in rdata['fields'].iteritems():
            if isinstance(field_value, str):
                field_value = smart_unicode(field_value, options.get("encoding", settings.DEFAULT_CHARSET), strings_only=True)

            field = Model._meta.get_field(field_name)

            # Handle special fields
            if self.is_special_field(field_name, field_value): # every model can have special fields
                self.process_special_field(self, obj, field_name, field_value)

            # Handle M2M relations TODO

            # Handle FK fields (taken from django.core.Deserializer)
            elif field.rel and isinstance(field.rel, models.ManyToOneRel):
                if field_value is not None:
                    if hasattr(field.rel.to._default_manager, 'get_by_natural_key'):
                        if hasattr(field_value, '__iter__'):
                            relativ = field.rel.to._default_manager.db_manager(db).get_by_natural_key(*field_value)
                            value = getattr(relativ, field.rel.field_name)
                            # If this is a natural foreign key to an object that
                            # has a FK/O2O as the foreign key, use the FK value
                            if field.rel.to._meta.pk.rel:
                                value = value.pk
                        else:
                            value = field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value)
                        setattr(obj, field.attname, value)
                    else:
                        setattr(obj, field.attname, \
                            field.rel.to._meta.get_field(field.rel.field_name).to_python(field_value))
                else:
                    setattr(obj, field.attname, None)

            # Handle data/units fields
            elif self.is_data_field(field_name, field_value): # process data field (with units)
                try: # for data parsing see class methods / decorators
                    setattr(obj, field_name, field_value["data"])
                    setattr(obj, field_name + "__unit", value["unit"])
                except ValueError, v:
                    return BadRequest(json_obj={"details": v.message}, \
                        message_type="bad_float_data", request=request)
            else:
                setattr(obj, field_name, field.to_python(field_value))

        try: # catch exception if any of values provided do not match
            obj.full_clean()
        except ValidationError, VE:
            return BadRequest(json_obj=VE.message_dict, \
                message_type="bad_parameter", request=request)

        obj.save() # processing (almost) done

        self.run_post_processing(obj) # again, for some special cases

        if update:
            request.method = "GET"
            #request.GET["q"] = "info"
            return self.get(request, obj)
        return Created(message_type="object_created", request=request)


    def delete(self, request, obj):
        """ delete (archive) provided object """
        if obj.is_editable(request.user): # method should exist, ensure
            obj.delete_object()
            return BasicJSONResponse(message_type="deleted", request=request)
        else:
            return Unauthorized(message_type="not_authorized", request=request)

    def get_filter_by_name(filter_name):
        return self.list_filters[filter_name]

    def is_data_field(self, attr_name, value):
        """ determines if a given field has units and requires special proc."""
        if type(value) == type({}) and value.has_key("data") and \
            value.has_key("unit"):
            return True
        return False

    def is_special_field(self, attr_name, value):
        """ abstract method. determines if a field has a special shape """
        return False

    def process_special_field(self, obj, attr_name, value):
        """ abstract method. use to process special shapes of some fields """
        raise NotImplementedError("This is an abstract method. Please define it\
            in a parent class.")

    def run_post_processing(self, obj):
        pass

# FILTERS ----------------------------------------------------------------------

def top_filter(objects, value, user):
    """ for hierarchical models, returns the top of the hierarchy """
    objects = None
    if value == "owned":
        return objects.filter(owner=user, parent_section=None)
    if value == "shared":
        """ top shared objects for a given user. if a section's direct 
        parent is not shared, a section displays on top of the tree. """
        shared_objects = filter(lambda s: s.is_accessible(user) and not s.owner==user, objects)
        objects = filter(lambda s: s.parent_section not in shared_objects, shared_objects) 
    return objects

def parent_section_filter(objects, value, user=None):
    """ returns objects in a particular section """
    return objects.filter(parent_section=value)

def visibility_filter(objects, value, user):
    """ filters public / private / shared """
    if value == "private":
        return filter(lambda s: s.current_state==3, objects)
    if value == "public":
        return filter(lambda s: s.current_state==1, objects)
    if value == "shared":
        return filter(lambda s: not s.owner==user, objects)

def owner_filter(objects, value, user):
    """ objects belonging to a specific user """
    return filter(lambda s: not s.owner==value, objects)

def created_min_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created > value, objects)

def created_max_filter(objects, value, user):
    """ date created filter """
    return filter(lambda s: s.date_created < value, objects)


