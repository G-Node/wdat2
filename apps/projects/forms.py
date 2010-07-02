from django import forms
from django.utils.translation import ugettext_lazy as _
from django.forms import widgets
from django.db.models import Q
from django.contrib.auth.models import User

from projects.models import Project, ProjectMember
from experiments.models import Experiment
from django.conf import settings

if "notification" in settings.INSTALLED_APPS:
    from notification import models as notification
else:
    notification = None

# @@@ we should have auto slugs, even if suggested and overrideable

class ProjectForm(forms.ModelForm):
    name = forms.CharField(label="Title")
    slug = forms.SlugField(max_length=20,
        help_text = _("a short name consisting only of letters, numbers, underscores and hyphens, which is used as an identifier to represent the project."),
        error_message = _("This value must contain only letters, numbers, underscores and hyphens."))
            
    def clean_slug(self):
        if Project.objects.filter(slug__iexact=self.cleaned_data["slug"]).count() > 0:
            raise forms.ValidationError(_("A project already exists with that slug."))
        return self.cleaned_data["slug"].lower()
    
    def clean_name(self):
        if Project.objects.filter(name__iexact=self.cleaned_data["name"]).count() > 0:
            raise forms.ValidationError(_("A project already exists with that name."))
        return self.cleaned_data["name"]
    
    class Meta:
        model = Project
        fields = ('name', 'slug', 'description')


# @@@ is this the right approach, to have two forms where creation and update fields differ?

class ProjectUpdateForm(forms.ModelForm):
    
    def clean_name(self):
        if Project.objects.filter(name__iexact=self.cleaned_data["name"]).count() > 0:
            if self.cleaned_data["name"] == self.instance.name:
                pass # same instance
            else:
                raise forms.ValidationError(_("A project already exists with that name."))
        return self.cleaned_data["name"]
    
    class Meta:
        model = Project
        fields = ('name', 'description')


class AddUserForm(forms.Form):
    
    recipient = forms.CharField(label=_(u"User"))
    
    def __init__(self, *args, **kwargs):
        self.project = kwargs.pop("project")
        super(AddUserForm, self).__init__(*args, **kwargs)
    
    def clean_recipient(self):
        try:
            user = User.objects.get(username__exact=self.cleaned_data['recipient'])
        except User.DoesNotExist:
            raise forms.ValidationError(_("There is no user with this username."))
        
        if ProjectMember.objects.filter(project=self.project, user=user).count() > 0:
            raise forms.ValidationError(_("User is already a member of this project."))
        
        return self.cleaned_data['recipient']
    
    def save(self, user):
        new_member = User.objects.get(username__exact=self.cleaned_data['recipient'])
        project_member = ProjectMember(project=self.project, user=new_member)
        project_member.save()
        self.project.members.add(project_member)
        if notification:
            notification.send(self.project.member_users.all(), "projects_new_member", {"new_member": new_member, "project": self.project})
            #notification.send([new_member], "projects_added_as_member", {"adder": user, "project": self.project})
        user.message_set.create(message="added %s to project" % new_member)

class AddExperimentForm(forms.Form):
    experiments = forms.ModelMultipleChoiceField(queryset=Experiment.objects.all().filter(current_state=10))
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        project = kwargs.pop('project')
        super(AddExperimentForm, self).__init__(*args, **kwargs)
	for_exclude = project.experiment_set.all().values_list("id", flat=True)
        choices = Experiment.objects.filter(owner=user, current_state=10).exclude(id__in=for_exclude)
        self.fields['experiments'].queryset = choices

class RemoveExperimentForm(forms.Form):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        project = kwargs.pop('project')
        super(RemoveExperimentForm, self).__init__(*args, **kwargs)
	values = project.experiment_set.all().filter(Q(current_state=10))
	values = filter(lambda x: x.is_accessible(user), values)
        self.fields['exprt_choices'] = forms.MultipleChoiceField(
            choices=[(c.id, c.title) for c in values], required=False,
            widget=widgets.CheckboxSelectMultiple)


