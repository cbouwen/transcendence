#!/bin/bash

set -e
python manage.py makemigrations $APPS
python manage.py migrate 
exec "$@"  # Run the CMD from Dockerfile or docker-compose
