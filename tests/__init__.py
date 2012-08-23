## initially a quick smoke test to see if certain URLs throw exceptions or not
## would have caught a high percentage of recent trunk breakages

class BaseTests(TestCase):

    def smoke_test(self):
        from django.test.client import Client
        c = Client()
        
        pages = [
            '/',
            '/about/',
            '/profiles/',
            '/invitations/',
            '/notices/',
            '/messages/',
            '/announcements/'
        ]
        
        for page in pages:
            print page,
            try:
                x = c.get(page)
                if x.status_code in [301, 302]:
                    print x.status_code, "=>", x["Location"]
                else:
                    print x.status_code
                    
            except Exception, e:
                print e
