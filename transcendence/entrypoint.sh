#!/bin/bash

set -e
export CAROOT="/app"
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 "$HOSTNAME"

if [[ -z "$APPS" ]]; then
	echo '$APPS variable not set'
	exit 1
fi
python manage.py makemigrations $APPS --noinput
python manage.py migrate --noinput
exec "$@"  # Run the CMD from Dockerfile or docker-compose
