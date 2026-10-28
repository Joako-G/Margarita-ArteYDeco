#!/usr/bin/env bash
# Shared helpers for the opt-in concurrency checks. Source this file; do not run it.
# Everything targets the LOCAL Supabase container only and leaves fixtures behind,
# so use a disposable database (supabase db reset --local cleans it).

CONTAINER="supabase_db_margarita-app"
GATE_KEY=7770001

psql_db() {
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qtAX "$@"
}

require_container() {
  if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
    echo "FAIL: local container $CONTAINER is not running" >&2
    exit 2
  fi
}

# An exclusive advisory lock holds every worker until the gate session ends,
# so all workers are released at the same instant.
start_gate() {
  psql_db <<SQL >/dev/null 2>&1 &
select pg_advisory_lock($GATE_KEY);
select pg_sleep(${GATE_SECONDS:-6});
SQL
  sleep 1
}

# Usage: run_worker <output-file> [psql args] <<'SQL' ... SQL
# Runs the SQL from stdin as service_role once the gate opens.
run_worker() {
  local out="$1"
  shift
  {
    echo "set role service_role;"
    echo "select pg_advisory_lock_shared($GATE_KEY);"
    cat
  } | psql_db "$@" >"$out" 2>&1
}
