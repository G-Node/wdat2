import os
import sys

# just import this module and you may play with Django classes
SYSTEM_ROOT = os.path.normpath(os.path.join(os.getcwd(), ".."))
PROJECT_NAME = os.getcwd()[os.getcwd().rfind("/")+1:]

# some path settings - order matters
to_pythonpath = ( 
    './',
    PROJECT_NAME,
    os.path.join(PROJECT_NAME, 'apps/'),
    os.path.join(PROJECT_NAME, 'apps/spike_evaluation/'),
    'lib/python2.%s/site-packages/' % sys.version_info[1],
    'lib/python2.%s/site-packages/pinax/apps/' % sys.version_info[1],
    'lib/python2.%s/site-packages/pinax/' % sys.version_info[1],
)

for p in to_pythonpath:
    path = os.path.abspath(os.path.join(SYSTEM_ROOT, p))
    if path not in sys.path:
        sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = '%s.settings' % PROJECT_NAME

"""
Examples

1. Password reset
import django_access
from django.contrib.auth.models import User
menz = User.objects.get(username="andrey")
menz.set_password("pass")
menz.save()


2. Http Request56
import django_access
from django.http import HttpRequest
from django.contrib.auth.models import User
from neo_api.views import create

r = HttpRequest()
menz = User.objects.get(username="andrey")
r.user = menz
r.method = "POST"
r._read_started = False

# eh.. does not work


"""
