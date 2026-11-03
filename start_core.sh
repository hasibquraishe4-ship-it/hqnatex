#!/bin/bash
set -a
source core/.env.core
set +a
docker run -d --name core-postgres -p 55432:5432 \
  -e POSTGRES_DB=$HQNATEX_DB_NAME \
  -e POSTGRES_USER=$HQNATEX_DB_ADMIN_USER \
  -e POSTGRES_PASSWORD=$HQNATEX_DB_ADMIN_PASSWORD \
  postgres:16-alpine
docker run -d --name core-redis -p 56379:6379 redis:7-alpine
