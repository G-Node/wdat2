from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime

from timeseries.models import TimeSeries
from timeseries.forms import AddTSfromFieldForm, EditTSForm, DeleteTSForm


@login_required
def timeseries_main(request, id=None, template_name="timeseries/timeseries_main.html"):
    t_serie = None
    tserie_add_form_status = "none"
    tserie_edit_form_status = "none"

    time_series = TimeSeries.objects.filter(owner=request.user, current_state=10)
    time_series = time_series.order_by("-date_created")
    # insert some security here!!!
    if time_series:
        if id:
            t_serie = get_object_or_404(TimeSeries, id=id)
        else:
            t_serie = time_series[0]

    if t_serie:
        tserie_add_form = AddTSfromFieldForm()
        tserie_edit_form = EditTSForm(instance=t_serie)
        if request.method == 'POST' and request.user == t_serie.owner:
            action = request.POST.get("action")
            if action == "timeseries_add":
                tserie_add_form = AddTSfromFieldForm(request.POST or None)

            if action == "timeseries_add":
                if tserie_add_form.is_valid():
                    tserie = tserie_add_form.save(commit=False)
                    tserie.title = tserie.getNextCounter(request.user)
                    tserie.owner = request.user
                    tserie.save()
                    #dataset_form.save_m2m()
                    
                    request.user.message_set.create(message=_("Successfully created time series '%s'") % tserie.title)
                    #include_kwargs = {"id": dataset.id}
                    redirect_to = reverse("timeseries_main")
                    return HttpResponseRedirect(redirect_to)
                else:
                    tserie_add_form_status = ""

            tserie_edit_form = EditTSForm(request.POST or None, instance=t_serie)
            if action == "timeseries_update":
                if tserie_edit_form.is_valid():
                    t_serie = tserie_edit_form.save(commit=False)
                    t_serie.save()
                    request.user.message_set.create(message=_("Time series '%s' was updated") % t_serie.title)
                else:
                    tserie_edit_form_status = ""

            delete_series_form = DeleteTSForm(request.POST or None, user=request.user)
            if action == "timeseries_delete":
                if delete_series_form.is_valid():
                    ids = delete_series_form.cleaned_data['serie_choices'] 
                    for serie in TimeSeries.objects.filter(id__in=ids):
                        serie.deleteObject()
                        serie.save()
                    request.user.message_set.create(message=_("Successfully deleted selected %s time series") % len(ids))
                    #include_kwargs = {"id": dataset.id}
                    redirect_to = reverse("timeseries_main")
                    return HttpResponseRedirect(redirect_to)
                    #time_series = TimeSeries.objects.filter(owner=request.user, current_state=10)
                    #time_series = time_series.order_by("-date_created")
                    #t_serie = time_series[0]
    else:
        tserie_add_form = AddTSfromFieldForm()
        tserie_edit_form = None

    return render_to_response(template_name, {
        "timeseries": time_series,
        "t_serie": t_serie,
        "tserie_add_form": tserie_add_form,
        "tserie_add_form_status": tserie_add_form_status,
        "tserie_edit_form": tserie_edit_form,
        "tserie_edit_form_status": tserie_edit_form_status,
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

@login_required
def timeseries_list(request):
    pass
