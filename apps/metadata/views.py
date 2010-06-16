from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host, QueryDict
from django.template import RequestContext
#from django.db.models import Q
#from django.http import Http404
from django.core.urlresolvers import reverse
#from django.core.exceptions import ObjectDoesNotExist
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
import datetime

from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from timeseries.models import TimeSeries
from metadata.forms import AddSectionForm, AddPropertyForm, EditPropertyForm, LinkDatasetForm, LinkDatafileForm, LinkTSForm
from metadata.models import Section, Property


@login_required
def section_add(request, template_name="metadata/add.html"):
    parent_type = 0
    parent = None
    section_id = None
    # parent types - "1" - Experiment; "2" - Dataset; "3" - Section; "4" - Time Series (TBI)
    if request.method == 'POST' and request.POST.get("action") == "section_add":
        parent_id = request.POST.get("parent_id")
        section_title = request.POST.get("new_name")
        parent_type = request.POST.get("parent_type")
        if parent_type == "3":
            parent = get_object_or_404(Section, id=parent_id)
        if parent_type == "1":
            parent = get_object_or_404(Experiment, id=parent_id)
        if parent_type == "2":
            parent = get_object_or_404(RDataset, id=parent_id)
        if parent_type == "4":
            parent = get_object_or_404(TimeSeries, id=parent_id)
        if parent_type == "3":
            if parent.does_belong_to(request.user):
                section = Section(title=section_title, parent_section=parent)
                section.save()
                section_id = section.id
        elif parent.owner == request.user:
            if parent_type == "1":
                parent = get_object_or_404(Experiment, id=parent_id)
                section = Section(title=section_title, parent_exprt=parent)
            else:
                parent = get_object_or_404(RDataset, id=parent_id)
                section = Section(title=section_title, parent_dataset=parent)
            section.save()
            section_id = section.id
    else:
        section_id = None
    return render_to_response(template_name, {
        "section_id": section_id,
        }, context_instance=RequestContext(request))


@login_required
def section_delete(request, template_name="metadata/dummy.html"):
    status = False
    if request.method == 'POST' and request.POST.get("action") == "section_delete":
        section_id = request.POST.get("node_id")
        section = get_object_or_404(Section, id=section_id)
        if section.does_belong_to(request.user):
            section.deleteObject()
            status = True
    return render_to_response(template_name, {
        "status": status,
        }, context_instance=RequestContext(request))


@login_required
def section_edit(request, template_name="metadata/dummy.html"):
    status = False
    if request.method == 'POST' and request.POST.get("action") == "section_edit":
        new_title = request.POST.get("new_name")
        section_id = request.POST.get("new_id")
        section = get_object_or_404(Section, id=section_id)
        if section.does_belong_to(request.user):
            section.rename(new_title)
            status = True
    return render_to_response(template_name, {
        "status": status,
        }, context_instance=RequestContext(request))


@login_required
def properties_list(request, id, template_name="metadata/properties_list.html"):
    section = get_object_or_404(Section, id=id)
    if not section.is_accessible(request.user):
        section = None
    return render_to_response(template_name, {
        "section": section,
        }, context_instance=RequestContext(request))
        


@login_required
def property_add(request, id, property_form_class=AddPropertyForm, template_name="metadata/property_add.html"):
    property_id = 0
    prop_form = property_form_class(request.POST, auto_id='id_add_form_%s')
    if request.method == 'POST' and prop_form.is_valid():
        property_title = request.POST.get("prop_title")
        property_value = request.POST.get("prop_value")
        section = get_object_or_404(Section, id=id)
        if request.POST.get("action") == "property_add" and section.does_belong_to(request.user):
            new_property = Property(prop_title=property_title, prop_value=property_value, prop_parent_section=section)
            new_property.save()
            property_id = new_property.id
    return render_to_response(template_name, {
        "property_id": property_id,
        "prop_add_form": prop_form,
        }, context_instance=RequestContext(request))


@login_required
def property_delete(request, template_name="metadata/dummy.html"):
    status = False
    if request.method == 'POST' and request.POST.get("action") == "property_delete":
        property_id = request.POST.get("prop_id")
        prop = get_object_or_404(Property, id=property_id)
        if prop.does_belong_to(request.user):
            prop.deleteObject()
            status = True
    return render_to_response(template_name, {
        "status": status,
        }, context_instance=RequestContext(request))


