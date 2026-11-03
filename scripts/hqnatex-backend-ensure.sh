#!/usr/bin/env bash

set +e
set +u
set +o pipefail 2>/dev/null

ROOT="$HOME/hqnatex"
CORE="$ROOT/core"

RUNTIME_DIR="$ROOT/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

PID_FILE="$PID_DIR/backend-gunicorn.pid"

ACCESS_LOG="$LOG_DIR/backend-gunicorn-access.log"
ERROR_LOG="$LOG_DIR/backend-gunicorn-error.log"

GUNICORN="$CORE/.venv/bin/gunicorn"

BACKEND_HOST="127.0.0.1"
BACKEND_PORT="8000"

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


backend_process_count() {

    ps -eo pid=,args= \
      | grep -E \
        '[g]unicorn.*config\.wsgi:application' \
      | wc -l

}


main() {

    echo "=================================================="
    echo "HQNATEX_BACKEND_ENSURE"
    echo "=================================================="


    if [ ! -x "$GUNICORN" ]
    then
        echo "GUNICORN_BINARY=NOT_FOUND"
        echo "HQNATEX_BACKEND_ENSURE=BLOCKED"
        return 1
    fi


    if [ ! -f "$CORE/config/wsgi.py" ]
    then
        echo "WSGI_APPLICATION_FILE=NOT_FOUND"
        echo "HQNATEX_BACKEND_ENSURE=BLOCKED"
        return 1
    fi


    if [ ! -f "$CORE/.env.core" ]
    then
        echo "CORE_ENV_FILE=NOT_FOUND"
        echo "HQNATEX_BACKEND_ENSURE=BLOCKED"
        return 1
    fi


    cd "$CORE" || return 1


    source .venv/bin/activate


    set -a
    source .env.core
    set +a


    EXPECTED_PROCESS_COUNT="$(
        backend_process_count
    )"


    echo "BACKEND_PROCESS_COUNT_BEFORE=$EXPECTED_PROCESS_COUNT"


    if port_open "$BACKEND_PORT"
    then

        echo "BACKEND_PORT_8000=OPEN"


        if [ "$EXPECTED_PROCESS_COUNT" -lt 1 ]
        then
            echo "BACKEND_PORT_OWNER_CERT=FAIL"
            echo "HQNATEX_BACKEND_ENSURE=BLOCKED"
            return 1
        fi


        echo "BACKEND_PORT_OWNER_CERT=PASS"

    else

        echo "BACKEND_PORT_8000=CLOSED"


        if [ -f "$PID_FILE" ]
        then

            OLD_PID="$(
                cat "$PID_FILE" \
                  2>/dev/null \
                | tr -d '[:space:]'
            )"


            if [[ "$OLD_PID" =~ ^[0-9]+$ ]]
            then

                OLD_COMMAND="$(
                    ps -p "$OLD_PID" \
                      -o args= \
                      2>/dev/null
                )"


                if [ -z "$OLD_COMMAND" ]
                then

                    rm -f "$PID_FILE"

                    echo "STALE_BACKEND_PID_REMOVED=YES"

                elif ! printf '%s\n' "$OLD_COMMAND" \
                    | grep -Eq \
                      'gunicorn.*config\.wsgi:application'
                then

                    rm -f "$PID_FILE"

                    echo "REUSED_BACKEND_PID_FILE_REMOVED=YES"

                else

                    echo "BACKEND_PID_PROCESS_EXISTS_BUT_PORT_CLOSED=YES"
                    echo "HQNATEX_BACKEND_ENSURE=BLOCKED"
                    return 1

                fi

            else

                rm -f "$PID_FILE"

                echo "INVALID_BACKEND_PID_FILE_REMOVED=YES"

            fi

        fi


        echo "BACKEND_START=STARTING"


        nohup \
          "$GUNICORN" \
          config.wsgi:application \
          --bind \
          "${BACKEND_HOST}:${BACKEND_PORT}" \
          --workers 2 \
          --timeout 120 \
          --access-logfile "$ACCESS_LOG" \
          --error-logfile "$ERROR_LOG" \
          --pid "$PID_FILE" \
          >/dev/null \
          2>&1 &


        START_SHELL_PID=$!

        echo "BACKEND_START_SHELL_PID=$START_SHELL_PID"


        READY=0


        for i in $(seq 1 40)
        do

            if port_open "$BACKEND_PORT"
            then

                READY=1

                echo "BACKEND_READY_ATTEMPT=$i"

                break

            fi


            sleep 1

        done


        if [ "$READY" -ne 1 ]
        then

            echo "BACKEND_PORT_8000=DOWN"

            echo
            echo "--- GUNICORN ERROR LOG ---"

            tail -100 \
              "$ERROR_LOG" \
              2>/dev/null


            echo "HQNATEX_BACKEND_ENSURE=FAIL"

            return 1

        fi


        echo "BACKEND_PORT_8000=OPEN"

    fi


    FINAL_PROCESS_COUNT="$(
        backend_process_count
    )"


    echo "BACKEND_PROCESS_COUNT_AFTER=$FINAL_PROCESS_COUNT"


    if [ "$FINAL_PROCESS_COUNT" -lt 1 ]
    then
        echo "BACKEND_PROCESS_CERT=FAIL"
        echo "HQNATEX_BACKEND_ENSURE=FAIL"
        return 1
    fi


    echo "BACKEND_PROCESS_CERT=PASS"


    HTTP_CODE="$(
        curl \
          -s \
          -o /tmp/hqnatex_backend_health.json \
          -w '%{http_code}' \
          "http://${BACKEND_HOST}:${BACKEND_PORT}/api/v1/health/live" \
          2>/dev/null
    )"


    echo "BACKEND_HEALTH_HTTP_CODE=$HTTP_CODE"


    if [ "$HTTP_CODE" != "200" ]
    then

        echo "BACKEND_HEALTH_CERT=FAIL"

        echo
        echo "--- GUNICORN ERROR LOG ---"

        tail -100 \
          "$ERROR_LOG" \
          2>/dev/null


        echo "HQNATEX_BACKEND_ENSURE=FAIL"

        return 1

    fi


    echo "BACKEND_HEALTH_CERT=PASS"


    if [ -f "$PID_FILE" ]
    then

        MASTER_PID="$(
            cat "$PID_FILE" \
              2>/dev/null \
            | tr -d '[:space:]'
        )"

        echo "BACKEND_MASTER_PID=$MASTER_PID"

    else

        echo "BACKEND_MASTER_PID_FILE=MISSING"
        echo "HQNATEX_BACKEND_ENSURE=FAIL"

        return 1

    fi


    echo "BACKEND_BIND=127.0.0.1:8000"
    echo "BACKEND_SERVER=gunicorn"
    echo "BACKEND_APPLICATION=config.wsgi:application"
    echo "HQNATEX_BACKEND_ENSURE=PASS"
    echo "=================================================="


    return 0
}


main "$@"
