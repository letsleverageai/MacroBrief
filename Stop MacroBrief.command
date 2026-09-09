#!/usr/bin/env bash
# Double-click me to stop MacroBrief.
cd "$(dirname "$0")"
./scripts/local-down.sh
read -r -p "Stopped. Press Enter to close."
