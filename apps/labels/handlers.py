from labels.models import Label
from rest.meta import meta_objects
from neo_api.models import meta_classnames

class LabelHandler(CategoryHandler):

    @auth_required
    def __call__(self, request, *args, **kwargs):
        """ POST/PUT - bind NEO objects with odML values, DELETE - remove bindings.
        Existing bindings are ignored with POST/PUT. """

        actions = ('PUT', 'POST', 'DELETE')
        if not request.method in actions:
            return NotSupported(message_type="invalid_method", request=request)

        labels = []
        try:
            rdata = json.loads(request._get_raw_post_data())
            assert type(rdata) == type({})
            assert rdata.has_key('values')
            values = rdata['values']
            for value_id in values:
                value = Value.objects.get(id=value_id)
                if not value.is_editable(request.user):
                    raise ReferenceError("You are not authorized to edit this value: %s" % value.id)
                for obj_type in meta_objects:
                    if rdata.has_key[obj_type]:
                        assert type(rdata[obj_type]) == type([])
                        for obj_id in rdata[obj_type]:
                            obj = meta_classnames[obj_type].objects.get(id=obj_id)
                            if not obj.is_editable(request.user):
                                raise ReferenceError("You are not authorized to edit this %s: %s" % (obj.obj_type, obj.id))
                            iterator = Label.objects.filter(odml_value=value, neo_id=obj.id, \
                                neo_type=obj.obj_type, owner=request.user)
                            for l in iterator:
                                if request.method == 'POST' or request.method == 'PUT': 
                                    l = Label(value, obj.id, obj.obj_type, owner=request.user)
                                labels.append(l)

            for l in labels: # implemented as transaction 
                if request.method == 'POST' or request.method == 'PUT': 
                    l.save()
                elif request.method == 'DELETE':
                    l.delete_object()
        except AssertionError:
            return BadRequest(message_type="data_parsing_error", request=request)
        except ObjectDoesNotExist, e:
            return BadRequest(json_obj={"details": e.message}, \
                message_type="does_not_exist", request=request)
        except ReferenceError, e:
            return Unauthorized(json_obj={"details": e.message}, \
                message_type="not_authorized", request=request)
        except ValueError:
            return BadRequest(message_type="data_parsing_error", request=request)

        response = {'labels processed': len(labels)}
        return BasicJSONResponse(response, message_type="processed", request=request)


