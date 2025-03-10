#!/bin/bash
export HOSTNAME=$(hostname)
echo "HOSTNAME is set to: $HOSTNAME"
docker compose up
