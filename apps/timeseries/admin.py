from django.contrib import admin
from metadata.models import TimeSeries

class SectionAdmin(admin.ModelAdmin):
    list_display = ('title','date_created',)

admin.site.register(TimeSeries, TimeSeriesAdmin)
