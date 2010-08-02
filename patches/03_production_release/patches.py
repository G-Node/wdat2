import os
import sys

local_path = "/home/sobolev/apps/pinax-source"
sys.path.append(str(local_path))
sys.path.append(str(local_path) + "/g-node-portal")
sys.path.append(str(local_path) + "/g-node-portal/apps")
sys.path.append(str(local_path) + "/lib/python2.6/site-packages")
sys.path.append(str(local_path) + "/lib/python2.6/site-packages/pinax/apps")
os.environ['DJANGO_SETTINGS_MODULE'] = 'g-node-portal.settings'
       
from experiments.models import Experiment
from datasets.models import RDataset
from datafiles.models import Datafile
from metadata.models import Section, Property
print "successfully initialized"


class migration():

    def update_experiments(self):
        # transforming experiments
        a = 0
        for exprt in Experiment.objects.all():
            if not Section.objects.filter(parent_exprt=exprt):
                section = Section(title="metadata root", parent_exprt=exprt, tree_position=1)
                section.save()
            else:
                section = Section.objects.filter(parent_exprt=exprt)[0]
            prop1 = Property(prop_title="Subject", prop_value=exprt.subject, prop_parent_section=section)
            prop1.save()
            if exprt.exp_type == 1:
                tp = "electrophysiology"
            elif exprt.exp_type == 2:
                tp = "behaviour"
            elif exprt.exp_type == 3:
                tp = "imaging"
            elif exprt.exp_type == 4:
                tp = "modelling"
            else:
                tp = "other"
            prop2 = Property(prop_title="Experiment Type", prop_value=tp, prop_parent_section=section)
            prop2.save()
            # relinking objects
            for rdts in exprt.rdataset_set.all():
                section.addLinkedObject(rdts, "dataset")
                section.save()
            for dtf in exprt.datafile_set.all():
                section.addLinkedObject(dtf, "datafile")
                section.save()
            a += 1
        print ("'%s' experiments processed" % a)


    def update_datasets(self):
        # transforming datasets
        a = 0
        for dataset in RDataset.objects.all():
            if not Section.objects.filter(parent_dataset=dataset):
                section = Section(title="metadata root", parent_dataset=dataset, tree_position=1)
                section.save()
            else:
                section = Section.objects.filter(parent_dataset=dataset)[0]
            if dataset.dataset_qty == 1:
                tp = "low"
            elif dataset.dataset_qty == 2:
                tp = "average"
            elif dataset.dataset_qty == 3:
                tp = "medium"
            elif dataset.dataset_qty == 4:
                tp = "good"
            elif dataset.dataset_qty == 5:
                tp = "excellent"
            else:
                tp = "n/a"
            prop = Property(prop_title="Dataset Quality", prop_value=tp, prop_parent_section=section)
            prop.save()
            # relinking objects
            for dtf in dataset.datafile_set.all():
                section.addLinkedObject(dtf, "datafile")
            a += 1
        print ("'%s' datasets processed" % a)
        

    def update_datafiles(self):
        # transforming datafiles
        a = 0
        for datafile in Datafile.objects.all():
            if not Section.objects.filter(parent_datafile=datafile):
                section = Section(title="metadata root", parent_datafile=datafile, tree_position=1)
                section.save()
            else:
                section = Section.objects.filter(parent_datafile=datafile)[0]
            prop = Property(prop_title="Recording Date", prop_value=datafile.recording_date, prop_parent_section=section)
            prop.save()
            a += 1
        print ("'%s' datafiles processed" % a)
        


