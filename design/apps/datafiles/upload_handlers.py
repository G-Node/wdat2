import logging

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadhandler import MemoryFileUploadHandler, FileUploadHandler

LOG_FILENAME = '/data/apps/g-node-portal/g-node-portal/logs/test_upload.txt'
logging.basicConfig(filename=LOG_FILENAME,level=logging.DEBUG)

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

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
	#logging.basicConfig(filename=LOG_FILENAME,level=logging.DEBUG)
        #logging.debug('%s - handling raw input', self.request)
	#logging.debug('%s - input_data', input_data)
	#logging.debug('%s - META', META)
	#logging.debug('%s - content_length', content_length)
	#logging.debug('%s - self.request.GET', self.request.GET)
        self.content_length = content_length
        if 'X-Progress-ID' in self.request.GET:
            self.progress_id = self.request.GET['X-Progress-ID']
        if self.progress_id:
            logging.debug('%s - progress ID exists', self.progress_id)
            self.cache_key = "%s_%s" % (self.request.META['REMOTE_ADDR'], self.progress_id )
            cache.set(self.cache_key, {
                'state': 'uploading',
                'size': self.content_length,
                'received': 0
            })
	    #logging.debug('Initialized cache with %s' % cache.get(self.cache_key))
	else:
	    pass
	    #logging.error('No progress ID')

    def new_file(self, field_name, file_name, content_type, content_length, charset=None):
        pass

    def receive_data_chunk(self, raw_data, start):
        if self.cache_key:
            data = cache.get(self.cache_key)
            if data:
                data['received'] += self.chunk_size
                cache.set(self.cache_key, data)
        return raw_data
    
    def file_complete(self, file_size):
        pass

    def upload_complete(self):
        if self.cache_key:
            cache.delete(self.cache_key)

