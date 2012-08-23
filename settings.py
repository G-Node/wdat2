# -*- coding: utf-8 -*-
# Common Django settings for G-Node project.

import os.path
import posixpath
import pinax
from django.conf import global_settings
from logging.handlers import SysLogHandler
#import firepython

# local_settings.py can be used to override environment-specific settings
# like database and email that differ between development and production.
try:
    from local_settings import *
except ImportError, e:
    print e

#CACHE_BACKEND = 'memcached://127.0.0.1:11211' # deprecated
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '127.0.0.1:11211',
    }
}
FILE_UPLOAD_HANDLERS = ('datafiles.upload_handlers.UploadProgressCachedHandler', ) + global_settings.FILE_UPLOAD_HANDLERS

MANAGERS = ADMINS

# Local time zone for this installation. Choices can be found here:
# http://www.postgresql.org/docs/8.1/static/datetime-keywords.html#DATETIME-TIMEZONE-SET-TABLE
# although not all variations may be possible on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'Europe/Berlin'

# Language code for this installation. All choices can be found here:
# http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
# http://blogs.law.harvard.edu/tech/stories/storyReader$15
LANGUAGE_CODE = 'en'

TEMPLATE_DIRS = (
    os.path.join(PROJECT_ROOT, "templates"),
    os.path.join(PROJECT_ROOT, "templates", "default"),
    os.path.join(PROJECT_ROOT, "site_media", "static"),
    os.path.join(PINAX_ROOT, "templates", PINAX_THEME),
)

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    #'django.template.loaders.filesystem.load_template_source',
    #'django.template.loaders.app_directories.load_template_source',
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_openid.consumer.SessionConsumer',
    'account.middleware.LocaleMiddleware',
    'django.middleware.doc.XViewMiddleware',
    'pagination.middleware.PaginationMiddleware',
    'django_sorting.middleware.SortingMiddleware',
    'djangodblog.middleware.DBLogMiddleware',
    'pinax.middleware.security.HideSensistiveFieldsMiddleware',
    'django.middleware.transaction.TransactionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    #'firepython.middleware.FirePythonDjango',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    #"django.core.context_processors.auth",
    "django.contrib.auth.context_processors.auth",
    "django.core.context_processors.debug",
    "django.core.context_processors.i18n",
    "django.core.context_processors.media",
    "django.core.context_processors.request",
    "context_processors.pinax_settings",
    "notification.context_processors.notification",
    "announcements.context_processors.site_wide_announcements",
    "account.context_processors.openid",
    "account.context_processors.account",
    "messages.context_processors.inbox",
    "friends_app.context_processors.invitations",
    "context_processors.combined_inbox_count",
    #"service_manager.service_selector",
)

COMBINED_INBOX_COUNT_SOURCES = (
    "messages.context_processors.inbox",
    "friends_app.context_processors.invitations",
    "notification.context_processors.notification",
)

INSTALLED_APPS = (
    # included
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.humanize',
    'django.contrib.markup',
    'django.contrib.admin',
    'pinax.templatetags',
    
    # external
    'notification', # must be first
    'django_openid',
    'emailconfirmation',
    'friends',
    'messages',
    'announcements',
    'oembed',
    'djangodblog',
    'pagination',
    'threadedcomments',
    'threadedcomments_extras',
    'wiki',
    'timezones',
    'tagging',
    'ajax_validation',
    'avatar',
    'uni_form',
    'django_sorting',
    'staticfiles',
    'captcha',
    
    'datafiles',
    'analytics',
    'profiles',
    'account',
    'signup_codes',
    'tag_app',
    'groups',
    'state_machine',
    'ldap_backend',
    'system_dashboard',
    'metadata',
    'neo_api',
    'djcelery',
)

ABSOLUTE_URL_OVERRIDES = {
    "auth.user": lambda o: "/profiles/profile/%s/" % o.username,
}

MARKUP_FILTER_FALLBACK = 'none'
MARKUP_CHOICES = (
    ('restructuredtext', u'reStructuredText'),
    ('textile', u'Textile'),
    ('markdown', u'Markdown'),
    ('creole', u'Creole'),
)
WIKI_MARKUP_CHOICES = MARKUP_CHOICES

AUTH_PROFILE_MODULE = 'profiles.Profile'
NOTIFICATION_LANGUAGE_MODULE = 'account.Account'

LOGIN_URL = "/account/login/"
#LOGIN_REDIRECT_URLNAME = "what_next"
LOGIN_REDIRECT_URLNAME = "profile_list"

INTERNAL_IPS = (
    '127.0.0.1',
)

ugettext = lambda s: s
LANGUAGES = (
    ('en', u'English'),
)

# URCHIN_ID = "ua-..."

YAHOO_MAPS_API_KEY = "..."

class NullStream(object):
    def write(*args, **kwargs):
        pass
    writeline = write
    writelines = write

RESTRUCTUREDTEXT_FILTER_SETTINGS = {
    'cloak_email_addresses': True,
    'file_insertion_enabled': False,
    'raw_enabled': False,
    'warning_stream': NullStream(),
    'strip_comments': True,
}

# if Django is running behind a proxy, we need to do things like use
# HTTP_X_FORWARDED_FOR instead of REMOTE_ADDR. This setting is used
# to inform apps of this fact
BEHIND_PROXY = False

FORCE_LOWERCASE_TAGS = True

WIKI_REQUIRES_LOGIN = True

# Uncomment this line after signing up for a Yahoo Maps API key at the
# following URL: https://developer.yahoo.com/wsregapp/
# YAHOO_MAPS_API_KEY = ''

DEFAULT_SORT_UP = '&darr;'
DEFAULT_SORT_DOWN = '&uarr;'

AVATAR_GRAVATAR_BACKUP = False
AVATAR_DEFAULT_URL = STATIC_URL + "pinax/images/avatar_default.jpeg"

LOGIN_REDIRECT_URLNAMES = {
    'data_management': "home",
    'spike_evaluation': "home"
}
LOGIN_REDIRECT_URL = "/about/what_next/"

SUPPORTED_SERVICES = (
    ('data_management', 'Data'),
    ('spike_evaluation', 'Spike')
)
DEFAULT_SERVICE = SUPPORTED_SERVICES[0][0]
DEFAULT_CHARSET = 'utf-8'
# Maximum size, in bytes, of a request before it will be streamed to the
# file system instead of into memory.
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 # i.e. 1 KB

