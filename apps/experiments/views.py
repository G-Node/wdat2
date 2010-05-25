from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime
from datetime import timedelta

from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from experiments.forms import CreateExperimentForm, ExperimentEditForm, ExperimentShortEditForm, PrivacyEditForm, AddDatasetForm, RemoveDatasetsForm, AddDatafileForm, RemoveDatafilesForm
from experiments.filters import ExpFilter
from metadata.forms import AddPropertyForm

@login_required
def create(request, form_class=CreateExperimentForm,
        template_name="experiments/create.html"):
    """
    form to create experiments
    """
    
    exp_form = form_class(request.user)
    if request.method == 'POST':
        if request.POST.get("action") == "create":
            exp_form = form_class(request.user, request.POST)
            if exp_form.is_valid():
                experiment = exp_form.save(commit=False)
                experiment.owner = request.user
                experiment.save()
                exp_form.save_m2m()
                
                request.user.message_set.create(message=_("Successfully created experiment '%s'") % experiment.title)
		include_kwargs = {"id": experiment.id}
                redirect_to = reverse("experiment_details", kwargs=include_kwargs)
                
                return HttpResponseRedirect(redirect_to)

    return render_to_response(template_name, {
        "exp_form": exp_form,
    }, context_instance=RequestContext(request))


@login_required
def yourexperiments(request, template_name="experiments/yourexperiments.html"):
    """
    experiments for the currently authenticated user
    """
    
    experiments = Experiment.objects.filter(owner=request.user, current_state=10)
    experiments = experiments.order_by("-date_created")

    today = datetime.date.today()
    prev_month = today.month - 1
    prev_year = today.year
    if prev_month == 0:
	prev_month = 12
	prev_year = prev_year - 1
    f_1 = 'all'
    f_2 = 'last week'
    f_3 = 'last month'
    f_4 = str(today.strftime("%B %Y"))
    f_5 = str(datetime.date(prev_year, prev_month, 1).strftime("%B %Y"))

    if request.POST.get("fltr"):
	fltr = request.POST.get("fltr")
    else:
	fltr = "all"
    
    if 'filter_choice' in request.POST:
	fltr = request.POST.get("filter_choice")
	if fltr == 'last week':
	    days = timedelta(days=6)
	    experiments = experiments.filter(date_created__range=(today - days, today))
	elif fltr == 'last month':
	    days = timedelta(days=31)
	    experiments = experiments.filter(date_created__range=(today - days, today))
	elif fltr == str(today.strftime("%B %Y")):
	    experiments = experiments.filter(date_created__month=today.month)
	elif fltr == str(datetime.date(prev_year, prev_month, 1).strftime("%B %Y")):
	    experiments = experiments.filter(date_created__month=prev_month, date_created__year=prev_year)
	    
    return render_to_response(template_name, {
        "experiments": experiments,
	"fltr": fltr,
	"f_1": f_1,
	"f_2": f_2,
	"f_3": f_3,
	"f_4": f_4,
	"f_5": f_5,
    }, context_instance=RequestContext(request))

@login_required
def experiments(request, template_name="experiments/all.html"):
    # all experiments available for the user
    experiments = Experiment.objects.filter(Q(current_state=10))
    experiments = experiments.exclude(owner=request.user, safety_level=3).exclude(owner=request.user, safety_level=2)
    
    search_terms = request.GET.get('search', '')
    if search_terms:
        experiments = (experiments.filter(title__icontains=search_terms) |
            experiments.filter(caption__icontains=search_terms))
    experiments = experiments.order_by("-date_created")
    experiments = filter(lambda x: x.is_accessible(request.user), experiments)
    
    #content_type = ContentType.objects.get_for_model(Project)
    #projects = projects.extra(select=SortedDict([
    #    ('member_count', MEMBER_COUNT_SQL),
    #    ('topic_count', TOPIC_COUNT_SQL),
    #]), select_params=(content_type.id,))
    
    return render_to_response(template_name, {
        "experiments": experiments,
        "search_terms": search_terms,
    }, context_instance=RequestContext(request))


