#!/usr/bin/env bash
# Stop the locally running MacroBrief dashboard + pipeline.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for n in web pipeline; do
  f="$ROOT/.run/$n.pid"
  if [[ -f "$f" ]]; then pkill -P "$(cat "$f")" 2>/dev/null; kill "$(cat "$f")" 2>/dev/null; rm -f "$f"; fi
done
# belt and braces: free the ports
lsof -ti :3000 -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null
echo "stopped"
