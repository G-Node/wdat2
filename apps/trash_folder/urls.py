from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url(r'^$', 'trash_folder.views.trashContents_Files', name="deletedFiles"),
)
