FROM python:3.10-slim-bullseye

RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    libpq-dev \
    pkg-config \
    libcairo2-dev \
    gcc \
    build-essential \
    python3-distutils-extra \
    python3-apt \
    libyaml-dev \
    libsystemd-dev \
    libdbus-1-dev \
    libdbus-glib-1-dev \
    libcups2-dev \
    libgirepository1.0-dev \
    gir1.2-gtk-3.0 \
    && apt-get clean

WORKDIR /app

COPY requirements.txt /app/
RUN pip3 install --no-cache-dir --default-timeout=100 --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt
RUN pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org  psycopg2

EXPOSE 8000

ENV DJANGO_SETTINGS_MODULE=transcendence.settings

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "transcendence.wsgi:application"] # what is the point of this statement when it will be overridden by docker-compose.yml ?
