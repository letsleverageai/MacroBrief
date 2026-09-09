# MacroBrief

One 06:00 email and one dashboard covering US, UK and China: markets, calendar, releases read for you, what every decision maker just said, and the day's headlines — organised by *who decides*, not just by data series.

**Read [`docs/PLAN.md`](docs/PLAN.md) first** — architecture, data-source map, costs, security, roadmap, open questions.

```
apps/web/      Next.js dashboard (mock-up, seeded with illustrative data for 8 Sep 2026)
pipeline/      Python pipeline: connectors → Postgres → LLM summaries → email; APScheduler + FastAPI
deploy/        Docker Compose, Caddy (TLS/rate-limit), Hetzner hardening script
docs/          Plan
```

## Run it locally

Needs Node 20+ and Python 3.9+. On a Mac, double-click **`Start MacroBrief.command`** and you're done. Otherwise:

```bash
make up          # first run: installs, builds, runs a full scan (~5 min), starts everything
make down        # stop
make scan-now    # start + force a fresh scan first
```

Then open **http://localhost:3000** — login `admin@macrobrief.local` / `macrobrief` (set in `apps/web/.env.local`,
created on first run). The pipeline API + scheduler run on `127.0.0.1:8000`; logs in `.run/`.

Everything is wired end to end: the dashboard reads whatever the pipeline last scanned (green **live scan** badges),
and falls back to bundled sample data where a source needs a key (grey **sample data** badges). "Re-update now" and
"Send test email now" call the pipeline for real. The scheduler fires the email job 06:00 Mon–Sat and the dashboard
refresh 09:00 Mon–Fri while `make up` is running.

### Unlock the rest (add to `pipeline/.env`, then `make down && make up`)

| Key | Unlocks | Cost |
|---|---|---|
| `FRED_API_KEY` | all US economic series | free |
| `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) | release summaries + the one-line overnight summary | ≈ $0.05/day |
| `BRAVE_API_KEY` | wider headline search | free tier |
| `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_TO` | the 06:00 email actually delivered | free tier |

Without an email key the daily email is still generated — to `pipeline/out/brief-YYYYMMDD.html`.

### Other shortcuts

```bash
make web        # dashboard only, dev mode with hot reload (sample data unless the pipeline is running)
make scan       # just the key-free scans (calendar, decision makers, news)
make email      # render today's brief → pipeline/out/
```

## Tabs

Daily Brief · **Economic Calendar** (week grid, filters, `.ics` export/subscribe) · Eco Dashboard · Decision Makers ·
**Journal** (calls, post-mortems, reading notes — stored in the pipeline DB) · Email Preview · Sources · Settings & Runs · Setup: DNS & TLS.

## Status

Live today with no keys: markets (Yahoo Finance), Forex Factory calendar, ~75 decision-maker feeds (BoE, Fed, HMT, No.10, OBR,
FCA, Ofgem…), RSS headlines, all UK series (ONS/BoE IADB), China series (DBnomics mirror of NBS — lags a few months because
NBS geo-blocks foreign IPs). Needs a key: US series (FRED), summaries (LLM), Brave news, email delivery (Resend). A few UK regulators
(Ofcom, Ofwat) and the BLS block non-browser clients — needs a browser-UA/Playwright fallback for production.

Deploying for real: `deploy/` has Docker Compose + Caddy + a Hetzner hardening script (≈ €5/month); the **Setup: DNS & TLS** tab walks through Cloudflare.
