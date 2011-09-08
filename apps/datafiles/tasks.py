import neuroshare as ns
from datafiles.models import Datafile
from celery.decorators import task
try:
    import json
except ImportError:
    import simplejson as json

@task
def extract_file_info(file_id):
    """ This task uses python-neuroshare or NEO I/O to extract the information
    about the file with neurophysiological data. Saves a dict with the 
    extracted information to the Datafile object and an 'convertible' semaphor
    if the file is readable."""
    d = Datafile.objects.get(id=file_id) # may raise DoesNotExist
    f = ns.File(d.raw_file.path) # may raise IOerror / not able to read
    d.extracted_info = json.dumps(f._info)
    d.convertible = True # should check other f options?
    d.save()
    return file_id
