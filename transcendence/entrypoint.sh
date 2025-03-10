#!/bin/bash

set -e
export CAROOT="/app"
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 "$HOSTNAME"

python manage.py makemigrations tetris accounts --noinput
python manage.py migrate --noinput
exec "$@"  # Run the CMD from Dockerfile or docker-compose
