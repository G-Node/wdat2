from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, get_host
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
from metadata.forms import AddSectionForm, EditPropertyForm
from metadata.models import Section, Property


@login_required
def section_add(request, template_name="metadata/add.html"):
    if request.method == 'POST' and request.POST.get("action") == "section_add":
        parent_id = request.POST.get("parent_id")
        section_title = request.POST.get("new_name")
        parent_type = 3
    # parent types - "1" - Experiment "2" - Dataset "3" - Section
    if parent_type == 3:
        parent = get_object_or_404(Section, id=parent_id)
        if parent.does_belong_to(request.user):
            section = Section(title=section_title, parent_section=parent)
            section.save()
            section_id = section.id
    elif parent.owner == request.user:
        if parent_type == 1:
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
def property_add(request, id, template_name="metadata/dummy.html"):
    property_id = None
    property_title = request.POST.get("new_title")
    property_value = request.POST.get("new_value")
    section = get_object_or_404(Section, id=id)
    if request.method == 'POST' and request.POST.get("action") == "property_add":
        if section.does_belong_to(request.user):
            new_property = Property(prop_title=property_title, prop_value=property_value, prop_parent_section=section)
            new_property.save()
            property_id = new_property.id
    return render_to_response(template_name, {
        "property_id": property_id,
        }, context_instance=RequestContext(request))


@login_required
def property_delete(request):
    pass


@login_required
def property_edit(request, id, form_class=EditPropertyForm, template_name="metadata/property_edit.html"):
    sel_property = get_object_or_404(Property, id=id)
    property_form = None

    if sel_property.does_belong_to(request.user):
        if request.method == "POST":
            property_form = form_class(request.POST, instance=sel_property)
            if property_form.is_valid():
                sel_property = property_form.save(commit=False)
                sel_property.save()
                return HttpResponseRedirect(reverse("profile_detail", args=[request.user.username]))
        else:
            property_form = form_class(instance=sel_property)
    
    return render_to_response(template_name, {
        "sel_property": sel_property,
        "property_form": property_form,
    }, context_instance=RequestContext(request))
