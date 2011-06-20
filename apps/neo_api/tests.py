from django.test import TestCase

# test suite:
# - object creation
# - object update
# - get object full/data/relations
# - delete object
# - exceptions handling
# - security


class CreateTest(TestCase):
    """
    This is a set of tests which test NEO object creation.
    """
    fixtures = ['users.json', 'blocks.json']

    def setUp(self):
        logged_in = self.client.login(username='bob', password='pass')
        self.assertTrue(logged_in)

    def test_block(self):
        """
        Creates new Block.
        """
        response = self.client.post('/neo/', {
            "obj_type": "block",
            "name": "Block of recordings from May, 10",
            "filedatetime": "2011-10-05",
            "index": 1
        })
        self.assertContains(response, "neo_id", status_code=200)
