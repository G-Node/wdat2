import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadhandler import MemoryFileUploadHandler, FileUploadHandler, StopUpload

#LOG_FILENAME = '/home/sobolev/apps/pinax-source/g-node-portal/logs/test_upload.txt'
#logging.basicConfig(filename=LOG_FILENAME,level=logging.DEBUG)

class UploadProgressCachedHandler(FileUploadHandler):
    """
    Tracks progress for file uploads.
    The http post request must contain a query parameter, 'X-Progress-ID',
    which should contain a unique string to identify the upload to be tracked.
    """

    def __init__(self, request=None):
        super(UploadProgressCachedHandler, self).__init__(request)
        self.progress_id = None
        self.cache_key = None
        self.chunk_size = 12 * 2 ** 10 # The chunk size is 12 KB for smooth progress bar.

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        self.content_length = content_length
        if 'X-Progress-ID' in self.request.GET:
            self.progress_id = self.request.GET['X-Progress-ID']
            logging.debug('%s - captured X-Progress-ID.', self.progress_id)
        if self.progress_id:
            self.cache_key = "%s_%s" % (self.request.META['REMOTE_ADDR'], self.progress_id )
            cache.set(self.cache_key, {
                'state': 'uploading',
                'size': self.content_length,
                'received': 0,
                'cancelled': 0
            })
        else:
            # replace this with some logging
            pass

    def new_file(self, field_name, file_name, content_type, content_length, charset=None):
        pass

    def receive_data_chunk(self, raw_data, start):
        """
        Updates the information in cache about the progress of file upload.
        """
        if self.cache_key:
            data = cache.get(self.cache_key)
            if data:
                if not data['cancelled']:
                    data['received'] += self.chunk_size
                    cache.set(self.cache_key, data)
                    # make upload slower for development purposes
                    if not settings.PRODUCTION_MODE:
                        #logging.debug('%s - UPLOADER - data received.', data['received'])
                        time.sleep(0.5)
                else:
                    raise StopUpload(True)
        return raw_data
    
    def file_complete(self, file_size):
        pass

    def upload_complete(self):
        """
        Clears the cache after upload is finished.
        """
        if self.cache_key:
            cache.delete(self.cache_key)

