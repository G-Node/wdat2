from rest.management import BaseHandler
from rest.common import *

from datafiles.forms import RESTFileForm
from datafiles.tasks import extract_file_info

class FileHandler(BaseHandler):
    """ handles file upload via PUT """

    def create_or_update(self, request, objects=None):
        """ 
        PUT, objects == None: not supported, use POST
        PUT or POST, not objects == None: update file parameters
        POST, objects == None: create new file
        """
        if request.method == 'PUT':
            return NotSupported(json_obj={"details": "To upload a new file please use HTTP POST."}, \
                message_type="invalid_method", request=request)
        if len(request.FILES) > 0: # create new file via form
            form = RESTFileForm(request.POST, request.FILES)
            if form.is_valid():
                datafile = form.save(commit=False)
                datafile.owner = request.user
                datafile.title = request.FILES['raw_file'].name
                datafile.save()
                # start a task to extract neuroshare info TODO return extracted
                extracted = extract_file_info.delay(datafile.id)
                task_id = str(extracted.task_id) # this line is required, due to short tasks
                datafile.last_task_id = task_id
                datafile.save()
                self.options["q"] = "info"
                resp_data = self.serializer.serialize([datafile], options=self.options)[0]
                return Created(resp_data, message_type="object_created", request=request)
            else:
                return BadRequest(json_obj=form.errors, \
                    message_type="missing_parameter", request=request)
        return super(FileHandler, self).create_or_update(request, objects)


