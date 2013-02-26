from datetime import datetime

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Max
from django.utils.translation import ugettext_lazy as _
from django.shortcuts import get_object_or_404

from state_machine.models import SafetyLevel, ObjectState, VersionedForeignKey
from metadata.serializers import SectionSerializer, PropertySerializer, ValueSerializer

class Section(SafetyLevel, ObjectState):
    """
    Class represents a metadata "Section". Used to organize metadata 
    (properties - values), Datafiles and NEO Blocks in a tree-like structure. 
    May be recursively linked to itself. May be made public or shared with 
    specific users.
    """
    non_cascade_rel = ("property",) # see REST JSON serializer

    name = models.CharField(max_length=100)
    description = models.TextField(max_length=100, blank=True, null=True)
    odml_type = models.CharField(max_length=50, blank=True, null=True)
    parent_section = VersionedForeignKey('self', blank=True, null=True) # link to itself to create a tree.
    # position in the list on the same level in the tree
    tree_position = models.IntegerField(default=0)
    # field indicates whether it is a "template" section
    is_template = models.BooleanField(default=False)
    # the following implements "odML vocabulary". If the section is a "template"
    # (see field above) then this is a pointer to a user, who created this 
    # default template (thus it's a personal template), and if it is "NULL" - 
    # all users see section as a "template" (odML Terminology)
    user_custom = models.ForeignKey(User, blank=True, null=True, related_name='custom_section')

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ('section_details', [str(self.local_id)])

    @property
    def default_serializer(self):
        return SectionSerializer

    @property
    def sections(self):
        return self.section_set.order_by("-tree_position")

    def get_properties(self): # returns all active properties
        return self.property_set.all()

    def traverse_ids(self):
        """ return all section ids located inside self recursively, by 
        traversing every branch of the section tree. Transparent but very 
        unefficient, could make lots of DB hits """
        ids = [s.pk for s in self.sections]
        for s in self.sections:
            ids += s.traverse_ids()
        return ids

    def fetch_deep_ids(self, ids):
        """ return all section ids located inside sections with given ids. This
        function as many sql calls as there are levels of the section tree """
        down_one_level = self.__class__.objects.filter( parent_section_id__in=ids )
        down_one_level = list( down_one_level.values_list( 'pk', flat=True ) )
        if down_one_level:
            return ids + self.fetch_deep_ids( down_one_level )
        return ids

    def stats(self, cascade=False):
        """ Section statistics """
        sec_ids = [ self.pk ]
        if cascade: # recursively traverse a tree of child sections
            sec_ids = self.fetch_deep_ids( sec_ids )

        stats = {} # calculate section statistics
        for rm in self._meta.get_all_related_objects():
            k = rm.name
            if not rm.model == self.__class__:
                kwargs = { rm.field.name + '_id__in': sec_ids }
                v = rm.model.objects.filter( **kwargs ).count()
            else:
                v = len(sec_ids) - 1 # exclude self
            stats[ k ] = v
        return stats

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
    name = models.CharField('name', max_length=100)
    definition = models.TextField('definition', blank=True, null=True)
    dependency = models.CharField('dependency', blank=True, null=True, max_length=1000)
    dependency_value = models.CharField('dependency_value', blank=True, null=True, max_length=1000)
    mapping = models.CharField('mapping', blank=True, null=True, max_length=1000)
    unit = models.CharField('unit', blank=True, null=True, max_length=10)
    dtype = models.CharField('dtype', blank=True, null=True, max_length=10)
    uncertainty = models.CharField('uncertainty', blank=True, null=True, max_length=10)
    comment = models.TextField('comment', blank=True, null=True)
    section = VersionedForeignKey(Section)

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ('property_details', [str(self.local_id)])

    @property
    def default_serializer(self):
        return PropertySerializer

    @property
    def values(self):
        return self.value_set.all()

    @property
    def values_as_str(self):
        return ", ".join([v.data for v in self.values])


class Value(SafetyLevel, ObjectState):
    """ 
    Class implemented metadata Value. 
    """
    #FIXME add more attributes to the value
    parent_property = VersionedForeignKey(Property) # can't use just property((
    data = models.TextField('value')

    def __unicode__(self):
        return self.data

    @models.permalink
    def get_absolute_url(self):
        return ('value_details', [str(self.local_id)])

    @property
    def default_serializer(self):
        return ValueSerializer


# supporting functions
#===============================================================================

meta_classnames = {
    "section": Section,
    "property": Property,
    "value": Value
}

backbone = {}
safe = ['safety_level', 'odml_type', 'is_template', 'user_custom']
for obj_type, cls in meta_classnames.items():
    params = {}
    params[ 'attributes' ] = [field.name for field in cls._meta.local_fields if\
        field.editable and not field.rel and not field.name in safe]
    params[ 'required' ] = [field.name for field in cls._meta.local_fields if\
        field.editable and not field.name in safe and not field.null]
    params[ 'parents' ] = [field.name for field in cls._meta.local_fields if\
        field.__class__ in [VersionedForeignKey] and not field.name in safe]
    backbone[ obj_type ] = params


