from piston.handler import BaseHandler
from piston.utils import rc, throttle

from metadata.models import Section

class SectionHandler(BaseHandler):
    allowed_methods = ('GET', 'POST', 'PUT', 'DELETE')
    fields = ('id', 'name', 'description', ('owner', ('username', 'first_name')), 'content_size')
    #fields = ('name', 'description')
    exclude = ('is_template')
    model = Section

    @classmethod
    def content_size(self, section):
        return len(section.description)

    def create(self, request, *args, **kwargs):
        if not self.has_model():
            return rc.NOT_IMPLEMENTED

        attrs = self.flatten_dict(request.data)

        import pdb
        pdb.set_trace()
        try:
            inst = self.queryset(request).get(**attrs)
            return rc.DUPLICATE_ENTRY
        except self.model.DoesNotExist:
            inst = self.model(**attrs)
            inst.save()
            return inst
        except self.model.MultipleObjectsReturned:
            return rc.DUPLICATE_ENTRY
