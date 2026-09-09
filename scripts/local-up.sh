#!/usr/bin/env bash
# MacroBrief — run the whole product locally (dashboard + pipeline + scheduler) with one command.
#
#   ./scripts/local-up.sh            start (builds/installs on first run, seeds data if the DB is empty)
#   ./scripts/local-up.sh --scan     also run a full scan now (≈5 min; markets, calendar, decision makers, news)
#   ./scripts/local-down.sh          stop
#
# Dashboard: http://localhost:3000   Pipeline API: http://127.0.0.1:8000/health   Logs: .run/*.log
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .run
SCAN=0; [[ "${1:-}" == "--scan" ]] && SCAN=1

say() { printf '\033[1;33m▶ %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- prerequisites
command -v node >/dev/null || { echo "Node.js 20+ is required (https://nodejs.org)"; exit 1; }
command -v pnpm >/dev/null || { say "installing pnpm"; npm i -g pnpm; }
command -v python3 >/dev/null || { echo "Python 3.9+ is required"; exit 1; }

# ---------------------------------------------------------------- env files (created once, never overwritten)
if [[ ! -f pipeline/.env ]]; then
  say "creating pipeline/.env"
  TOKEN=$(openssl rand -hex 24)
  cat > pipeline/.env <<EOF
DATABASE_URL=sqlite:///data/macrobrief.db
TIMEZONE=Europe/London
EMAIL_TO=you@example.com
DASHBOARD_URL=http://localhost:3000
PIPELINE_TOKEN=$TOKEN
# Optional keys — each one unlocks a section (see README "Going live"):
# FRED_API_KEY=        US economic series (free)
# BRAVE_API_KEY=       news search (free tier)
# ANTHROPIC_API_KEY=   summaries (~\$0.05/day)
# RESEND_API_KEY=      real email delivery (free tier)  + EMAIL_FROM=brief@yourdomain.com
EOF
fi
TOKEN=$(sed -n 's/^PIPELINE_TOKEN=//p' pipeline/.env)

if [[ ! -f apps/web/.env.local ]]; then
  say "creating apps/web/.env.local (login: admin@macrobrief.local / macrobrief)"
  cat > apps/web/.env.local <<EOF
AUTH_EMAIL=admin@macrobrief.local
AUTH_PASSWORD=macrobrief
AUTH_SECRET=$(openssl rand -hex 32)
PIPELINE_URL=http://127.0.0.1:8000
PIPELINE_TOKEN=$TOKEN
EOF
elif ! grep -q '^PIPELINE_URL=' apps/web/.env.local; then
  printf '\nPIPELINE_URL=http://127.0.0.1:8000\nPIPELINE_TOKEN=%s\n' "$TOKEN" >> apps/web/.env.local
fi

# ---------------------------------------------------------------- install / build
if [[ ! -d pipeline/.venv ]]; then
  say "creating Python venv + installing pipeline"
  (cd pipeline && python3 -m venv .venv && .venv/bin/pip install -q -e ".[markets]")
fi
if [[ ! -d apps/web/node_modules ]]; then
  say "installing web dependencies"
  (cd apps/web && pnpm install --frozen-lockfile)
fi
if [[ ! -d apps/web/.next ]] || [[ -n "$(find apps/web/src -newer apps/web/.next -type f 2>/dev/null | head -1)" ]]; then
  say "building dashboard"
  (cd apps/web && pnpm build >/dev/null)
fi

# ---------------------------------------------------------------- stop anything already running
"$ROOT/scripts/local-down.sh" >/dev/null 2>&1 || true

# ---------------------------------------------------------------- first-run data
if [[ ! -f pipeline/data/macrobrief.db ]] || [[ $SCAN == 1 ]]; then
  say "running a full scan (markets, calendar, releases, decision makers, news) — a few minutes"
  (cd pipeline && .venv/bin/macrobrief run daily_brief.email 2>&1 | grep -v -e NotOpenSSL -e warnings.warn | tail -3)
  say "refreshing economic series"
  (cd pipeline && .venv/bin/macrobrief run dashboard.refresh 2>&1 | grep -v -e NotOpenSSL -e warnings.warn | tail -1 | cut -c1-160)
fi

# ---------------------------------------------------------------- start
say "starting pipeline (scheduler + API) on :8000"
cd pipeline; nohup .venv/bin/macrobrief serve > "$ROOT/.run/pipeline.log" 2>&1 & echo $! > "$ROOT/.run/pipeline.pid"; disown; cd "$ROOT"
say "starting dashboard on :3000"
cd apps/web; nohup pnpm start > "$ROOT/.run/web.log" 2>&1 & echo $! > "$ROOT/.run/web.pid"; disown; cd "$ROOT"

for i in $(seq 1 30); do curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1 && curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1; done

EMAIL=$(sed -n 's/^AUTH_EMAIL=//p' apps/web/.env.local); PASS=$(sed -n 's/^AUTH_PASSWORD=//p' apps/web/.env.local)
echo
printf '\033[1;32m✔ MacroBrief is running\033[0m\n'
echo "   Dashboard  http://localhost:3000        login: $EMAIL / $PASS"
echo "   Pipeline   http://127.0.0.1:8000/health  (scheduler: email 06:00 Mon–Sat, refresh 09:00 Mon–Fri)"
echo "   Logs       .run/web.log  .run/pipeline.log        Stop: ./scripts/local-down.sh"
