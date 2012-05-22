from datetime import datetime

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Max
from django.utils.translation import ugettext_lazy as _
from django.shortcuts import get_object_or_404

from state_machine.models import SafetyLevel, ObjectState
from metadata.serializers import SectionSerializer, PropertySerializer, ValueSerializer

class Section(SafetyLevel, ObjectState):
    """
    Class represents a metadata "Section". Used to organize metadata 
    (mainly properties with their values) and Datafiles in a tree-like structure. 
    May be recursively linked to itself. May be made public or shared with 
    specific users.
    """
    SECTION_TYPES = (
        (0, _('Section')),
        (10, _('Project')),
        (20, _('Experiment')),
        (30, _('Dataset')),
    )
    non_cascade_rel = ("property",) # see REST JSON serializer

    name = models.CharField(_('name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    odml_type = models.IntegerField(_('type'), choices=SECTION_TYPES, default=0)
    parent_section = models.ForeignKey('self', blank=True, null=True) # link to itself to create a tree.
    tree_position = models.IntegerField(_('tree position'), blank=True) # position in the list
    # field indicates whether it is a "template" section
    is_template = models.BooleanField(_('is template'), default=False)
    # the following implements "odML vocabulary". If the section is a "template"
    # (see field above) then this is a pointer to a user, who created this 
    # default template (thus it's a personal template), and if it is "NULL" - 
    # all users see section as a "template" (odML Terminology)
    user_custom = models.ForeignKey(User, blank=True, null=True, related_name='custom_section')

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ('section_details', [str(self.id)])

    def does_belong_to(self, user):
        if self.owner == user:
            return True
        return False

    def save(self, *args, **kwargs):
        """ override save to set up default tree position. Default position for
        a section - the last in the list (on top or inside parent section) """
        if not self.tree_position:
            self.tree_position = 0
            # deprecated after versioning
            """
            if not self.parent_section: # section on top of the hierarchy
                sections = Section.objects.filter(owner=self.owner, parent_section=None)
            else:
                sections = self.parent_section.section_set.all()
            last_pos = (sections.aggregate(Max('tree_position'))['tree_position__max'] or 0)
            self.tree_position = last_pos + 1
            """
        """ one should write a validation that any self-loops are being created """
        # TODO
        super(Section, self).save(*args, **kwargs)

    @property
    def default_serializer(self):
        return SectionSerializer

    @property
    def rest_filters(self):
        """ supported filters for REST API """
        return ['top', 'section_id', 'visibility', 'owner', 'created_min', \
            'created_max']

    @property
    def sections(self):
        return self.section_set.filter(current_state=10).order_by("-tree_position")

    def get_properties(self): # returns all active properties
        return self.property_set.filter(current_state=10)	    

    def get_datafiles(self, user): # returns only accessible files
        datafiles = self.rel_datafiles.filter(current_state=10)
        datafiles = filter(lambda x: x.is_accessible(user), datafiles)
        return datafiles
    def has_datafile(self, datafile_id):
        if self.datafile_set.filter(current_state=10, id=datafile_id):
            return True
        return False

    def get_blocks(self, user): # NEO Blocks available in this Section
        return self.block_set.filter(current_state=10)
    def has_block(self, block_id):
        if self.block_set.filter(current_state=10, id=block_id):
            return True
        return False

    def get_objects_count(self, r=True):
        """ Section statistics: number of properties, datafiles, blocks, 
        files volume. Recursive, if r is True """
        properties_no = self.get_properties().count()
        datafiles_no = self.get_datafiles().count()
        blocks_no = self.get_blocks().count()
        files_vo = 0
        for f in self.get_datafiles():
            files_vo += f.raw_file.size
        if r: # retrieve statistics recursively
            for section in self.section_set.all().filter(current_state=10):
                    s1, s2, s3, s4 = section.get_objects_count()
                    properties_no += s1
                    datafiles_no += s2
                    blocks_no += s3
                    files_vo += s4
        return properties_no, datafiles_no, blocks_no, files_vo

    def copy_section(self, section, pos, recursive=True, top=False):
        """ Makes a copy of a given section, placing a copy into self. Datafiles
        and Blocks are omitted by definition. If top is True, then section stays
         at the top in the metadata tree. """
        res_tree = [] # this is to exclude self-recursion
        if top:
            parent_section = None
        else:
            parent_section = self
        new_section = Section(name=section.name, description=section.description,\
            tree_position=pos)
        new_section.save() # new_section was copied from the given section
        res_tree.append(int(new_section.id))

        for prop in section.get_properties(): # copy all properties
            prop.id = None
            prop.section = new_section
            prop.date_created = datetime.now # setup later
            prop.save()

        if recursive: # recursively copy sections inside
            for sec in section.sections:
                if not (sec.id == new_section.id): # this is to exclude self-recursion
                    res_tree.append(new_section.copy_section(sec, sec.tree_position))
        return res_tree

    def _get_next_tree_pos(self):
        """ Returns the next free index "inside" self. """
        if self.sections:
            return int(self.sections[0].tree_position) + 1
        return 1


class Property(SafetyLevel, ObjectState):
    """ 
    Class represents a metadata "Property". Defines any kind of metadata 
    property and may be linked to the Section. 
    """
    name = models.CharField(_('name'), max_length=100)
    definition = models.TextField(_('definition'), blank=True)
    dependency = models.CharField(_('dependency'), blank=True, max_length=1000)
    dependency_value = models.CharField(_('dependency_value'), blank=True, max_length=1000)
    mapping = models.CharField(_('mapping'), blank=True, max_length=1000)
    unit = models.CharField(_('unit'), blank=True, max_length=10)
    dtype = models.CharField(_('dtype'), blank=True, max_length=10)
    uncertainty = models.CharField(_('uncertainty'), blank=True, max_length=10)
    comment = models.TextField(_('comment'), blank=True)
    section = models.ForeignKey(Section)

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ('property_details', [str(self.id)])

    def does_belong_to(self, user):
        """ Defines whether this property belongs to a certain user. """
        if self.section.does_belong_to(user):
            return True
        return False

    @property
    def default_serializer(self):
        return PropertySerializer

    @property
    def values(self):
        return self.value_set.filter(current_state=10)

    @property
    def values_as_str(self):
        return ", ".join([v.data for v in self.values])

    def __len__(self):
        return len(self.values)


class Value(SafetyLevel, ObjectState):
    """ 
    Class implemented metadata Value. 
    """
    #FIXME add more attributes to the value
    parent_property = models.ForeignKey(Property) # can't use just property((
    data = models.TextField(_('value'), blank=True)

    def __unicode__(self):
        return self.data

    @models.permalink
    def get_absolute_url(self):
        return ('value_details', [str(self.id)])

    @property
    def default_serializer(self):
        return ValueSerializer


