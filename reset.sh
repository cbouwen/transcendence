set -x
set -e
bash remove_migrations.sh
docker compose down --volumes
bash run.sh --build $@
