from django.template import RequestContext, loader
from django.http import HttpResponse

def data(request):
    con = RequestContext(request)
    tp = loader.get_template('data.html')
    return HttpResponse(tp.render(con))

def test(request, file):
    con = RequestContext(request)
    tp = loader.get_template('test/' + file + '.html')
    return HttpResponse(tp.render(con))