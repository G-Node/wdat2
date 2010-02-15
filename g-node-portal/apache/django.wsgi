import os
import sys

#Calculate the path based on the location of the WSGI script.
#apache_configuration= os.path.dirname(__file__)
#project = os.path.dirname(apache_configuration)
#workspace = os.path.dirname(project)
#sys.path.append(workspace) 

sys.path.append('/home/sobolev/apps/pinax-source')
sys.path.append('/home/sobolev/apps/pinax-source/g-node-portal')
sys.path.append('/home/sobolev/apps/pinax-source/g-node-portal/apps')
sys.path.append('/home/sobolev/apps/pinax-source/lib/python2.6/site-packages')
sys.path.append('/home/sobolev/apps/pinax-source/lib/python2.6/site-packages/pinax/apps')


os.environ['DJANGO_SETTINGS_MODULE'] = 'g-node-portal.settings'
import django.core.handlers.wsgi

_application = django.core.handlers.wsgi.WSGIHandler()

def application(environ, start_response):
    environ['PATH_INFO'] = environ['SCRIPT_NAME'] + environ['PATH_INFO']
    return _application(environ, start_response)

# TO OUTPUT EMBED / DAEMON MODE
#def application(environ, start_response):
#    status = '200 OK'

#    if not environ['mod_wsgi.process_group']:
#      output = 'EMBEDDED MODE'
#    else:
#      output = 'DAEMON MODE'

#    response_headers = [('Content-Type', 'text/plain'),
#                        ('Content-Length', str(len(output)))]

#    start_response(status, response_headers)

#    return [output]
