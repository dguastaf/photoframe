# Shared venv bootstrap for Photoframe server development.
# Sourced by Cursor hooks; not meant to be executed directly.

ensure_server_venv() {
    local root server venv python_cmd ver major minor

    root="${CURSOR_PROJECT_DIR:-}"
    if [ -z "$root" ]; then
        root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    fi

    server="${root}/server"
    venv="${server}/.venv"

    if [ ! -f "${server}/pyproject.toml" ]; then
        echo "ensure_server_venv: server/pyproject.toml not found under ${root}" >&2
        return 1
    fi

    python_cmd=""
    for candidate in python3.12 python3; do
        if ! command -v "$candidate" >/dev/null 2>&1; then
            continue
        fi
        ver="$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
        major="${ver%%.*}"
        minor="${ver#*.}"
        if [ "$major" -ge 3 ] && [ "$minor" -ge 12 ]; then
            python_cmd="$candidate"
            break
        fi
    done

    if [ -z "$python_cmd" ]; then
        echo "ensure_server_venv: need Python 3.12+ (python3.12 or python3) on PATH" >&2
        return 1
    fi

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
