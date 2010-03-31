import re
import datetime

from django.conf import settings
from django import forms
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.translation import ugettext_lazy as _, ugettext
from django.utils.encoding import smart_unicode
from django.utils.hashcompat import sha_constructor

from pinax.core.utils import get_send_mail
from pinax.apps.profiles.models import Profile
send_mail = get_send_mail()

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.sites.models import Site

from emailconfirmation.models import EmailAddress
from account.models import Account

from timezones.forms import TimeZoneField

from account.models import PasswordReset
from account.models import update_other_services
from account.models import OtherServiceInfo

from captcha.fields import CaptchaField
from ldap_backend.models import LDAPBackend, getLDAPGroup
from django.contrib.auth.models import Group

alnum_re = re.compile(r'^\w+$')

LDAPGROUP = getattr(settings, 'AUTH_LDAP_GROUP_NAME', 'ldap_users')

class LoginForm(forms.Form):
    
    username = forms.CharField(label=_("Username"), max_length=30, widget=forms.TextInput())
    password = forms.CharField(label=_("Password"), widget=forms.PasswordInput(render_value=False))
    remember = forms.BooleanField(label=_("Remember Me"), help_text=_("If checked you will stay logged in for 3 weeks"), required=False)
    
    user = None
    
    def clean(self):
        if self._errors:
            return
        user = authenticate(username=self.cleaned_data["username"], password=self.cleaned_data["password"])
        if user:
            if user.is_active:
                self.user = user
            else:
                raise forms.ValidationError(_("This account is currently inactive."))
        else:
            raise forms.ValidationError(_("The username and/or password you specified are not correct."))
        return self.cleaned_data
    
    def login(self, request):
        if self.is_valid():
            login(request, self.user)
            request.user.message_set.create(message=ugettext(u"Successfully logged in as %(username)s.") % {'username': self.user.username})
            if self.cleaned_data['remember']:
                request.session.set_expiry(60 * 60 * 24 * 7 * 3)
            else:
                request.session.set_expiry(0)
            return True
        return False


