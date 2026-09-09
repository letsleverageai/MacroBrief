#!/usr/bin/env bash
# Double-click me (macOS). Installs what's missing, starts MacroBrief, opens the dashboard in your browser.
cd "$(dirname "$0")"
clear
echo "MacroBrief — starting up. First run takes a few minutes (installs + a full data scan)."
echo

missing=()
command -v node >/dev/null || missing+=("Node.js 20+  → https://nodejs.org (download the LTS installer)")
command -v python3 >/dev/null || missing+=("Python 3     → https://www.python.org/downloads/")
if ((${#missing[@]})); then
  echo "Please install these first, then double-click me again:"
  printf '  • %s\n' "${missing[@]}"
  echo; read -r -p "Press Enter to close."; exit 1
fi
command -v pnpm >/dev/null || { echo "Installing pnpm…"; npm i -g pnpm >/dev/null 2>&1 || sudo npm i -g pnpm; }

./scripts/local-up.sh || { echo; read -r -p "Something failed — see above. Press Enter to close."; exit 1; }

echo
echo "Opening http://localhost:3000 …  (to stop later, double-click 'Stop MacroBrief.command')"
sleep 1
open "http://localhost:3000"
echo
read -r -p "MacroBrief is running in the background. You can close this window."
