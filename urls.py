from django.conf.urls.defaults import *
from django.conf import settings
from django.views.generic.simple import direct_to_template

from django.contrib import admin
admin.autodiscover()

from account.openid_consumer import PinaxConsumer
from blog.feeds import BlogFeedAll, BlogFeedUser
from bookmarks.feeds import BookmarkFeed
from microblogging.feeds import TweetFeedAll, TweetFeedUser, TweetFeedUserWithFriends


tweets_feed_dict = {"feed_dict": {
    'all': TweetFeedAll,
    'only': TweetFeedUser,
    'with_friends': TweetFeedUserWithFriends,
}}

blogs_feed_dict = {"feed_dict": {
    'all': BlogFeedAll,
    'only': BlogFeedUser,
}}

bookmarks_feed_dict = {"feed_dict": { '': BookmarkFeed }}


if settings.ACCOUNT_OPEN_SIGNUP:
    signup_view = "account.views.signup"
else:
    signup_view = "signup_codes.views.signup"


urlpatterns = patterns('',
    #url(r'^$', direct_to_template, {
    #    "template": "homepage.html",
    #}, name="home"),
    url(r'^$', 'account.views.login', name="home"),
    
    url(r'^admin/invite_user/$', 'signup_codes.views.admin_invite_user', name="admin_invite_user"),
    url(r'^account/signup/$', signup_view, name="acct_signup"),
    
    (r'^about/', include('about.urls')),
    (r'^account/', include('account.urls')),
    (r'^openid/(.*)', PinaxConsumer()),
    (r'^bbauth/', include('bbauth.urls')),
    (r'^authsub/', include('authsub.urls')),
    (r'^profiles/', include('profiles.urls')),
    (r'^tags/', include('tag_app.urls')),
    (r'^invitations/', include('friends_app.urls')),
    (r'^notices/', include('notification.urls')),
    (r'^messages/', include('messages.urls')),
    (r'^announcements/', include('announcements.urls')),
    (r'^comments/', include('threadedcomments.urls')),
    (r'^i18n/', include('django.conf.urls.i18n')),
    (r'^admin/(.*)', include(admin.site.urls)),
    (r'^avatar/', include('avatar.urls')),
    (r'^projects/', include('projects.urls')),
)

## @@@ for now, we'll use friends_app to glue this stuff together

from photos.models import Image

friends_photos_kwargs = {
    "template_name": "photos/friends_photos.html",
    "friends_objects_function": lambda users: Image.objects.filter(is_public=True, member__in=users),
}

from blog.models import Post

friends_blogs_kwargs = {
    "template_name": "blog/friends_posts.html",
    "friends_objects_function": lambda users: Post.objects.filter(author__in=users),
}

from microblogging.models import Tweet

friends_tweets_kwargs = {
    "template_name": "microblogging/friends_tweets.html",
    "friends_objects_function": lambda users: Tweet.objects.filter(sender_id__in=[user.id for user in users], sender_type__name='user'),
}

from bookmarks.models import Bookmark

friends_bookmarks_kwargs = {
    "template_name": "bookmarks/friends_bookmarks.html",
    "friends_objects_function": lambda users: Bookmark.objects.filter(saved_instances__user__in=users),
    "extra_context": {
        "user_bookmarks": lambda request: Bookmark.objects.filter(saved_instances__user=request.user),
    },
}

urlpatterns += patterns('',
    #url(r'^datafiles/', include('datafiles.urls')),
    url(r'^trash_folder/', include('trash_folder.urls')),
    url(r'^captcha/', include('captcha.urls')),
    url(r'^system_dashboard/', include('system_dashboard.urls')),
    url(r'^metadata/', include('metadata.urls')),
    url(r'^neo/', include('neo_api.urls')),
    url(r'^electrophysiology/', include('neo_api.urls')),
    #url(r'^labels/', include('labels.urls')),
    # - that's a jerky workaround for POST without trailing slash. If there are
    # more POST-type URL, better change to middleware:
    # http://djangosnippets.org/snippets/601/
    url(r'^task_broker/', include('djcelery.urls')),
)

if settings.SERVE_MEDIA:
    urlpatterns += patterns('',
        (r'^site_media/', include('staticfiles.urls')),
    )
