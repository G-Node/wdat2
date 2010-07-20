from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime

from timeseries.models import TimeSeries
from timeseries.forms import AddTSfromFieldForm, AddTSfromFileForm, EditTSForm, DeleteTSForm, PrivacyEditForm
from metadata.forms import AddPropertyForm
from metadata.models import Section
from datasets.models import RDataset


@login_required
def timeseries_main(request, id=None, template_name="timeseries/timeseries_main.html"):
    t_serie = None
    dataset = None
    tserie_add_form_status = "none"
    add_from_file_status = "none"
    tserie_edit_form_status = "none"
    objs = []

    time_series = TimeSeries.objects.filter(current_state=10)
    search_terms = request.GET.get('search', '')
    if search_terms:
        time_series = (time_series.filter(title__icontains=search_terms) |
            time_series.filter(description__icontains=search_terms))
    time_series = time_series.order_by("-title")
    time_series = filter(lambda x: x.is_accessible(request.user), time_series)
    # insert some security here!!!
    if time_series:
        if id and not search_terms:
            t_serie = get_object_or_404(TimeSeries, id=id)
        else:
            t_serie = time_series[0]

    action = request.POST.get("action")
    if action == "timeseries_add":
        tserie_add_form = AddTSfromFieldForm(request.POST or None)
        if tserie_add_form.is_valid():
            tserie = tserie_add_form.save(commit=False)
            tserie.title = tserie.getNextCounter(request.user)
            tserie.owner = request.user
            tserie.save()
                    
            request.user.message_set.create(message=_("Successfully created time series '%s'") % tserie.title)
            redirect_to = reverse("timeseries_main")
            return HttpResponseRedirect(redirect_to)
        else:
            tserie_add_form_status = ""
    else:
        tserie_add_form = AddTSfromFieldForm()

    if action == "add_from_file":
        add_from_file_form = AddTSfromFileForm(request.POST or None, user=request.user)
        if add_from_file_form.is_valid():
            c = 0
            selection = add_from_file_form.cleaned_data['selection']
            if selection == "1":
                # get dataset for assignment
                dataset = add_from_file_form.cleaned_data['my_datasets']
                if not (dataset.owner == request.user):
                    raise Http404
                if Section.objects.filter(parent_dataset=dataset):
                    dataset_section = Section.objects.filter(current_state=10, parent_dataset=dataset)[0]
                else:
                    dataset_section = Section(title="metadata root", parent_dataset=dataset, tree_position=1)
                    dataset_section.save()
            elif selection == "2":
                # create new dataset
                dataset = RDataset(title=add_from_file_form.cleaned_data['new_dataset'], owner=request.user)
                dataset.save()
                dataset_section = Section(title="metadata root", parent_dataset=dataset, tree_position=1)
                dataset_section.save()
            for item in add_from_file_form.cleaned_data['datafile']:
                tserie = TimeSeries(data=item[0], data_type=add_from_file_form.cleaned_data['data_type'], time_step=add_from_file_form.cleaned_data['time_step'],
                    time_step_items=add_from_file_form.cleaned_data['time_step_items'], tags=add_from_file_form.cleaned_data['tags'])
                tserie.title = tserie.getNextCounter(request.user)
                tserie.owner = request.user
                tserie.save()
                if dataset:
                    dataset_section.addLinkedObject(tserie, "timeseries")
                c += 1
            if dataset:
                dataset.save()
                dataset_section.save()
            request.user.message_set.create(message=_("Successfully extracted and created '%s' time series") % c)
            redirect_to = reverse("timeseries_main")
            return HttpResponseRedirect(redirect_to)
        else:
            add_from_file_status = ""
    else:
        add_from_file_form = AddTSfromFileForm(user=request.user)

    if t_serie:
        # get the parent objects to which this t_serie is linked to
        sections = Section.objects.filter(current_state=10)
        sections = filter(lambda x: x.hasTimeSeries(t_serie.id), sections)
        for section in sections:
            rt = section.get_root()
            if rt and (not rt in objs):
                objs.append(section.get_root())
        # edit details handler
        tserie_edit_form = EditTSForm(instance=t_serie)
        # edit privacy handler    
        privacy_form = PrivacyEditForm(user=request.user, instance=t_serie)
        if request.method == 'POST' and request.user == t_serie.owner:
            if action == "privacy_update":
                privacy_form = PrivacyEditForm(request.user, request.POST or None, instance=t_serie)
                if privacy_form.is_valid():
                    t_serie = privacy_form.save()
                    request.user.message_set.create(message=_("Time series '%s' privacy was updated") % t_serie.title)

            if action == "details_update":
                tserie_edit_form = EditTSForm(request.POST or None, instance=t_serie)
                if tserie_edit_form.is_valid():
                    t_serie = tserie_edit_form.save(commit=False)
                    t_serie.save()
                    request.user.message_set.create(message=_("Time series '%s' was updated") % t_serie.title)
                else:
                    tserie_edit_form_status = ""

            if action == "timeseries_delete":
                delete_series_form = DeleteTSForm(request.POST or None, user=request.user)
                if delete_series_form.is_valid():
                    ids = delete_series_form.cleaned_data['serie_choices'] 
                    for serie in TimeSeries.objects.filter(id__in=ids):
                        serie.deleteObject()
                        serie.save()
                    request.user.message_set.create(message=_("Successfully deleted selected %s time series") % len(ids))
                    redirect_to = reverse("timeseries_main")
                    return HttpResponseRedirect(redirect_to)
    else:
        tserie_edit_form = None
        privacy_form = None

    # templates for metadata. can't move to state_mashine due to import error
    metadata_defaults = []
    for section in Section.objects.filter(current_state=10, is_template=True):
        if not section.parent_section:
            metadata_defaults.append(section.get_tree())
    for section in Section.objects.filter(current_state=10, user_custom=request.user):
        if not section.parent_section:
            metadata_defaults.append(section.get_tree())

    prop_add_form = AddPropertyForm(auto_id='id_add_form_%s')

    return render_to_response(template_name, {
        "timeseries": time_series,
        "t_serie": t_serie,
        "metadata_defaults": metadata_defaults,
        "tserie_add_form": tserie_add_form,
        "add_from_file_form": add_from_file_form,
        "add_from_file_status": add_from_file_status,
        "tserie_add_form_status": tserie_add_form_status,
        "tserie_edit_form": tserie_edit_form,
        "privacy_form": privacy_form,
        "tserie_edit_form_status": tserie_edit_form_status,
        "prop_add_form": prop_add_form,
        "objs": objs,
        "search_terms": search_terms,
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