class SignupForm(forms.Form):
    
    username = forms.CharField(label=_("Username"), max_length=30, widget=forms.TextInput())
    password1 = forms.CharField(label=_("Password"), widget=forms.PasswordInput(render_value=False))
    password2 = forms.CharField(label=_("Password (again)"), widget=forms.PasswordInput(render_value=False))
    
    if settings.ACCOUNT_REQUIRED_EMAIL or settings.ACCOUNT_EMAIL_VERIFICATION:
        email = forms.EmailField(
            label = _("Email"),
            required = True,
            widget = forms.TextInput()
        )
    else:
        email = forms.EmailField(
            label = _("Email (optional)"),
            required = False,
            widget = forms.TextInput()
        )
    name = forms.CharField(label=_("Full Name"), max_length=30, widget=forms.TextInput())
    location = forms.CharField(label=_("Location"), max_length=30, widget=forms.TextInput())
    captcha = CaptchaField(label=_("Please type in these letters"))
    
    confirmation_key = forms.CharField(max_length=40, required=False, widget=forms.HiddenInput())
    ip_address = forms.CharField(label= _("IP"), max_length=15, required=False, widget=forms.HiddenInput())

    def __init__(self, *args, **kwargs):
	meta = kwargs.pop('meta')
        super(SignupForm, self).__init__(*args, **kwargs)
	if settings.AUTH_LDAP_SWITCHED_ON:
	    self.l = LDAPBackend()
	if getattr(settings, 'BEHIND_PROXY', False):
            self.fields['ip_address'].initial = meta['HTTP_X_FORWARDED_FOR']
	else:
	    self.fields['ip_address'].initial = meta['REMOTE_ADDR']
    
    def clean_username(self):
        if not alnum_re.search(self.cleaned_data["username"]):
            raise forms.ValidationError(_("Usernames can only contain letters, numbers and underscores."))
        try:
            user = User.objects.get(username__iexact=self.cleaned_data["username"])
        except User.DoesNotExist:
	    if settings.AUTH_LDAP_SWITCHED_ON:
	        # Checking also in LDAP
	        if self.l.getUser(username=self.cleaned_data["username"]) == []:
                    return self.cleaned_data["username"]
	    else:
		return self.cleaned_data["username"]
        raise forms.ValidationError(_("This username is already taken. Please choose another."))
    
    def clean(self):
        if "password1" in self.cleaned_data and "password2" in self.cleaned_data:
            if self.cleaned_data["password1"] != self.cleaned_data["password2"]:
                raise forms.ValidationError(_("You must type the same password each time."))
	
	# check that no more than MAX_REGISTR_FROM_IP_DAILY registrations can be performed per one day
	ip_addr = self.cleaned_data['ip_address']
	check_day = datetime.date.today() - datetime.timedelta(1)
	addresses = OtherServiceInfo.objects.filter(key='ip_address', value=ip_addr)
	addresses = addresses.filter(user__in=User.objects.extra(where=['date_joined>%s'], params=[check_day]))
	
	if addresses.count() > settings.MAX_REGISTR_FROM_IP_DAILY:
	    raise forms.ValidationError(_("Too many registrations from your IP address. If that's a mistake please contact site administrator."))

        return self.cleaned_data
    
    def save(self, meta=None):
        username = self.cleaned_data["username"]
        email = self.cleaned_data["email"]
        password = self.cleaned_data["password1"]
        
        if self.cleaned_data["confirmation_key"]:
            from friends.models import JoinInvitation # @@@ temporary fix for issue 93
            try:
                join_invitation = JoinInvitation.objects.get(confirmation_key = self.cleaned_data["confirmation_key"])
                confirmed = True
            except JoinInvitation.DoesNotExist:
                confirmed = False
        else:
            confirmed = False
        
        # @@@ clean up some of the repetition below -- DRY!
        if confirmed:
            if email == join_invitation.contact.email:
                new_user = User.objects.create_user(username, email, password)
                join_invitation.accept(new_user) # should go before creation of EmailAddress below
                new_user.message_set.create(message=ugettext(u"Your email address has already been verified"))
                # already verified so can just create
                EmailAddress(user=new_user, email=email, verified=True, primary=True).save()
            else:
                new_user = User.objects.create_user(username, "", password)
                join_invitation.accept(new_user) # should go before creation of EmailAddress below
                if email:
                    new_user.message_set.create(message=ugettext(u"Confirmation email sent to %(email)s") % {'email': email})
                    EmailAddress.objects.add_email(new_user, email)
        else:
            new_user = User.objects.create_user(username, "", password)
            if email:
                new_user.message_set.create(message=ugettext(u"Confirmation email sent to %(email)s") % {'email': email})
                EmailAddress.objects.add_email(new_user, email)

	# saving the IP address of the newbie        
	#ip_addr = self.cleaned_data['ip_address']
	if getattr(settings, 'BEHIND_PROXY', False):
            ip_addr = meta['HTTP_X_FORWARDED_FOR']
	else:
	    ip_addr = meta['REMOTE_ADDR']
	update_other_services(new_user, ip_address=ip_addr)

	# updating Profile
	prfl = Profile.objects.get(user=new_user)
	prfl.name = self.cleaned_data['name']
	prfl.location = self.cleaned_data['location']
	prfl.save()

        if settings.ACCOUNT_EMAIL_VERIFICATION:
            new_user.is_active = False
            new_user.save()
	
        return username, password # required for authenticate()


class OpenIDSignupForm(forms.Form):
    username = forms.CharField(label="Username", max_length=30, widget=forms.TextInput())
    
    if settings.ACCOUNT_REQUIRED_EMAIL or settings.ACCOUNT_EMAIL_VERIFICATION:
        email = forms.EmailField(
            label = _("Email"),
            required = True,
            widget = forms.TextInput()
        )
    else:
        email = forms.EmailField(
            label = _("Email (optional)"),
            required = False,
            widget = forms.TextInput()
        )
    
    def __init__(self, *args, **kwargs):
        # remember provided (validated!) OpenID to attach it to the new user
        # later.
        self.openid = kwargs.pop("openid", None)
        
        # pop these off since they are passed to this method but we can't
        # pass them to forms.Form.__init__
        kwargs.pop("reserved_usernames", [])
        kwargs.pop("no_duplicate_emails", False)
        
        super(OpenIDSignupForm, self).__init__(*args, **kwargs)
    
    def clean_username(self):
        if not alnum_re.search(self.cleaned_data["username"]):
            raise forms.ValidationError(u"Usernames can only contain letters, numbers and underscores.")
        try:
            user = User.objects.get(username__iexact=self.cleaned_data["username"])
        except User.DoesNotExist:
            return self.cleaned_data["username"]
        raise forms.ValidationError(u"This username is already taken. Please choose another.")
    
    def save(self):
        username = self.cleaned_data["username"]
        email = self.cleaned_data["email"]
        new_user = User.objects.create_user(username, "", "!")
        
        if email:
            new_user.message_set.create(message="Confirmation email sent to %s" % email)
            EmailAddress.objects.add_email(new_user, email)
        
        if self.openid:
            # Associate openid with the new account.
            new_user.openids.create(openid = self.openid)
        return new_user


