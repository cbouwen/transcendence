set -x
set -e
docker compose down --volumes
bash run.sh $@
