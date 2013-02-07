from rest.management import BaseHandler
from rest.common import auth_required

import settings

class UsersHandler(BaseHandler):

    def __init__(self, *args, **kwargs):
        super(UsersHandler, self).__init__(*args, **kwargs)
        self.actions = { 'GET': self.get }
        self.mode = settings.RESPONSE_MODES[3] # full load