class UserForm(forms.Form):
    
    def __init__(self, user=None, *args, **kwargs):
        self.user = user
        super(UserForm, self).__init__(*args, **kwargs)


class AccountForm(UserForm):
    
    def __init__(self, *args, **kwargs):
        super(AccountForm, self).__init__(*args, **kwargs)
        try:
            self.account = Account.objects.get(user=self.user)
        except Account.DoesNotExist:
            self.account = Account(user=self.user)


class AddEmailForm(UserForm):
    
    email = forms.EmailField(label=_("Email"), required=True, widget=forms.TextInput(attrs={'size':'30'}))
    
    def clean_email(self):
        try:
            EmailAddress.objects.get(user=self.user, email=self.cleaned_data["email"])
        except EmailAddress.DoesNotExist:
            return self.cleaned_data["email"]
        raise forms.ValidationError(_("This email address already associated with this account."))
    
    def save(self):
        self.user.message_set.create(message=ugettext(u"Confirmation email sent to %(email)s") % {'email': self.cleaned_data["email"]})
        return EmailAddress.objects.add_email(self.user, self.cleaned_data["email"])


class ChangePasswordForm(UserForm):
    
    oldpassword = forms.CharField(label=_("Current Password"), widget=forms.PasswordInput(render_value=False))
    password1 = forms.CharField(label=_("New Password"), widget=forms.PasswordInput(render_value=False))
    password2 = forms.CharField(label=_("New Password (again)"), widget=forms.PasswordInput(render_value=False))

    def __init__(self, *args, **kwargs):
        super(ChangePasswordForm, self).__init__(*args, **kwargs)
	self.ldapuser = False
	if settings.AUTH_LDAP_SWITCHED_ON:
            self.l = LDAPBackend()
	    self.ldap_user = self.l.getUser(username=self.user.username)
	    if self.ldap_user:
                self.ldapuser = True

    def clean_oldpassword(self):
        old_password = self.cleaned_data["oldpassword"]
        if(self.ldapuser == False):
            if not self.user.check_password(old_password):
                raise forms.ValidationError(("Your old password was entered incorrectly. Please enter it again."))
            return old_password
        else:
            if not self.l.checkPassword(self.user.username,old_password):
                raise forms.ValidationError(("Your old LDAP password was entered incorrectly. Please enter it again."))
            return old_password
    
    def clean_password2(self):
        if "password1" in self.cleaned_data and "password2" in self.cleaned_data:
            if self.cleaned_data["password1"] != self.cleaned_data["password2"]:
                raise forms.ValidationError(_("You must type the same password each time."))
        return self.cleaned_data["password2"]
    
    def save(self):
        self.user.set_password(self.cleaned_data['password1'])
        if(self.ldapuser == True):
            change = self.l.changePassword(self.user.username, self.cleaned_data['oldpassword'], self.cleaned_data['password1'])
	    if not change: raise forms.ValidationError(_("LDAP Server is currently unavailable. Please try again later."))
       	self.user.save()
        self.user.message_set.create(message=ugettext(u"Password successfully changed."))
        return self.user


class SetPasswordForm(UserForm):
    
    password1 = forms.CharField(label=_("Password"), widget=forms.PasswordInput(render_value=False))
    password2 = forms.CharField(label=_("Password (again)"), widget=forms.PasswordInput(render_value=False))
    
    def clean_password2(self):
        if "password1" in self.cleaned_data and "password2" in self.cleaned_data:
            if self.cleaned_data["password1"] != self.cleaned_data["password2"]:
                raise forms.ValidationError(_("You must type the same password each time."))
        return self.cleaned_data["password2"]
    
    def save(self):
	# reset the password in LDAP, if ldapuser
	if settings.AUTH_LDAP_SWITCHED_ON:
	    l = LDAPBackend()
	    ldap_user = l.getUser(username=self.user.username)
	    if ldap_user:
                change = l.changePassword(self.user.username, None, self.cleaned_data['password1'])
	        if not change: raise forms.ValidationError(_("LDAP Server is currently unavailable. Please try again later."))
	# reset in django
        self.user.set_password(self.cleaned_data["password1"])
        self.user.save()
        self.user.message_set.create(message=ugettext(u"Password successfully set."))


