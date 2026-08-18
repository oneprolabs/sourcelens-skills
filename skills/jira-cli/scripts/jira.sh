#!/usr/bin/env bash
# Wrapper that writes a minimal Jira CLI configuration before delegating to
# the bundled jira binary. The configuration is generated at runtime from
# bound environment values and never shipped in the package. When the server
# is served over plain http, insecure (skip TLS verification) is enabled
# automatically; https keeps full verification.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JIRA_BIN="$SKILL_ROOT/bin/linux-amd64/jira"

CONFIG_FILE="${JIRA_CONFIG_FILE:-$SKILL_ROOT/config.yml}"
if [ ! -f "$CONFIG_FILE" ]; then
    : "${JIRA_SERVER:?missing JIRA_SERVER}"
    : "${JIRA_USERNAME:?missing JIRA_USERNAME}"
    : "${JIRA_PASSWORD:?missing JIRA_PASSWORD}"
    export JIRA_API_TOKEN="${JIRA_API_TOKEN:-${JIRA_PASSWORD}}"

    INSECURE=false
    case "$JIRA_SERVER" in
    http://*) INSECURE=true ;;
    esac

    umask 077
    cat > "$CONFIG_FILE" <<EOF
version: 1
server: $JIRA_SERVER
login: $JIRA_USERNAME
auth_type: basic
installation: Local
insecure: $INSECURE
EOF
fi

export JIRA_CONFIG_FILE="$CONFIG_FILE"
export JIRA_AUTH_TYPE="basic"
export JIRA_API_TOKEN="${JIRA_API_TOKEN:-${JIRA_PASSWORD:-}}"

exec "$JIRA_BIN" "$@"