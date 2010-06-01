from django.shortcuts import render_to_response, get_object_or_404
#from django.http import HttpResponseRedirect, get_host
from django.template import RequestContext
#from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime

from timeseries.models import TimeSeries
from timeseries.forms import AddTSfromFieldForm


@login_required
def timeseries_main(request, template_name="metadata/timeseries_main.html"):
    t_serie = None
    if request.method == 'POST':
        exp_id = request.POST.get("exp_id")
        tserie_add_form = AddTSfromFieldForm(request.POST)
        # here to write filter for a given experiment
        if request.POST.get("action") == "timeseries_add" and tserie_add_form.is_valid():
            tserie = tserie_add_form.save(commit=False)
            tserie.title = tserie.getNextCounter()
            tserie.owner = request.user
            tserie.save()
            #dataset_form.save_m2m()
            
            request.user.message_set.create(message=_("Successfully created time series '%s'") % tserie.title)
            #include_kwargs = {"id": dataset.id}
            redirect_to = reverse("timeseries_main")
            return HttpResponseRedirect(redirect_to)
    else:
        tserie_add_form = AddTSfromFieldForm()

    timeseries = TimeSeries.objects.filter(owner=request.user, current_state=10)
    timeseries = timeseries.order_by("-date_created")
    if timeseries: t_serie = timeseries[0];
    return render_to_response(template_name, {
        "timeseries": timeseries;
        "t_serie": t_serie;
        "tserie_add_form": tserie_add_form;
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