@login_required
def member_experiments(request, template_name="experiments/memberexperiments.html"):
    # method temporary not used..

    experiments = Experiment.objects.filter(Q(safety_level=1), Q(current_state=10), ~Q(owner=request.user))
    #experiments = filter(lambda x: x != request.user.id, experiments)
    experiments = experiments.order_by("owner")
    
    return render_to_response(template_name, {
        "experiments": experiments,
    }, context_instance=RequestContext(request))


@login_required
def experimentdetails(request, id, form_class=ExperimentShortEditForm, privacy_form_class=PrivacyEditForm, 
	dataset_form_class=AddDatasetForm, datafile_form_class=AddDatafileForm, property_form_class=AddPropertyForm, template_name="experiments/details.html"):
    # show the experiment details

    experiment = get_object_or_404(Experiment.objects.all(), id=id)

    # security handler
    if not experiment.is_accessible(request.user):
        experiment = None
        raise Http404

    action = request.POST.get("action")
    dset_objects_form = RemoveDatasetsForm(request.POST or None, user=request.user, exprt=experiment)
    dfile_objects_form = RemoveDatafilesForm(request.POST or None, user=request.user, exprt=experiment)
    if request.user == experiment.owner:
	    # edit details handler
	    if action == "details_update":
		exp_form = form_class(request.POST, instance=experiment)
		if exp_form.is_valid():
		    experiment = exp_form.save()
	            request.user.message_set.create(message=_("Successfully updated experiment '%s'") % experiment.title)
	    else:
		exp_form = form_class(instance=experiment)

	    # edit privacy handler    
	    if action == "privacy_update":
		privacy_form = privacy_form_class(request.user, request.POST, instance=experiment)
		if privacy_form.is_valid():
		    experiment = privacy_form.save()
		    request.user.message_set.create(message=_("New privacy settings for '%s' saved") % experiment.title)
	    else:
		privacy_form = privacy_form_class(user=request.user, instance=experiment)

	    # assign new dataset handler
	    if action == "new_dataset":
		dataset_form = dataset_form_class(request.POST, user=request.user, exprt=experiment)
		if dataset_form.is_valid():
		    sets = dataset_form.cleaned_data['datasets']
		    for s in sets:
			s.addLinkedExperiment(experiment)
			s.save()
		    request.user.message_set.create(message=_("Successfully added datasets to '%s'") % experiment.title)
	    else:
		dataset_form = dataset_form_class(user=request.user, exprt=experiment)

	    # remove datasets handler
	    if action == "remove_datasets":
		a=dset_objects_form.is_valid
		if dset_objects_form.is_valid():
		    ids = dset_objects_form.cleaned_data['dset_choices'] 
		    for rdataset in RDataset.objects.filter(id__in=ids):
		        rdataset.removeLinkedExperiment(experiment)
		        rdataset.save()
		    request.user.message_set.create(message=_("Successfully removed selected datasets from '%s'") % experiment.title)

	    # assign new datafile handler
	    if action == "new_datafile":
		datafile_form = datafile_form_class(request.POST, user=request.user, exprt=experiment)
		if datafile_form.is_valid():
		    sets = datafile_form.cleaned_data['datafiles']
		    for s in sets:
			s.addLinkedExperiment(experiment)
			s.save()
		    request.user.message_set.create(message=_("Successfully added files to '%s'") % experiment.title)
	    else:
		datafile_form = datafile_form_class(user=request.user, exprt=experiment)

	    # remove datafiles handler
	    if action == "remove_datafiles":
		if dfile_objects_form.is_valid():
		    ids = dfile_objects_form.cleaned_data['dfile_choices'] 
		    for datafile in Datafile.objects.filter(id__in=ids):
		        datafile.removeLinkedExperiment(experiment)
		        datafile.save()
		    request.user.message_set.create(message=_("Successfully removed selected datafiles from '%s'") % experiment.title)
    else:
        exp_form = form_class(instance=experiment)
        privacy_form = privacy_form_class(user=request.user, instance=experiment)
        dataset_form = dataset_form_class(user=request.user, exprt=experiment)
        datafile_form = datafile_form_class(user=request.user, exprt=experiment)

    prop_add_form = property_form_class()

    datasets = experiment.rdataset_set.all().filter(Q(current_state=10))
    datasets = filter(lambda x: x.is_accessible(request.user), datasets)

    #from metadata.templatetags.metadata_extras import metadata_tree
    #a1 = experiment.get_metadata()
    #b2 = metadata_tree(a1)
    #a3 = g3

    datafiles = experiment.datafile_set.all().filter(Q(current_state=10))
    datafiles = filter(lambda x: x.is_accessible(request.user), datafiles)

    return render_to_response(template_name, {
    "experiment": experiment,
	"datasets": datasets,
	"datafiles": datafiles,
	"exp_form": exp_form,
	"privacy_form": privacy_form,
	"dataset_form": dataset_form,
	"datafile_form": datafile_form,
	"dset_objects_form": dset_objects_form,
	"dfile_objects_form": dfile_objects_form,
    "prop_add_form": prop_add_form,
    }, context_instance=RequestContext(request))


