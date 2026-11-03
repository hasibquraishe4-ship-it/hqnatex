#!/usr/bin/env bash

set +e
set +u
set +o pipefail 2>/dev/null

# HQNATEX runtime-autostart owns flock on FD 9.
# No child process may inherit this descriptor.
exec 9>&-

exec "$@"
