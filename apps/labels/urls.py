from django.conf.urls.defaults import *

urlpatterns = patterns('',
    # POST/PUT - bind NEO objects with odML values, DELETE - remove bindings.
    # Existing bindings are ignored with POST/PUT. 
    url(r'^$', 'labels.views.labels', name="labels"),
)
