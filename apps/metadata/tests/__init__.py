"""
Tests Roadmap
================================================================================
- unauthorized tests:
    - not logged in, no access (create, get list)
    - private section, no access to contents for 3rd party user
    - shared section, no access to contents for 3rd party user, accessible for a
    user shared with
    - not able to modify by non-owner

- generic tests: 
    - create section
    - update section
    - copy sections (random nested structure)
    - move sections (random nested structure)
    - delete section
    - create property
    - update property
    - delete property
    - put/remove file
    - get section (flat/cascade)

- bad requests tests: assert correct bad data handling for all types of requests

Still remaining:
- performance tests!!
- Etag + last-modified
"""

from django.test import TestCase
#from neo_api.models import *
#from neo_api.tests.samples import sample_objects
#from neo_api.json_builder import clean_attr
#from neo_api.meta import meta_attributes
try:
    import json
except ImportError:
    import simplejson as json

SERVER_NAME = "testserver"


