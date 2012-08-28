from django.template import RequestContext, loader
from django.http import HttpResponse

def data(request):
    con = RequestContext(request)
    tp = loader.get_template('data.html')
    return HttpResponse(tp.render(con))

def metadata(request):
    con = RequestContext(request)
    tp = loader.get_template('metadata.html')
    return HttpResponse(tp.render(con))

def plot(request):
    con = RequestContext(request)
    tp = loader.get_template('plot.html')
    return HttpResponse(tp.render(con))