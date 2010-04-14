from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, HttpResponse
from django.template import RequestContext
from django.db.models import Q
from django.http import Http404
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.cache import cache

import logging
import mimetypes
import os.path

from datafiles.models import Datafile
from datafiles.forms import NewDatafileForm, DatafileEditForm, DeleteDatafileForm, DatafileShortEditForm, PrivacyEditForm

LOG_FILENAME = '/data/apps/g-node-portal/g-node-portal/logs/test_upload.txt'
#logging.basicConfig(filename=LOG_FILENAME,level=logging.DEBUG)

def upload_progress(request):
    """
    Return JSON object with information about the progress of an upload.
    """
    if 'HTTP_X_PROGRESS_ID' in request.META:
	#LOG_FILENAME = '/data/apps/g-node-portal/g-node-portal/logs/test_upload.txt'
	#logging.basicConfig(filename=LOG_FILENAME,level=logging.DEBUG)
        progress_id = request.META['HTTP_X_PROGRESS_ID']
        #logging.debug('%s - is the X progress ID', progress_id)
        #logging.debug('and a request ---- %s', request)
        from django.utils import simplejson
	#cache_key = "%s_%s" % ("127.0.0.1", progress_id)
        cache_key = "%s_%s" % (request.META['REMOTE_ADDR'], progress_id)
        data = cache.get(cache_key)
        #logging.debug('%s - cache key', cache_key)
        json = simplejson.dumps(data)
        #logging.debug('%s - and its corresponding JSON', json)
        return HttpResponse(json)
    else:
        #logging.error("Received progress report request without X-Progress-ID header. request.META: %s" % request.META)
        return HttpResponseBadRequest('Server Error: You must provide X-Progress-ID header or query param.')


@login_required
def create(request, form_class=NewDatafileForm, template_name="datafiles/new.html"):
    # create a new datafile
    datafile_form = form_class(request.user)
    if request.method == 'POST':
        if request.POST.get("action") == "upload":
            #logging.debug('start uploading the file')
            datafile_form = form_class(request.user, request.POST, request.FILES)
            if datafile_form.is_valid():
                datafile = datafile_form.save(commit=False)
                datafile.owner = request.user
                datafile.save()
		datafile_form.save_m2m()
                request.user.message_set.create(message=_("Successfully created datafile '%s'") % datafile.title)
                include_kwargs = {"id": datafile.id}
		redirect_to = reverse("your_datafiles")
		return HttpResponseRedirect(redirect_to)
                
    return render_to_response(template_name, {
        "datafile_form": datafile_form,
    }, context_instance=RequestContext(request))


@login_required
def yourdatafiles(request, template_name="datafiles/your_datafiles.html"):
    #datafiles for the currently authenticated user
    
    datafiles = Datafile.objects.filter(owner=request.user, current_state=10)
    datafiles = datafiles.order_by("-date_added")
    set_objects_form = DeleteDatafileForm(request.POST or None, user=request.user)
    
    action = request.POST.get("action")
    if request.method == 'POST' and action == "delete":
        if set_objects_form.is_valid():
            ids = set_objects_form.cleaned_data['set_choices']
            for datafile in Datafile.objects.filter(id__in=ids):
                datafile.deleteObject()
                datafile.save()
            request.user.message_set.create(message=_("Successfully deleted the requested datafiles."))
            redirect_to = reverse("your_datafiles")
            return HttpResponseRedirect(redirect_to)
	    
    return render_to_response(template_name, {
        "datafiles": datafiles,
    }, context_instance=RequestContext(request))


@login_required
def alldatafiles(request, template_name="datafiles/all.html"):
    # all datafiles available for you

    datafiles = Datafile.objects.filter(Q(current_state=10))
    datafiles = datafiles.exclude(owner=request.user, safety_level=3).exclude(owner=request.user, safety_level=2)
    
    search_terms = request.GET.get('search', '')
    if search_terms:
        datafiles = (datafiles.filter(title__icontains=search_terms) |
            datafiles.filter(caption__icontains=search_terms))
    datafiles = datafiles.order_by("-date_added")
    datafiles = filter(lambda x: x.is_accessible(request.user), datafiles)
    
    return render_to_response(template_name, {
        "datafiles": datafiles,
        "search_terms": search_terms,	
    }, context_instance=RequestContext(request))


@login_required
def datafiledetails(request, id, form_class=DatafileShortEditForm, privacy_form_class=PrivacyEditForm, template_name="datafiles/details.html"):
    # show the datafile details

    datafiles = Datafile.objects.all()
    datafile = get_object_or_404(datafiles, id=id)
    datafiles = None
    
    # security handler
    if not datafile.is_accessible(request.user):
	experiment = None
	raise Http404

    action = request.POST.get("action")

    # edit details handler
    if request.user == datafile.owner and action == "details_update":
        datafile_form = form_class(request.POST, instance=datafile)
        if datafile_form.is_valid():
            datafile = datafile_form.save()
    else:
        datafile_form = form_class(instance=datafile)
    
    # edit privacy handler    
    if request.user == datafile.owner and action == "privacy_update":
        privacy_form = privacy_form_class(request.user, request.POST, instance=datafile)
        if privacy_form.is_valid():
            datafile = privacy_form.save()
    else:
        privacy_form = privacy_form_class(user=request.user, instance=datafile)
    
    return render_to_response(template_name, {
        "datafile": datafile,
	"datafile_form": datafile_form,
	"privacy_form": privacy_form,	
    }, context_instance=RequestContext(request))


@login_required
def datafileDelete(request, id):
    
    datafiles = Datafile.objects.all()
    
    datafile = get_object_or_404(datafiles, id=id)
    title = datafile.title
    
    redirect_to = reverse("your_datafiles")
    
    if datafile.owner != request.user:
	datafile = None
	raise Http404
	# more user-friendly way to manage such cases..
        #request.user.message_set.create(message="You can't delete datafiles that aren't yours")
        #return HttpResponseRedirect(redirect_to)

    #if request.method == "POST" and request.POST["action"] == "delete":
    #datafile.deleteObject()
    datafile.deleteObject()
    datafile.save()
    request.user.message_set.create(message=_("Successfully deleted datafile '%s'") % title)
    
    return HttpResponseRedirect(redirect_to)

