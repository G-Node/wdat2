from django.http import HttpResponse
from meta import meta_messages
try:
    import json
except ImportError:
    import simplejson as json

#===============================================================================
# here we implement REST API supporting functions

class BasicJSONResponse(HttpResponse):
    """
    This is a JSON response class, which expects a python dict from which it 
    will pickle a response. Sets up an appropriate Cont-Type. User and Message 
    always appreciated.
    """
    def __init__(self, json_obj={}, message_type=None, request=None):
        if request: 
            if request.user: json_obj["logged_in_as"] = request.user.username
        if message_type:
            json_obj["message_type"] = message_type
            json_obj["message"] = meta_messages[message_type]
        super(BasicJSONResponse, self).__init__(json.dumps(json_obj))
        self['Content-Type'] = "application/json"
        self['G-Node-Version'] = "1.0"

class Created(BasicJSONResponse):
    status_code = 201

class BadRequest(BasicJSONResponse):
    status_code = 400

class Unauthorized(BasicJSONResponse):
    status_code = 401

class NotFound(BasicJSONResponse):
    status_code = 404

class NotSupported(BasicJSONResponse):
    status_code = 405

def auth_required(func):
    """
    Decorator for views where authentication required. 
    Returns HTTP 403 Unauthorized if user is not authenticated.
    """
    argnames = func.func_code.co_varnames[:func.func_code.co_argcount]
    fname = func.func_name
    def auth_func(*args, **kwargs):
        if not args[0].user.is_authenticated():
            return Unauthorized(message_type="not_authenticated")
        return func(*args, **kwargs)
    return auth_func

def get_serial_type(request):
    """ computes whether it's xml, json or other (not supported by API) """
    if "text/xml" in request.META["CONTENT_TYPE"]:
        return "xml"
    if "application/json" in request.META["CONTENT_TYPE"]:
        return "json"
    return "json" #FIXME should be None? fail requests with other types?



