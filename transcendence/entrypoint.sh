#!/bin/bash

set -e
if [[ -z "$APPS" ]]; then
	echo '$APPS variable not set'
	exit 1
fi
python manage.py makemigrations $APPS --noinput
python manage.py migrate --noinput
exec "$@"  # Run the CMD from Dockerfile or docker-compose