class ResetPasswordForm(forms.Form):
    
    email = forms.EmailField(label=_("Email"), required=True, widget=forms.TextInput(attrs={'size':'30'}))
    
    def clean_email(self):
        if EmailAddress.objects.filter(email__iexact=self.cleaned_data["email"], verified=True).count() == 0:
            raise forms.ValidationError(_("Email address not verified for any user account"))
        return self.cleaned_data["email"]
    
    def save(self):
        for user in User.objects.filter(email__iexact=self.cleaned_data["email"]):
            temp_key = sha_constructor("%s%s%s" % (
                settings.SECRET_KEY,
                user.email,
                settings.SECRET_KEY,
            )).hexdigest()
            
            # save it to the password reset model
            password_reset = PasswordReset(user=user, temp_key=temp_key)
            password_reset.save()
            
            current_site = Site.objects.get_current()
            domain = unicode(current_site.domain)
            
            #send the password reset email
            subject = _("Password reset email sent")
            message = render_to_string("account/password_reset_key_message.txt", {
                "user": user,
                "temp_key": temp_key,
                "domain": domain,
            })
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], priority="high")
        return self.cleaned_data["email"]


class ResetPasswordKeyForm(forms.Form):
    
    password1 = forms.CharField(label=_("New Password"), widget=forms.PasswordInput(render_value=False))
    password2 = forms.CharField(label=_("New Password (again)"), widget=forms.PasswordInput(render_value=False))
    temp_key = forms.CharField(widget=forms.HiddenInput)

    def clean_temp_key(self):
        temp_key = self.cleaned_data.get("temp_key")
        if not PasswordReset.objects.filter(temp_key=temp_key, reset=False).count() == 1:
            raise forms.ValidationError(_("Temporary key is invalid."))
        return temp_key
    
    def clean_password2(self):
        if "password1" in self.cleaned_data and "password2" in self.cleaned_data:
            if self.cleaned_data["password1"] != self.cleaned_data["password2"]:
                raise forms.ValidationError(_("You must type the same password each time."))
        return self.cleaned_data["password2"]
    
    def save(self):
        # get the password_reset object
        temp_key = self.cleaned_data.get("temp_key")
        password_reset = PasswordReset.objects.get(temp_key__exact=temp_key)
        
        # now set the new user password
        user = User.objects.get(passwordreset__exact=password_reset)
	# reset the password in LDAP, if ldapuser
	if settings.AUTH_LDAP_SWITCHED_ON:
	    l = LDAPBackend()
	    ldap_user = l.getUser(username=user.username)
	    if ldap_user:
                change = l.changePassword(user.username, None, self.cleaned_data['password1'])
	        if not change: raise forms.ValidationError(_("LDAP Server is currently unavailable. Please try again later."))
        user.set_password(self.cleaned_data["password1"])
        user.save()
        user.message_set.create(message=ugettext(u"Password successfully changed."))
        
        # change all the password reset records to this person to be true.
        for password_reset in PasswordReset.objects.filter(user=user):
            password_reset.reset = True
            password_reset.save()


class ChangeTimezoneForm(AccountForm):
    
    timezone = TimeZoneField(label=_("Timezone"), required=True)
    
    def __init__(self, *args, **kwargs):
        super(ChangeTimezoneForm, self).__init__(*args, **kwargs)
        self.initial.update({"timezone": self.account.timezone})
    
    def save(self):
        self.account.timezone = self.cleaned_data["timezone"]
        self.account.save()
        self.user.message_set.create(message=ugettext(u"Timezone successfully updated."))


class ChangeLanguageForm(AccountForm):
    
    language = forms.ChoiceField(label=_("Language"), required=True, choices=settings.LANGUAGES)
    
    def __init__(self, *args, **kwargs):
        super(ChangeLanguageForm, self).__init__(*args, **kwargs)
        self.initial.update({"language": self.account.language})
    
    def save(self):
        self.account.language = self.cleaned_data["language"]
        self.account.save()
        self.user.message_set.create(message=ugettext(u"Language successfully updated."))


# @@@ these should somehow be moved out of account or at least out of this module

from account.models import OtherServiceInfo, other_service, update_other_services

class TwitterForm(UserForm):
    username = forms.CharField(label=_("Username"), required=True)
    password = forms.CharField(label=_("Password"), required=True,
                               widget=forms.PasswordInput(render_value=False))
    
    def __init__(self, *args, **kwargs):
        super(TwitterForm, self).__init__(*args, **kwargs)
        self.initial.update({"username": other_service(self.user, "twitter_user")})
    
    def save(self):
        from microblogging.utils import get_twitter_password
        update_other_services(self.user,
            twitter_user = self.cleaned_data['username'],
            twitter_password = get_twitter_password(settings.SECRET_KEY, self.cleaned_data['password']),
        )
        self.user.message_set.create(message=ugettext(u"Successfully authenticated."))