@login_required
def property_edit(request, id, form_class=EditPropertyForm, template_name="metadata/property_edit.html"):
    property_form = None
    property_id = id
    upd_result = 0
    sel_property = get_object_or_404(Property, id=id)

    if request.method == "POST" and request.POST.get("action") == 'update_form':
        property_form = form_class(request.POST, auto_id='id_edit_form_%s')
        if property_form.is_valid() and sel_property.does_belong_to(request.user):
            #sel_property = property_form.save(commit=False)
            sel_property.update(request.POST.get("prop_title"), request.POST.get("prop_value"), request.POST.get("prop_description"), request.POST.get("prop_comment"))
            sel_property.save()
            property_id = sel_property.id
            upd_result = property_id
    elif request.method == "POST" and request.POST.get("action") == 'get_form':
        property_form = form_class(auto_id='id_edit_form_%s', instance=sel_property)
    
    return render_to_response(template_name, {
        "upd_result": upd_result,
        "property_id": property_id,
        "prop_edit_form": property_form,
    }, context_instance=RequestContext(request))


@login_required
def object_link(request, id, template_name="metadata/object_link.html"):
    section_id = 0
    obj_type = None
    # transform dataset<number> into <datasets> querydict to 
    # easy create a form
    d_dict = ""
    f_dict = ""
    t_dict = ""
    for key, value in request.POST.items():
        if str(key).find("dataset") == 0:
            d_dict += "datasets=" + value + "&"
        if str(key).find("datafile") == 0:
            f_dict += "datafiles=" + value + "&"
        if str(key).find("timeseries") == 0:
            t_dict += "timeseries=" + value + "&"
    if request.path.find("dataset_link") > 0:
        form = LinkDatasetForm(QueryDict(d_dict), auto_id='id_dataset_form_%s', user=request.user)
        obj_type = "dataset"
    elif request.path.find("datafile_link") > 0:
        form = LinkDatafileForm(QueryDict(f_dict), auto_id='id_datafile_form_%s', user=request.user)
        obj_type = "datafile"
    elif request.path.find("timeseries_link") > 0:
        form = LinkTSForm(QueryDict(t_dict), auto_id='id_timeseries_form_%s', user=request.user)
        obj_type = "timeseries"
    else:
        form = LinkDatasetForm(auto_id='id_dataset_form_%s', user=request.user)
        obj_type = "dataset"

    if request.method == 'POST' and form.is_valid():
        section = get_object_or_404(Section, id=id)
        if request.POST.get("action").find("_link") > 0 and section.does_belong_to(request.user):
            if obj_type == "dataset":
                sets = form.cleaned_data['datasets']
            elif obj_type == "datafile":
                sets = form.cleaned_data['datafiles']
            elif obj_type == "timeseries":
                sets = form.cleaned_data['timeseries']
            else:
                sets = None
            for s in sets:
                section.addLinkedObject(s, obj_type)
            section.save()
            section_id = section.id
    return render_to_response(template_name, {
        "section_id": section_id,
        "object_form": form,
        "obj": obj_type,
        }, context_instance=RequestContext(request))


@login_required
def remove_object(request, template_name="metadata/dummy.html"):
    status = False
    if request.method == 'POST' and request.POST.get("action") == "remove_dataset":
        dataset = get_object_or_404(RDataset, id=request.POST.get("dataset_id"))
        section = get_object_or_404(Section, id=request.POST.get("section_id"))
        if dataset.owner == request.user:
            section.removeLinkedObject(dataset, "dataset")
            section.save()
            status = True
    elif request.method == 'POST' and request.POST.get("action") == "remove_datafile":
        datafile = get_object_or_404(Datafile, id=request.POST.get("datafile_id"))
        section = get_object_or_404(Section, id=request.POST.get("section_id"))
        if datafile.owner == request.user:
            section.removeLinkedObject(datafile, "datafile")
            section.save()
            status = True
    elif request.method == 'POST' and request.POST.get("action") == "remove_timeseries":
        timeseries = get_object_or_404(TimeSeries, id=request.POST.get("timeseries_id"))
        section = get_object_or_404(Section, id=request.POST.get("section_id"))
        if timeseries.owner == request.user:
            section.removeLinkedObject(timeseries, "timeseries")
            section.save()
            status = True
    return render_to_response(template_name, {
        "status": status,
        }, context_instance=RequestContext(request))



