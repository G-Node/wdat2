from rest.management import process_REST
from labels.handlers import LabelHandler
from labels.models import Label
from rest.serializers import Serializer

def labels(request, *args, **kwargs):
    return process_REST(request, handler=LabelHandler(Serializer, Label), *args, **kwargs)



