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

#from photologue.models import *
from datasets.models import RDataset
from datafiles.models import Datafile
from datasets.forms import NewRDatasetForm, RDatasetEditForm, DeleteDatasetsForm, DatasetShortEditForm, PrivacyEditForm, AddDatafileForm, RemoveDatafilesForm

@login_required
def create(request, form_class=NewRDatasetForm, template_name="datasets/new.html"):
    """
    create new Dataset form
    """
    
    dataset_form = form_class(request.user)
    if request.method == 'POST':
        if request.POST.get("action") == "create":
            dataset_form = form_class(request.user, request.POST)
            if dataset_form.is_valid():
                dataset = dataset_form.save(commit=False)
                dataset.owner = request.user
                dataset.save()
                dataset_form.save_m2m()
                
                request.user.message_set.create(message=_("Successfully created dataset '%s'") % dataset.title)
                include_kwargs = {"id": dataset.id}
                #redirect_to = reverse("dataset_details", kwargs=include_kwargs)
                #return HttpResponseRedirect(redirect_to)
                
                return HttpResponseRedirect(dataset.get_absolute_url())

    return render_to_response(template_name, {
        "dataset_form": dataset_form,
    }, context_instance=RequestContext(request))


@login_required
def yourdatasets(request, template_name="datasets/your_datasets.html"):
    """
    datasets for the currently authenticated user
    """
    datasets = RDataset.objects.filter(owner=request.user, current_state=10)
    datasets = datasets.order_by("-date_added")
    set_objects_form = DeleteDatasetsForm(request.POST or None, user=request.user)
    
    action = request.POST.get("action")
    if request.method == 'POST' and action == "delete":
        if set_objects_form.is_valid():
            ids = set_objects_form.cleaned_data['set_choices'] # [u'39', u'20', u'18']
            for rdataset in RDataset.objects.filter(id__in=ids):
                rdataset.deleteObject()
                rdataset.save()
            request.user.message_set.create(message=("Successfully deleted the requested datasets. Files attached to a dataset are still available"))
            redirect_to = reverse("your_datasets")
            return HttpResponseRedirect(redirect_to)
            
    return render_to_response(template_name, {
        "datasets": datasets,
    }, context_instance=RequestContext(request))


@login_required
def alldatasets(request, template_name="datasets/all.html"):
    """
    all datasets available for you
    """
    
    datasets = RDataset.objects.filter(Q(safety_level=1), Q(current_state=10)
        #Q(securitylevel=3, owner=request.user)
    )
    
    datasets = datasets.order_by("-date_added")
    
    return render_to_response(template_name, {
        "datasets": datasets,
    }, context_instance=RequestContext(request))


@login_required
def datasetdetails(request, id, form_class=DatasetShortEditForm, privacy_form_class=PrivacyEditForm, datafile_form_class=AddDatafileForm, template_name="datasets/details.html"):
    """
    show the dataset details
    """
    # change here !!! RDataset.objects.get(id__exact=id) + raise Http404 if nothing
    datasets = RDataset.objects.all()
    dataset = get_object_or_404(datasets, id=id)
    datasets = None
    
    # security handler
    if not dataset.is_accessible(request.user):
	dataset = None
	raise Http404

    action = request.POST.get("action")
    dfile_objects_form = RemoveDatafilesForm(request.POST or None, user=request.user, dataset=dataset)

    # edit details handler
    if request.user == dataset.owner and action == "details_update":
        dataset_form = form_class(request.POST, instance=dataset)
        if dataset_form.is_valid():
            dataset = dataset_form.save()
    else:
        dataset_form = form_class(instance=dataset)
    
    # edit privacy handler    
    if request.user == dataset.owner and action == "privacy_update":
        privacy_form = privacy_form_class(request.user, request.POST, instance=dataset)
        if privacy_form.is_valid():
            dataset = privacy_form.save()
    else:
        privacy_form = privacy_form_class(user=request.user, instance=dataset)

    # assign new datafile handler
    if action == "new_datafile":
	datafile_form = datafile_form_class(request.POST, user=request.user, dataset=dataset)
	if datafile_form.is_valid():
	    sets = datafile_form.cleaned_data['datafiles']
	    for s in sets:
		s.addLinkedDataset(dataset)
		s.save()
	    request.user.message_set.create(message=_("Successfully added files to '%s'") % dataset.title)
    else:
	datafile_form = datafile_form_class(user=request.user, dataset=dataset)

    # remove datafiles handler
    if action == "remove_datafiles":
	if dfile_objects_form.is_valid():
	    ids = dfile_objects_form.cleaned_data['dfile_choices'] 
	    for datafile in Datafile.objects.filter(id__in=ids):
	        datafile.removeLinkedDataset(dataset)
	        datafile.save()
	    request.user.message_set.create(message=_("Successfully removed selected datafiles from '%s'") % dataset.title)

    datafiles = dataset.datafile_set.all().filter(Q(current_state=10))
    datafiles = filter(lambda x: x.is_accessible(request.user), datafiles)
    
    return render_to_response(template_name, {
        "dataset": dataset,
	"datafiles": datafiles,
	"dataset_form": dataset_form,
	"privacy_form": privacy_form,
	"datafile_form": datafile_form,
	"dfile_objects_form": dfile_objects_form,
    }, context_instance=RequestContext(request))


@login_required
def edit(request, id, form_class=RDatasetEditForm, template_name="datasets/edit.html"):
    
    datasets = RDataset.objects.all()
    
    dataset = get_object_or_404(datasets, id=id)

    if request.method == "POST":
        if dataset.owner != request.user:
            request.user.message_set.create(message="You can't edit datasets that aren't yours")
            
            include_kwargs = {"id": dataset.id}
            redirect_to = reverse("dataset_details", kwargs=include_kwargs)
            return HttpResponseRedirect(reverse('dataset_details', args=(dataset.id,)))

        if request.POST["action"] == "update":
            dataset_form = form_class(request.user, request.POST, instance=dataset)
            if dataset_form.is_valid():
                datasetobj = dataset_form.save(commit=False)
                datasetobj.save()
                dataset_form.save_m2m()
                
                request.user.message_set.create(message=_("Successfully updated dataset '%s'") % dataset.title)
                
                include_kwargs = {"id": dataset.id}
                redirect_to = reverse("dataset_details", kwargs=include_kwargs)
                return HttpResponseRedirect(redirect_to)
        else:
            dataset_form = form_class(instance=dataset)

    else:
        dataset_form = form_class(instance=dataset)

    return render_to_response(template_name, {
        "dataset_form": dataset_form,
        "dataset": dataset,
    }, context_instance=RequestContext(request))


@login_required
def datasetDelete(request, id):
    
    datasets = RDataset.objects.all()
    
    dataset = get_object_or_404(datasets, id=id)
    title = dataset.title
    
    redirect_to = reverse("your_datasets")
    
    if dataset.owner != request.user:
        request.user.message_set.create(message="You can't delete datasets that aren't yours")
        return HttpResponseRedirect(redirect_to)

    #if request.method == "POST" and request.POST["action"] == "delete":
    #dataset.deleteObject()
    dataset.deleteObject()
    dataset.save()
    request.user.message_set.create(message=_("Successfully deleted dataset '%s'. Files attached to a dataset are still available") % title)
    
    return HttpResponseRedirect(redirect_to)
