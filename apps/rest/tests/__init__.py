import datetime
import time

from rest.serializers import Serializer
from state_machine.models import VersionedForeignKey

from django.db import models
from django.utils import simplejson as json
from django.core.serializers.json import DjangoJSONEncoder
from django.core.exceptions import ValidationError

"""

1. CRUD

2. Security

3. Bulk update

4. response mode (full)

5. filters

"""

# field names that shouldn't be used in tests
test_safe = ['guid', 'safety_level']

class TestGeneric( object ):
    """ Base abstract class for testing common REST functions like CRUD etc. 
    Every REST app could have a test that inherits from this class. 

    This class assumes:
        - test object data is loaded using fixtures
        - models to test are defined at the setUp() in models_to_test
        - self.app_prefix is assigned (application name)
    """

    models_to_test = []
    serializer = Serializer()
    app_prefix = ""
    TEST_VALUES = {
        models.CharField: "bla",
        models.TextField: "bla foo",
        models.IntegerField: 10,
        models.FloatField: 1.5,
        models.DateTimeField: datetime.datetime.now(),
        models.BooleanField: False,
        models.ForeignKey: 1,
        VersionedForeignKey: 1
    }

    def _get_test_value_for_field( self, model, field ):
        data = self.TEST_VALUES[ field.__class__ ]
        if self.serializer.is_data_field_django(model, field):
            in_json = {"data": data}
            if field.name == 'times':
                in_json[ "units" ] = 'mV'
            else:
                in_json[ "units" ] = 'ms'
            return in_json
        return data

    def _is_used_to_create( self, field ):
        """ defines whether we use a given field in the POST request to create a 
        new object or not. """
        return not field.null and field.editable and not field.name in test_safe\
            and field.name.find('__units') < 0

    def _is_used_to_update( self, field ):
        """ defines whether we use a given field in the POST request to update 
        objects """
        return field.editable and not field.name in test_safe and not field.rel\
            and field.name.find('__units') < 0

    def test_create(self):
        """ send POST requests with minimum required attributes to create an 
        object for every model """
        for model in self.models_to_test:
            obj_type = model().obj_type
            url = "/%s/%s/" % (self.app_prefix, obj_type)
            post = {} # POST request body to create an object
            for field in model._meta.local_fields:
                # fill only required and editable fields
                if self._is_used_to_create( field ):
                    post[ field.name ] = self._get_test_value_for_field( model, field )
            response = self.client.post(url, \
                json.dumps(post, cls=DjangoJSONEncoder), content_type="application/json")
            self.assertEqual(response.status_code, 201, \
                "Obj type %s; response: %s" % (obj_type, response.content))

    def test_update(self):
        for model in self.models_to_test:
            obj_type = model().obj_type
            url = "/%s/%s/%d" % (self.app_prefix, obj_type, 1)
            for field in model._meta.local_fields:
                if self._is_used_to_update( field ):
                    post = {} # POST request body to update a field
                    v = self._get_test_value_for_field( model, field )
                    post[ field.name ] = v
                    response = self.client.post(url,\
                        DjangoJSONEncoder().encode(post), content_type="application/json")
                    self.assertNotEqual(response.status_code, 500, \
                        "Obj type %s; response: %s" % (obj_type, response.content))
                    try:
                        field.to_python( v )
                        response = self.client.get( url )
                        rdata = json.loads(response.content)
                        self.assertEqual(str(rdata['selected'][0]['fields'][field.name]),\
                            str( v ), "Object: %s, field: %s" % (obj_type, field.name) )
                    except ValidationError:
                        # test value is outside of the possible range. ignore
                        pass





