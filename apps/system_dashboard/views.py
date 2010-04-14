
from django.shortcuts import render_to_response, get_object_or_404
#from django.core.exceptions import ObjectDoesNotExist
#from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.template import RequestContext
#from django.core.urlresolvers import reverse
from django.core.exceptions import ImproperlyConfigured
#from django.db.models import get_app
#from django.db.models import Q

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from pinax.apps.projects.models import Project
from django.utils.translation import ugettext as _

@login_required
def state_overview(request, template_name="system_dashboard/state_overview.html"):
    if request.user.is_staff:
	# Basic system state values
	user_count = User.objects.all().count()
	file_count = Datafile.objects.all().count()
	dataset_count = RDataset.objects.all().count()
	experiment_count = Experiment.objects.all().count()
	project_count = Project.objects.all().count()
	total_space_used = 0
	for datafile in Datafile.objects.all():
	    total_space_used += datafile.raw_file.size
	return render_to_response(template_name, {
	"user_count": user_count,
	"file_count": file_count,
	"dataset_count": dataset_count,
	"experiment_count": experiment_count,
	"project_count": project_count,
	"total_space_used": total_space_used,
	"total_space": 38000000000000,
	}, context_instance=RequestContext(request))	
    else:
	raise Http404

def object_statistics(request, template_name="system_dashboard/object_statistics.html"):
    if request.user.is_staff:
	return render_to_response(template_name, {
	"some_data": 0,
	}, context_instance=RequestContext(request))	
    else:
	raise Http404

def space_usage(request, template_name="system_dashboard/space_usage.html"):
    if request.user.is_staff:
	return render_to_response(template_name, {
	"some_data": 0,
	}, context_instance=RequestContext(request))	
    else:
	raise Http404

