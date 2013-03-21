from django.contrib import admin
from datafiles.models import Datafile

class DatafileAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'owner', 'tags')

admin.site.register(Datafile, DatafileAdmin)
