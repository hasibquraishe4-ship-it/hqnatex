#!/usr/bin/env bash

set +e
set +u
set +o pipefail 2>/dev/null

ROOT="$HOME/hqnatex"

CORE="$ROOT/core"
FRONTEND="$ROOT/frontend"

RUNTIME_DIR="$ROOT/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

POSTGRES_ENSURE="$ROOT/scripts/hqnatex-postgres-ensure.sh"


BACKEND_ENSURE="$ROOT/scripts/hqnatex-backend-ensure.sh"
LOCK_FILE="$RUNTIME_DIR/hqnatex-runtime-autostart.lock"

AUTOSTART_LOG="$LOG_DIR/runtime-autostart.log"

FRONTEND_LOG="$LOG_DIR/frontend-vite.log"
FRONTEND_PID_FILE="$PID_DIR/frontend-vite.pid"


mkdir -p "$RUNTIME_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"


port_open() {

python - "$1" <<'PY'
import socket
import sys

port = int(sys.argv[1])

sock = socket.socket()
sock.settimeout(1)

try:
    sock.connect(
        ("127.0.0.1", port)
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

    exec 9>"$LOCK_FILE"

    if ! flock -n 9
    then
        echo "AUTOSTART_ALREADY_RUNNING=YES"
        return 0
    fi


    echo "=================================================="
    echo "HQNATEX_RUNTIME_AUTOSTART"
    echo "TIME=$(date -Iseconds)"
    echo "HOSTNAME=$(hostname)"
    echo "=================================================="


    # ----------------------------------------------
    # Docker may need a few seconds after VM boot.
    # ----------------------------------------------

    DOCKER_READY=0

    for i in $(seq 1 30)
    do

        if docker info >/dev/null 2>&1
        then
            DOCKER_READY=1

            echo "DOCKER_READY=YES"
            echo "DOCKER_READY_ATTEMPT=$i"

            break
        fi

        sleep 2

    done


    if [ "$DOCKER_READY" -ne 1 ]
    then
        echo "DOCKER_READY=NO"
        echo "RUNTIME_AUTOSTART=BLOCKED"
        return 1
    fi


    # ----------------------------------------------
    # PostgreSQL
    # ----------------------------------------------

    if [ ! -x "$POSTGRES_ENSURE" ]
    then
        echo "POSTGRES_ENSURE_SCRIPT=MISSING"
        echo "RUNTIME_AUTOSTART=BLOCKED"
        return 1
    fi


    "$POSTGRES_ENSURE"

    POSTGRES_RC=$?

    echo "POSTGRES_ENSURE_RC=$POSTGRES_RC"


    if [ "$POSTGRES_RC" -ne 0 ]
    then
        echo "POSTGRES_AUTOSTART=FAIL"
        echo "RUNTIME_AUTOSTART=FAIL"
        return 1
    fi


    if port_open 55432
    then
        echo "POSTGRES_PORT_55432=UP"
    else
        echo "POSTGRES_PORT_55432=DOWN"
        echo "RUNTIME_AUTOSTART=FAIL"
        return 1
    fi


    # ----------------------------------------------
    # HQNATEX_RUNTIME_BACKEND_INTEGRATION_V2
    # Backend / Gunicorn
    # PostgreSQL must be ready before Backend.
    # ----------------------------------------------

    if [ ! -x "$BACKEND_ENSURE" ]
    then
        echo "BACKEND_ENSURE_SCRIPT=MISSING"
        echo "RUNTIME_AUTOSTART=BLOCKED"
        return 1
    fi


    "$BACKEND_ENSURE"

    BACKEND_RC=$?

    echo "BACKEND_ENSURE_RC=$BACKEND_RC"


    if [ "$BACKEND_RC" -ne 0 ]
    then
        echo "BACKEND_AUTOSTART=FAIL"
        echo "RUNTIME_AUTOSTART=FAIL"
        return 1
    fi


    if port_open 8000
    then
        echo "BACKEND_PORT_8000=UP"
    else
        echo "BACKEND_PORT_8000=DOWN"
        echo "RUNTIME_AUTOSTART=FAIL"
        return 1
    fi


    BACKEND_HTTP_CODE="$(
        curl \
          -s \
          -o /dev/null \
          -w '%{http_code}' \
          http://127.0.0.1:8000/api/v1/health/live \
          2>/dev/null
    )"


    echo "BACKEND_HTTP_CODE=$BACKEND_HTTP_CODE"


    if [ "$BACKEND_HTTP_CODE" != "200" ]
    then
        echo "BACKEND_HTTP_CERT=FAIL"
        echo "RUNTIME_AUTOSTART=FAIL"
        return 1
    fi


    echo "BACKEND_HTTP_CERT=PASS"


    # ----------------------------------------------
    # Frontend / Vite
    # ----------------------------------------------

    if port_open 5173
    then

        echo "FRONTEND_PORT_5173=ALREADY_UP"

    else

        echo "FRONTEND_PORT_5173=DOWN"
        echo "FRONTEND_START=STARTING"


        if [ ! -f "$FRONTEND/package.json" ]
        then
            echo "FRONTEND_PACKAGE_JSON=MISSING"
            echo "RUNTIME_AUTOSTART=FAIL"
            return 1
        fi


        if [ ! -d "$FRONTEND/node_modules" ]
        then
            echo "FRONTEND_NODE_MODULES=MISSING"
            echo "RUNTIME_AUTOSTART=FAIL"
            return 1
        fi


        if [ -f "$FRONTEND_PID_FILE" ]
        then

            OLD_PID="$(
                cat \
                  "$FRONTEND_PID_FILE" \
                  2>/dev/null
            )"


            if [ -n "$OLD_PID" ] && \
               ! kill -0 "$OLD_PID" 2>/dev/null
            then
                rm -f "$FRONTEND_PID_FILE"
                echo "STALE_FRONTEND_PID_REMOVED=YES"
            fi

        fi


        cd "$FRONTEND" || return 1


        nohup \
          npm run dev -- \
            --port 5173 \
          >> "$FRONTEND_LOG" \
          2>&1 &


        FRONTEND_PID=$!


        echo "$FRONTEND_PID" \
          > "$FRONTEND_PID_FILE"


        echo "FRONTEND_PID=$FRONTEND_PID"


        FRONTEND_READY=0


        for i in $(seq 1 40)
        do

            if port_open 5173
            then
                FRONTEND_READY=1

                echo "FRONTEND_READY_ATTEMPT=$i"

                break
            fi

            sleep 1

        done


        if [ "$FRONTEND_READY" -ne 1 ]
        then

            echo "FRONTEND_PORT_5173=DOWN"

            tail -80 \
              "$FRONTEND_LOG" \
              2>/dev/null

            echo "RUNTIME_AUTOSTART=FAIL"

            return 1
        fi


        echo "FRONTEND_PORT_5173=UP"

    fi


    # ----------------------------------------------
    # HTTP check
    # ----------------------------------------------

    HTTP_CODE="$(
        curl \
          -s \
          -o /dev/null \
          -w '%{http_code}' \
          http://127.0.0.1:5173/ \
          2>/dev/null
    )"


    echo "FRONTEND_HTTP_CODE=$HTTP_CODE"


    if [ "$HTTP_CODE" != "200" ]
    then
        echo "FRONTEND_HTTP_CERT=FAIL"
        echo "RUNTIME_AUTOSTART=FAIL"

        return 1
    fi


    echo "FRONTEND_HTTP_CERT=PASS"


    echo "POSTGRES_AUTOSTART=PASS"
    echo "BACKEND_AUTOSTART=PASS"
    echo "FRONTEND_AUTOSTART=PASS"
    echo "RUNTIME_AUTOSTART=PASS"
    echo "=================================================="


    return 0
}


main "$@" >> "$AUTOSTART_LOG" 2>&1
