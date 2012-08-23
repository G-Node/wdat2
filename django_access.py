"""
This module is basically used to include some more paths to the PYTHONPATH and
set up some additional environment variables. It is used in two cases:
- by the django.wsgi script, if the Apache + mod_wsgi is configued as a web 
server;
- could be used for development purposes to quickly initialize all paths 
required to directly access all apps / models from local python interpreter.

Here is an example of accessing django models directly from the python 
environment. For example we want to reset a password:

import django_access
from django.contrib.auth.models import User

u = User.objects.get(username="andrey")
u.set_password("pass")
u.save()

"""

import os
import sys

PROJECT_PATH = os.path.abspath(os.path.dirname(__file__))
#SYSTEM_ROOT = os.path.normpath(os.path.join(os.getcwd(), ".."))
PROJECT_NAME = PROJECT_PATH[PROJECT_PATH.rfind("/")+1:] # just in case

# some path settings - order matters
to_pythonpath = ( 
    './',
    PROJECT_PATH,
    os.path.join(PROJECT_PATH, 'apps/ext/pinax/'),
    os.path.join(PROJECT_PATH, 'apps/ext/pinax/apps/'),
    os.path.join(PROJECT_PATH, 'apps/'),
    os.path.join(PROJECT_PATH, 'apps/ext/'),
    os.path.join(PROJECT_PATH, 'apps/local/'),
)

for path in to_pythonpath:
    #path = os.path.abspath(os.path.join(SYSTEM_ROOT, p))
    if path not in sys.path:
        sys.path.insert(0, path)
        #sys.path.append(path)

#os.environ['DJANGO_SETTINGS_MODULE'] = '%s.settings' % PROJECT_NAME
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

