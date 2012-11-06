from django.core.servers.basehttp import FileWrapper
from django.http import HttpResponse

from rest.management import BaseHandler
from rest.common import *

from datafiles.forms import RESTFileForm
from datafiles.tasks import extract_file_info
from datafiles.tasks import extract_from_archive, convert_with_neuroshare
from datafiles.tasks import convert_from_csv, convert_with_NEO # broker tasks

import settings
import tempfile
import mimetypes
import tables as tb
import os

class FileHandler(BaseHandler):
    def __init__(self, serializer, model):
        super(FileHandler, self).__init__( serializer, model )
        self.actions = {
            'GET': self.get,
            'POST': self.process_with_crud,
            'DELETE': self.delete }

    def process_with_crud(self, request, objects=None):
        if request.method == 'PUT':
            return NotSupported(json_obj={"details": "To upload a new file please use HTTP POST."}, \
                message_type="invalid_method", request=request)

        if len(request.FILES) > 0:
            # create new file via form, CREATE case
            form = RESTFileForm(request.POST, request.FILES)
            if form.is_valid():
                datafile = form.save(commit=False)
                datafile.owner = request.user
                datafile.name = request.FILES['raw_file'].name

                self.model.save_changes( objects=[datafile], update_kwargs={}, \
                    m2m_dict={}, fk_dict={}, m2m_append=True )
                self.run_validation( datafile = datafile )

                return_code = 201
                request.method = "GET"
                return self.get( request, self.model.objects.get_related( id=datafile.id ), return_code )

            else:
                return BadRequest(json_obj=form.errors, \
                    message_type="missing_parameter", request=request)

        else:
            # normal UPDATE case
            return self.create_or_update(request, objects)


    def run_validation(self, *args, **kwargs):
        """ start a task to check the file compatibility """
        datafile = kwargs['datafile']
        extracted = extract_file_info.delay( datafile.id )
        task_id = str(extracted.task_id) # this line is required, due to short tasks
        datafile.last_task_id = task_id
        datafile.save()


class FileOperationsHandler(BaseHandler):
    """ handles basic file operations """

    def __init__(self, serializer, model):
        super(FileOperationsHandler, self).__init__( serializer, model )
        self.OPERATIONS = {
            'extract': self.extract,
            'convert': self.convert,
            'download': self.download,
            'data': self.data
        }
        self.actions = { 'GET': self.get }


    def __call__(self, request, obj_id, *args, **kwargs):
        self.options['operation'] = kwargs['operation']
        return super(FileOperationsHandler, self).__call__( request, obj_id, \
            *args, **kwargs )

    def get(self, request, objects, code=200):
        datafile = objects[0]
        operation = self.options['operation']

        if (operation == 'extract' or operation == 'convert') and not \
            datafile.is_editable(request.user):
            return Forbidden(message_type="not_authorized", request=request)

        if not operation in self.OPERATIONS.keys():
            return NotFound(message_type="not_found", request=request)

        return self.OPERATIONS[operation](request, datafile)


    def data(self, request, datafile):
        """ returns the [sliced] data array. Supports following formats:
        - HDF5
        - JSON
        """
        if not datafile.has_array:
            return BadRequest(message_type="no_hdf5_array", request=request)

        # getting dataslice from file
        filename = datafile.guid
        if self.options.has_key('start_index'):
            filename += '-S' + str( self.options['start_index'] )
        if self.options.has_key('end_index'):
            filename += '-E' + str( self.options['end_index'] )

        dataslice = datafile.get_slice( **self.options )
        if not len(dataslice) > 0:
            BadRequest(message_type="wrong_index", request=request)

        # pytables and h5py do not support files in memory((
        #temp = tempfile.NamedTemporaryFile()

        if self.options.has_key('format') and self.options['format'] == 'json':
            # 1. return as JSON
            response = HttpResponse( str(dataslice.tolist()) )

        else:
            # 2. return as HDF5 (default)
            full_path = os.path.join( settings.TMP_FILES_PATH, filename )
            #if not os.path.exists( full_path ):
            # could try to use existing file with the slice? as cache
            fileh = tb.openFile( full_path, mode = "w")
            fileh.createArray( "/", "data", dataslice )
            fileh.close()

            #wrapper = FileWrapper( file( full_path ) )
            #response = HttpResponse(wrapper, content_type='application/x-hdf')
            response = HttpResponse( file( full_path ).read(), mimetype='application/x-hdf')
            response['Content-Disposition'] = 'attachment; filename=%s.h5' % filename
            response['Content-Length'] = os.path.getsize( full_path )

        return response


    def download(self, request, datafile):
        """
        Processes requests for file download.
        An alternative way is to use xsendfile:
        #response = HttpResponse(mimetype='application/force-download')
        #response['Content-Disposition'] = 'attachment; filename=%s' % (datafile.name)
        """
        mimetype, encoding = mimetypes.guess_type(datafile.raw_file.path)
        mimetype = mimetype or 'application/octet-stream' 
        response = HttpResponse(datafile.raw_file.read(), mimetype=mimetype)
        response['Content-Disposition'] = 'attachment; filename=%s' % (datafile.name)
        response['Content-Length'] = datafile.raw_file.size 
        if encoding: 
            response["Content-Encoding"] = encoding
        return response


    def extract(self, request, datafile):
        """ Extract files/folders from the file if archive."""
        if datafile.is_archive: # start a task to extract from archive
            extracted = extract_from_archive.delay(datafile.id)
            task_id = str(extracted.task_id) # this line is required, due to short tasks
            datafile.last_task_id = task_id
            datafile.save()
            return Success(message_type="task_started", request=request)
        return BadRequest(message_type="not_an_archive", request=request)


    def convert(self, request, datafile):
        """ converts data from file into G-Node odML/NEO objects """
        CONVERSION_MAP = {
            "1": convert_with_neuroshare,
            "2": convert_with_NEO,
            "3": convert_from_csv
        }
        if datafile.convertible:
            method = CONVERSION_MAP[str(datafile.file_type)]
            converted = method.delay(datafile.id)
            task_id = str(converted.task_id) # this line is required, due to short tasks
            datafile.last_task_id = task_id
            datafile.save()
            return Success(json_obj={"task_id": task_id}, \
                message_type="task_started", request=request)
        return BadRequest(message_type="non_convertible", request=request)



