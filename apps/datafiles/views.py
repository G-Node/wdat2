from django.utils import simplejson
from django.core.exceptions import ObjectDoesNotExist
from rest.management import BaseHandler, ACLHandler, process_REST
from rest.serializers import Serializer
from rest.common import *

from datafiles.models import Datafile
from datafiles.tasks import extract_from_archive # broker tasks
from datafiles.handlers import FileHandler
from datafiles.serializers import FileSerializer

import mimetypes


def datafile(request, id, *args, **kwargs):
    return process_REST(request, id, handler=FileHandler(FileSerializer, Datafile), *args, **kwargs)

def acl(request, id, *args, **kwargs):
    return process_REST(request, id, handler=ACLHandler(FileSerializer, Datafile), *args, **kwargs)

def datafile_list(request, *args, **kwargs):
    return process_REST(request, handler=FileHandler(FileSerializer, Datafile), *args, **kwargs)


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


@auth_required
def download(request, id):
    """
    Processes requests for file download.
    An alternative way is to use xsendfile:
    #response = HttpResponse(mimetype='application/force-download')
    #response['Content-Disposition'] = 'attachment; filename=%s' % (datafile.title)
    """
    if not request.method == 'GET':
        NotSupported(message_type="invalid_method", request=request)
    try: # object exists?
        datafile = Datafile.objects.get(id=id)
    except ObjectDoesNotExist:
        return BadRequest(message_type="does_not_exist", request=request)
    if not datafile.is_accessible(request.user): # first security check
        return Unauthorized(message_type="not_authorized", request=request)
    mimetype, encoding = mimetypes.guess_type(datafile.raw_file.path)
    mimetype = mimetype or 'application/octet-stream' 
    response = HttpResponse(datafile.raw_file.read(), mimetype=mimetype)
    response['Content-Disposition'] = 'attachment; filename=%s' % (datafile.title)
    response['Content-Length'] = datafile.raw_file.size 
    if encoding: 
        response["Content-Encoding"] = encoding
    return response


@auth_required
def extract(request, id):
    """ Extract files/folders from the file if archive."""
    if not request.method == 'GET':
        NotSupported(message_type="invalid_method", request=request)
    try: # object exists?
        datafile = Datafile.objects.get(id=id)
    except ObjectDoesNotExist:
        return BadRequest(message_type="does_not_exist", request=request)
    if not datafile.is_accessible(request.user): # first security check
        return Unauthorized(message_type="not_authorized", request=request)
    if datafile.is_archive: # start a task to extract from archive
        extracted = extract_from_archive.delay(datafile.id)
        task_id = str(extracted.task_id) # this line is required, due to short tasks
        datafile.last_task_id = task_id
        datafile.extracted = "processing"
        datafile.save()
        return BasicJSONResponse(message_type="task_started", request=request)
    return BadRequest(message_type="not_an_archive", request=request)



