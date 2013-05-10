#!/usr/bin/env python

"""
Script to update version number in a particular file with a particular
template.
"""

FILE     = 'src/version.js'
REGEXP   = r'version.\=.\'(\d+)\.(\d+)\.(\d+)\';'
TEMPLATE = "wdat.version = '%d.%d.%d';"

def print_help():
  print """
  Usage:
    %> python version.py help       or    %> python version.py

    Displays this help text and exits.


    %> python version.py show

    Displays current version number and exists.


    %> python version.py (inc | dec) (major | minor | patch)

    Increments or decrements specified version number according to sensible
    rules.  Saves this new version to file and exits.


  """

if __name__ == "__main__":
  import re
  import sys

  # Read the file-contents into memory as a list of lines
  fd = open(FILE)
  fc = fd.readlines()
  fd.close()

  # Found the version line?
  found_flag = False

  for line in fc:
    m = re.search(REGEXP, line)
    if m:
      found_flag = True

      major = int(m.group(1))
      minor = int(m.group(2))
      patch = int(m.group(3))

      if (len(sys.argv) == 2 and sys.argv[1] == 'show'):
        print "Current version is %d.%d.%d\n" %(major, minor, patch)
        sys.exit()

      if (len(sys.argv) != 3  or sys.argv[1] == 'help'):
        # Not enough arguments print help and exit()
        print "Not enough arguments"
        print_help()
        sys.exit()

      # Based on arguments manipulate the version numbers
      if   sys.argv[1] == 'inc':
        inc = 1
      elif sys.argv[1] == 'dec':
        inc = -1

      if   sys.argv[2] == 'major':
        major += inc
        minor = 0
        patch = 0
      elif sys.argv[2] == 'minor':
        minor += inc
        patch = 0
      elif sys.argv[2] == 'patch':
        patch += inc

      # Change the correct line based on the new version numbers 
      print fc.index(line)
      fc[fc.index(line)] = TEMPLATE %(major, minor, patch)

      # Now write the results to the file
      fd = open(FILE, 'w')
      fd.write(''.join(fc))
      fd.close()

      print "Version number bumped upto " + TEMPLATE %(major, minor, patch)
