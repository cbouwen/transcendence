#!/bin/bash

set -e
python manage.py makemigrations $APPS --noinput
python manage.py migrate --noinput
exec "$@"  # Run the CMD from Dockerfile or docker-compose
