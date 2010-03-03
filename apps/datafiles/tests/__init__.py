from django.test import TestCase
from datafiles.models import Datafile

#SERVER_NAME = "portal.g-node.pri"
#SERVER_NAME = "localhost"
SERVER_NAME = "testserver"

class DatafilesTest(TestCase):
    fixtures = ["datafiles.json"]

    """ Tests for general actions """



    """ Tests for not logged-in user """

    def test_unauth_personal_list_get(self):
        """ can an unauth'd user retrieve a list of personal files? """
	""" expected: can't perform action """
        
        response = self.client.get("/datafiles/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["location"], "http://" + SERVER_NAME + "/account/login/?next=/datafiles/")

    def test_unauth_public_list_get(self):
        """ can an unauth'd user retrieve a list of public files? """
	""" expected: can't perform action """
        
        response = self.client.get("/datafiles/alldatafiles/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["location"], "http://" + SERVER_NAME + "/account/login/?next=/datafiles/alldatafiles/")

    def test_unauth_file_create(self):
        """ can an unauth'd user upload a file? """
	""" expected: can't perform action """
        
	f = open('apps/datafiles/tests/Bach_WTC1_Richter_01.mp3')
	response = self.client.post('/datafiles/create/', {'title': 'TestFile1', 'raw_file': f})
	f.close()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["location"], "http://" + SERVER_NAME + "/account/login/?next=/datafiles/create/")
	
    def test_unauth_file_details(self):
        """ can an unauth'd user see files details? """
	""" expected: can't perform action """
        
        response = self.client.get("/datafiles/details/1/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["location"], "http://" + SERVER_NAME + "/account/login/?next=/datafiles/details/1/")

    """ Tests for logged-in independent (in relation to the datafile) user. 
    The file is *specifically* shared with the user (see privacy model 
    description in state_machine app). """





    """ Tests for logged-in user. The user is a *friend* to the user 
    who owns the datafile. """






