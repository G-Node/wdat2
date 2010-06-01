from django.shortcuts import render_to_response, get_object_or_404
#from django.http import HttpResponseRedirect, get_host
from django.template import RequestContext
#from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime

from timeseries.models import TimeSeries


@login_required
def timeseries_main(request, template_name="metadata/timeseries_main.html"):
    if request.method == 'POST':
        exp_id = request.POST.get("exp_id")
        # here to write filter for a given experiment
    timeseries = TimeSeries.objects.filter(owner=request.user, current_state=10)
    timeseries = timeseries.order_by("-date_created")
    return render_to_response(template_name, {
        "timeseries": timeseries;
        "t_serie": timeseries[0];
        }, context_instance=RequestContext(request))


@login_required
def timeseries_add(request):
    pass

@login_required
def timeseries_delete(request):
    pass

@login_required
def timeseries_edit(request):
    pass
