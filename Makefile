# MacroBrief — developer shortcuts
.PHONY: up down scan-now web pipeline dev build lint email deploy-up deploy-logs

up:             ## run the full product locally: dashboard + pipeline + scheduler (http://localhost:3000)
	./scripts/local-up.sh

down:           ## stop the local stack
	./scripts/local-down.sh

scan-now:       ## start locally and run a fresh full scan first (~5 min)
	./scripts/local-up.sh --scan

web:            ## run the dashboard mock-up locally (http://localhost:3000)
	cd apps/web && pnpm install && pnpm dev

build:          ## production build + typecheck + lint
	cd apps/web && pnpm typecheck && pnpm lint && pnpm build

pipeline:       ## create venv and install the pipeline in dev mode
	cd pipeline && python3 -m venv .venv && .venv/bin/pip install -e ".[dev,markets]"

scan:           ## run the free scans once (no API keys needed)
	cd pipeline && .venv/bin/macrobrief run scan.calendar && .venv/bin/macrobrief run scan.news && .venv/bin/macrobrief run scan.decision_makers

email:          ## render today's brief HTML from stored data → pipeline/out/
	cd pipeline && .venv/bin/macrobrief render

deploy-up:      ## build & start the production stack (on the server)
	cd deploy && docker compose up -d --build

deploy-logs:
	cd deploy && docker compose logs -f --tail=100
