#!/bin/bash
export HOSTNAME=$(hostname)
docker compose up $@
