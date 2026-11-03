#!/usr/bin/env bash

set +e
set +u
set +o pipefail 2>/dev/null

ROOT="$HOME/hqnatex"
COMPOSE="$ROOT/docker-compose.yml"
DATA_DIR="$ROOT/.runtime/postgres_data"
BACKUP_ROOT="$ROOT/HQNATEX_BACKUPS"


port_open() {
python - <<'PY'
import socket

sock = socket.socket()
sock.settimeout(1)

try:
    sock.connect(
        ("127.0.0.1", 55432)
    )
except Exception:
    raise SystemExit(1)
else:
    raise SystemExit(0)
finally:
    sock.close()
PY
}


main() {

    echo "=================================================="
    echo "HQNATEX_POSTGRES_ENSURE"
    echo "=================================================="


    if ! docker info >/dev/null 2>&1
    then
        echo "DOCKER_READY=NO"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi

    echo "DOCKER_READY=YES"


    # Existing database is mandatory.
    # Never create a replacement database here.

    if ! sudo -n test -f \
        "$DATA_DIR/PG_VERSION"
    then
        echo "EXISTING_POSTGRES_DATA=NO"
        echo "REFUSING_AUTOMATIC_DATABASE_INITIALIZATION=YES"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi


    if ! sudo -n test -d \
        "$DATA_DIR/base"
    then
        echo "POSTGRES_BASE_DIRECTORY=MISSING"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi


    if ! sudo -n test -d \
        "$DATA_DIR/global"
    then
        echo "POSTGRES_GLOBAL_DIRECTORY=MISSING"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi


    if ! sudo -n test -d \
        "$DATA_DIR/pg_wal"
    then
        echo "POSTGRES_WAL_DIRECTORY=MISSING"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi


    PG_VERSION_VALUE="$(
        sudo -n cat \
          "$DATA_DIR/PG_VERSION" \
          2>/dev/null
    )"

    PG_VERSION_RC=$?


    if [ "$PG_VERSION_RC" -ne 0 ] || \
       [ -z "$PG_VERSION_VALUE" ]
    then
        echo "POSTGRES_DATA_VERSION_READ=FAIL"
        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
        return 1
    fi


    echo "POSTGRES_DATA_VERSION=$PG_VERSION_VALUE"
    echo "EXISTING_POSTGRES_DATA=YES"


    CID="$(
        docker compose \
          -f "$COMPOSE" \
          ps -q postgres \
          2>/dev/null
    )"


    RUNNING=0


    if [ -n "$CID" ]
    then

        RUNNING_VALUE="$(
            docker inspect \
              "$CID" \
              --format '{{.State.Running}}' \
              2>/dev/null
        )"


        if [ "$RUNNING_VALUE" = "true" ]
        then
            RUNNING=1
        fi
    fi


    if [ -n "$CID" ]
    then
        echo "POSTGRES_CONTAINER_PRESENT=YES"
    else
        echo "POSTGRES_CONTAINER_PRESENT=NO"
    fi


    if [ "$RUNNING" -eq 1 ]
    then
        echo "POSTGRES_CONTAINER_RUNNING=YES"
    else
        echo "POSTGRES_CONTAINER_RUNNING=NO"
    fi


    if port_open
    then

        echo "POSTGRES_PORT_55432=OPEN"


        if [ -z "$CID" ]
        then
            echo "PORT_OWNER_CERT=FAIL_NO_COMPOSE_CONTAINER"
            echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
            return 1
        fi


        if [ "$RUNNING" -ne 1 ]
        then
            echo "PORT_OWNER_CERT=FAIL_CONTAINER_NOT_RUNNING"
            echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
            return 1
        fi


        echo "PORT_OWNER_CERT=PASS"

    else

        echo "POSTGRES_PORT_55432=CLOSED"


        if [ "$RUNNING" -ne 1 ]
        then

            # Count only real PostgreSQL executables.
            # Do NOT grep the full command line because this script
            # itself contains "postgres" in its filename.
            HOST_POSTGRES_PIDS="$(
                ps -eo pid=,comm= \
                  | awk '
                      $2 == "postgres" ||
                      $2 == "postmaster" {
                          print $1
                      }
                    '
            )"

            HOST_POSTGRES_COUNT="$(
                printf '%s\n' "$HOST_POSTGRES_PIDS" \
                  | sed '/^[[:space:]]*$/d' \
                  | wc -l
            )"


            LISTENER_COUNT="$(
                ss -ltn \
                  2>/dev/null \
                  | grep -E ':5432|:55432' \
                  | wc -l
            )"


            echo "HOST_POSTGRES_PROCESS_COUNT=$HOST_POSTGRES_COUNT"
            echo "POSTGRES_LISTENER_COUNT=$LISTENER_COUNT"


            if sudo -n test -f \
                "$DATA_DIR/postmaster.pid"
            then

                echo "POSTMASTER_PID_PRESENT=YES"


                if [ "$HOST_POSTGRES_COUNT" -eq 0 ] && \
                   [ "$LISTENER_COUNT" -eq 0 ]
                then

                    STAMP="$(
                        date +%Y%m%d_%H%M%S
                    )"


                    PID_BACKUP_DIR="$BACKUP_ROOT/PRE_POSTGRES_ENSURE_STALE_PID_${STAMP}"

                    mkdir -p \
                      "$PID_BACKUP_DIR"


                    sudo -n cp \
                      "$DATA_DIR/postmaster.pid" \
                      "$PID_BACKUP_DIR/postmaster.pid.stale"

                    PID_BACKUP_RC=$?


                    if [ "$PID_BACKUP_RC" -ne 0 ]
                    then
                        echo "STALE_PID_BACKUP=FAIL"
                        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
                        return 1
                    fi


                    sudo -n chown \
                      "$(id -u):$(id -g)" \
                      "$PID_BACKUP_DIR/postmaster.pid.stale" \
                      2>/dev/null


                    echo "STALE_PID_BACKUP=PASS"
                    echo "STALE_PID_BACKUP_DIR=$PID_BACKUP_DIR"


                    sudo -n rm \
                      "$DATA_DIR/postmaster.pid"

                    PID_REMOVE_RC=$?


                    if [ "$PID_REMOVE_RC" -ne 0 ]
                    then
                        echo "STALE_PID_REMOVE=FAIL"
                        echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
                        return 1
                    fi


                    echo "STALE_PID_REMOVE=PASS"

                else

                    echo "STALE_PID_REMOVE=BLOCKED_ACTIVE_POSTGRES_EVIDENCE"
                    echo "HQNATEX_POSTGRES_ENSURE=BLOCKED"
                    return 1

                fi

            else

                echo "POSTMASTER_PID_PRESENT=NO"

            fi
        fi


        echo "POSTGRES_COMPOSE_UP=STARTING"


        docker compose \
          -f "$COMPOSE" \
          up -d postgres

        START_RC=$?


        if [ "$START_RC" -ne 0 ]
        then
            echo "POSTGRES_COMPOSE_UP=FAIL"
            echo "HQNATEX_POSTGRES_ENSURE=FAIL"
            return 1
        fi


        echo "POSTGRES_COMPOSE_UP=PASS"

    fi


    READY=0


    for i in $(seq 1 45)
    do

        if port_open
        then
            READY=1
            echo "POSTGRES_READY_ATTEMPT=$i"
            break
        fi

        sleep 2
    done


    if [ "$READY" -ne 1 ]
    then

        echo "POSTGRES_READY=NO"

        docker compose \
          -f "$COMPOSE" \
          logs \
          --tail 80 \
          postgres \
          2>&1

        echo "HQNATEX_POSTGRES_ENSURE=FAIL"
        return 1
    fi


    echo "POSTGRES_READY=YES"


    CID="$(
        docker compose \
          -f "$COMPOSE" \
          ps -q postgres \
          2>/dev/null
    )"


    if [ -z "$CID" ]
    then
        echo "POSTGRES_CONTAINER=NOT_FOUND"
        echo "HQNATEX_POSTGRES_ENSURE=FAIL"
        return 1
    fi


    echo "POSTGRES_CONTAINER_ID=$CID"


    MOUNT_SOURCE="$(
        docker inspect \
          "$CID" \
          --format \
          '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Source}}{{end}}{{end}}' \
          2>/dev/null
    )"


    echo "POSTGRES_DATA_MOUNT_SOURCE=$MOUNT_SOURCE"


    if [ "$MOUNT_SOURCE" != "$DATA_DIR" ]
    then
        echo "EXISTING_DATA_MOUNT_CERT=FAIL"
        echo "HQNATEX_POSTGRES_ENSURE=FAIL"
        return 1
    fi


    echo "EXISTING_DATA_MOUNT_CERT=PASS"


    RESTART_POLICY="$(
        docker inspect \
          "$CID" \
          --format \
          '{{.HostConfig.RestartPolicy.Name}}' \
          2>/dev/null
    )"


    echo "POSTGRES_RESTART_POLICY=$RESTART_POLICY"


    if [ "$RESTART_POLICY" != "unless-stopped" ]
    then
        echo "POSTGRES_RESTART_POLICY_CERT=FAIL"
        echo "HQNATEX_POSTGRES_ENSURE=FAIL"
        return 1
    fi


    echo "POSTGRES_RESTART_POLICY_CERT=PASS"


    HEALTH="$(
        docker inspect \
          "$CID" \
          --format \
          '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
          2>/dev/null
    )"


    echo "POSTGRES_HEALTH_INITIAL=$HEALTH"


    if [ "$HEALTH" != "none" ]
    then

        HEALTH_READY=0


        for i in $(seq 1 30)
        do

            HEALTH="$(
                docker inspect \
                  "$CID" \
                  --format \
                  '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
                  2>/dev/null
            )"


            if [ "$HEALTH" = "healthy" ]
            then
                HEALTH_READY=1
                echo "POSTGRES_HEALTH_READY_ATTEMPT=$i"
                break
            fi

            sleep 2
        done


        if [ "$HEALTH_READY" -ne 1 ]
        then
            echo "POSTGRES_HEALTH=$HEALTH"
            echo "POSTGRES_HEALTH_CERT=FAIL"
            echo "HQNATEX_POSTGRES_ENSURE=FAIL"
            return 1
        fi
    fi


    echo "POSTGRES_HEALTH=$HEALTH"
    echo "POSTGRES_HEALTH_CERT=PASS"


    if ! port_open
    then
        echo "FINAL_PORT_55432_CERT=FAIL"
        echo "HQNATEX_POSTGRES_ENSURE=FAIL"
        return 1
    fi


    echo "FINAL_PORT_55432_CERT=PASS"
    echo "DATABASE_INITIALIZED_NEW=NO"
    echo "EXISTING_DATA_REUSED=YES"
    echo "HQNATEX_POSTGRES_ENSURE=PASS"
    echo "=================================================="


    return 0
}


main "$@"
