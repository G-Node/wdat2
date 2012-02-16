from django.core.serializers.python import Serializer as PythonSerializer
from django.core.serializers.python import Deserializer as PythonDeserializer

class Serializer(PythonSerializer):
    """ 
    Serialises G-Node models into JSON objects for HTTP REST responses
    """
    pass

class Deserializer(PythonDeserializer):
    """
    Deserialize a stream or string of JSON data.
    """


def serialize():
    pass

def deserialize():
    pass