@login_required
def edit(request, id, form_class=ExperimentEditForm, template_name="experiments/edit.html"):
    # edit a experiment and its metadata
    
    experiments = Experiment.objects.all()
    experiment = get_object_or_404(experiments, id=id)

    if request.method == "POST":
        if experiment.owner != request.user:
            request.user.message_set.create(message="You can't edit experiments that aren't yours")
            
            include_kwargs = {"id": experiment.id}
            redirect_to = reverse("experiment_details", kwargs=include_kwargs)
            return HttpResponseRedirect(reverse('experiment_details', args=(experiment.id,)))

        if request.POST["action"] == "update":
            experiment_form = form_class(request.user, request.POST, instance=experiment)
            if experiment_form.is_valid():
                experimentobj = experiment_form.save(commit=False)
                experimentobj.save()
		experiment_form.save_m2m()
                
                request.user.message_set.create(message=_("Successfully updated experiment '%s'") % experiment.title)
                
                include_kwargs = {"id": experiment.id}
                redirect_to = reverse("experiment_details", kwargs=include_kwargs)
                return HttpResponseRedirect(redirect_to)
        else:
            experiment_form = form_class(instance=experiment)

    else:
        experiment_form = form_class(instance=experiment)

    return render_to_response(template_name, {
        "experiment_form": experiment_form,
        "experiment": experiment,
    }, context_instance=RequestContext(request))

@login_required
def experimentDelete(request, id):
  
    experiments = Experiment.objects.all()
    
    experiment = get_object_or_404(experiments, id=id)
    title = experiment.title
    redirect_to = reverse("your_experiments")
    
    if experiment.owner != request.user:
        request.user.message_set.create(message="You can't delete objects that aren't yours")
        return HttpResponseRedirect(redirect_to)

    #if request.method == "POST" and request.POST["action"] == "delete":
    #experiment.delete()
    experiment.deleteObject()
    experiment.save()
    request.user.message_set.create(message=_("Successfully deleted experiment '%s'. You can find it in trash.") % title)
    
    return HttpResponseRedirect(redirect_to)


# this view is no longer used, but kept for future purposes.
"""
@login_required
def get_tree(request, id, template_name="metadata/sections_tree.html"):
  
    experiment = get_object_or_404(Experiment.objects.all(), id=id)
    redirect_to = reverse("your_experiments")
    
    if experiment.owner != request.user:
        request.user.message_set.create(message="You can't see data that isn't yours")
        return HttpResponseRedirect(redirect_to)

    return render_to_response(template_name, {
        "experiment": experiment,
    }, context_instance=RequestContext(request))
"""

