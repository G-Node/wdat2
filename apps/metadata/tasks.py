# common imports
from metadata.models import Section
from celery.decorators import task

from apps.ext.odml.tools.xmlparser import XMLWriter, parseXML
from apps.ext.odml.doc import Document as odml_document
from apps.ext.odml.section import Section as odml_section
from apps.ext.odml.property import Property as odml_property

@task
def import_xml(xml_file, where=None):
    execute_import(xml_file, where=None)

# the function should be available without task broker
def execute_import(xml_file, where=None)
    """ Parses given XML file and imports sections/properties. Uses odML 
    parser. where should be of type Section. """
    def import_section(section, where, recursive=True):
        """ Imports one section from the odML section, recursively. """
        if where:
            assert type(where) == type(Section)
            tree_pos = where._get_next_tree_pos()
        s = Section(title=section.name, parent_section=where, tree_position=tree_pos)
        s.save() # section saved 
        for p in section.properties: # saving properties
            new_p = Property(title=p.name, section=s)
            new_p.save()
            for value in p.values:
                v = Value(data=v.value, property=p)
                v.save()
        if recursive: # recursively saving other sections
            for i in section.sections:
                import_section(i, s)
    data = parseXML(xml_file)
    for s in data.sections:
        import_section(s, where)

@task
def export_xml(sections, recursive=True):
    """ Exports given sections with all children and properties with odML parser. """
    def export_section(section, recursive=True):
        """ Exports a section into odML section, including properties. """
        s = odml_section(name=section.title)
        s.type = section.odml_type
        for p in section.get_properties():
            prop = odml_property(name=p.name, value=p.values_as_str)
            s.append(prop)
        #FIXME export files, blocks. export correctly property values!!
        if recursive: # recursively saving other sections
            for sec in section.sections:
                s.append(export_section(sec))
        return s
    doc = odml_document()
    for s in sections:
        doc.append(export_section(s, recursive=recursive))
    wrt = XMLWriter(doc)
    return wrt.header + wrt.__unicode__()

