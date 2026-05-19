# Shared venv bootstrap for Photoframe server development.
# Sourced by Cursor hooks; not meant to be executed directly.

_acquire_venv_lock() {
    local lock_dir="$1"
    local attempt=0
    local max_attempts=120

    while [ "$attempt" -lt "$max_attempts" ]; do
        if mkdir "$lock_dir" 2>/dev/null; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo "ensure_server_venv: timed out waiting for lock ${lock_dir}" >&2
    return 1
}

_release_venv_lock() {
    rmdir "$1" 2>/dev/null || true
}

_python_version_ok() {
    local candidate="$1"
    local ver major minor

    ver="$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    major="${ver%%.*}"
    minor="${ver#*.}"
    [ "$major" -gt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -ge 12 ]; }
}

_select_python_cmd() {
    local candidate

    for candidate in python3.12 python3; do
        if ! command -v "$candidate" >/dev/null 2>&1; then
            continue
        fi
        if _python_version_ok "$candidate"; then
            printf '%s' "$candidate"
            return 0
        fi
    done
    return 1
}

ensure_server_venv() {
    local root server venv python_cmd lock_dir

    root="${CURSOR_PROJECT_DIR:-}"
    if [ -z "$root" ]; then
        root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    fi

    server="${root}/server"
    venv="${server}/.venv"
    lock_dir="${server}/.ensure-server-venv.lock"

    if [ ! -f "${server}/pyproject.toml" ]; then
        echo "ensure_server_venv: server/pyproject.toml not found under ${root}" >&2
        return 1
    fi

    if ! python_cmd="$(_select_python_cmd)"; then
        echo "ensure_server_venv: need Python 3.12+ (python3.12 or python3) on PATH" >&2
        return 1
    fi

    if ! _acquire_venv_lock "$lock_dir"; then
        return 1
    fi
    trap '_release_venv_lock "$lock_dir"' RETURN

    if [ ! -d "$venv" ]; then
        echo "ensure_server_venv: creating ${venv}" >&2
        "$python_cmd" -m venv "$venv"
    fi

    if "${venv}/bin/python" -c "import pytest" >/dev/null 2>&1; then
        echo "ensure_server_venv: dev dependencies already installed" >&2
    else
        echo "ensure_server_venv: installing dev dependencies" >&2
        "${venv}/bin/pip" install -q -e "${server}[dev]"
    fi

    export PHOTOFRAME_SERVER_DIR="$server"
    export PHOTOFRAME_VENV="$venv"
    export PHOTOFRAME_VENV_BIN="${venv}/bin"
}
