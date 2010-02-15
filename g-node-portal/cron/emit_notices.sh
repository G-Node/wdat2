#!/bin/sh

WORKON_HOME=/data/apps/g-node-portal
PROJECT_ROOT=/data/apps/g-node-portal/g-node-portal

# activate virtual environment
. $WORKON_HOME/pinax-env/bin/activate

cd $PROJECT_ROOT
python manage.py emit_notices >> $PROJECT_ROOT/logs/cron_mail.log 2>&1
