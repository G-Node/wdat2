from django.template import RequestContext, loader
from django.http import HttpResponse
from django.shortcuts import render_to_response
import os

def wdat(request):
    con = RequestContext(request)
    tp = loader.get_template('wdat.html')
    return HttpResponse(tp.render(con))

def test(request, filename):
    context = RequestContext(request)
    template = 'test/' + filename
    if not filename.endswith('.html'):
        template += '.html'
    data = {}
    files = os.listdir('./apps/wdat/templates/test')
    files.sort()
    data['files'] = files
    return render_to_response(template, data, context_instance=context)