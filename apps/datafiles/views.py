from django.utils import simplejson
from django.core.exceptions import ObjectDoesNotExist
from rest.management import BaseHandler, ACLHandler, process_REST
from rest.serializers import Serializer
from rest.common import *

from datafiles.models import Datafile
from datafiles.handlers import FileHandler, FileOperationsHandler
from datafiles.serializers import FileSerializer

def datafile(request, id, *args, **kwargs):
    return process_REST(request, id, handler=FileHandler(FileSerializer, Datafile), *args, **kwargs)

def acl(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ACLHandler(FileSerializer, Datafile), *args, **kwargs)

def datafile_list(request, *args, **kwargs):
    return process_REST(request, handler=FileHandler(FileSerializer, Datafile), *args, **kwargs)

def operations(request, id, *args, **kwargs):
    return process_REST(request, id, handler=FileOperationsHandler(FileSerializer, Datafile), *args, **kwargs)

def upload_progress(request):
    """
    Return JSON object with information about the progress of an upload.
    """
    if 'HTTP_X_PROGRESS_ID' in request.META:
        progress_id = request.META['HTTP_X_PROGRESS_ID']
        cache_key = "%s_%s" % (request.META['REMOTE_ADDR'], progress_id)
        data = cache.get(cache_key)
        json = simplejson.dumps(data)
        return BasicJSONResponse(json, message_type="processed", request=request)
    else:
        return BadRequest(message_type="x_progress_missing", request=request)


