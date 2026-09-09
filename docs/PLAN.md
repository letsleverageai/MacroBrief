# MacroBrief — Plan

*"God mode for a macro analyst": one 06:00 email, one dashboard, US · UK · China, one scan a day, ~€14/month.*

This document is the plan. The repo next to it is a working mock-up of that plan: a real dashboard (Next.js), a real pipeline (Python) that already pulls live calendar, news and decision-maker feeds with no API keys, and a real deployment recipe (Docker Compose + Caddy on Hetzner). The dashboard is seeded with illustrative data for 8 Sep 2026 so the analyst can see the finished product before the connectors are all wired.

---

## 1. What the analyst asked for → what we build

| The spec | Where it lives in the mock-up | Status |
|---|---|---|
| Daily email, 06:00, US/UK/China, five sections | `/brief` + `/email/preview`; `pipeline` job `daily_brief.email` | Rendering done; scheduler done; connectors: markets/calendar/DM/news live, releases need LLM key |
| Market Summary: equities, rates, FX, commodities; close, 1D, 5D, MTD, YTD, 52w hi/lo | `/brief#markets`, `connectors/markets.py` | yfinance connector written; gilts/CGB via BoE/ChinaBond CSV stubbed |
| Eco Calendar from TradingView/FX Factory, by geo, high/med only | `/brief#calendar`, `connectors/calendar_ff.py` | **Live** (Forex Factory JSON, 16 events pulled today) |
| Eco Summary: reads reports, link, one-line outcome, one-line consensus | `/brief#eco`, `jobs.scan_releases` + `summarize.py` | Code done; needs an LLM key ($0.20/day) |
| Decision Maker Summary: CB, Gov, Regulators, Treasury — latest research | `/brief#dm`, `connectors/feeds.py` | **Live** (66 items pulled today from BoE, Fed, HMT, No.10, OBR, FCA, Ofgem, PBoC, NBS) |
| Global Summary: BBG/Economist > FT/WSJ > Reuters; title-only without login | `/brief#global`, `news_brave.py` + RSS | **Live** via RSS (12 headlines); Brave adds discovery with a free key |
| Dashboard refreshes 09:00; re-opening doesn't re-pull; button to re-update | `/eco` header, `/api/refresh` → `POST /run/dashboard.refresh` | Done |
| Initial historical pull; or seed from SQL / DataFrame; append daily; amendable | `eco_observations` table, `macrobrief import x.csv` | Done |
| Link to each backing document; stable official URLs | Every row/tile has a source link; `/sources` registry | Done |
| Eco dashboard: 6 themes + Market/Policy panel per geography | `/eco?geo=UK` | Done (UK 40 series, US 23, CN 20 in fixtures) |
| Decision-maker dashboard: Policy / Spending & Credit / Market, flexible | `/decision-makers`, `/decision-makers/[slug]` | Done (14 decision makers, config-driven) |
| Households: surveys + Polymarket | `households` card; `positioning.polymarket()` | Done |
| Speculators: "CBOT equivalent" | `speculators` card; `positioning.cftc_tff()` | Done — it's the **CFTC Commitments of Traders** (TFF report, Fridays); ICE publishes the gilt/SONIA equivalent |
| Pension/insurers' long-gilt purchases | `pensions-insurance` card | Done — ONS MQ5 (quarterly net investment by pension funds/insurers), PPF 7800, DMO auction stats, insurer H1/FY reports parsed by LLM |
| Behind password/accounts, unbreakable, 24/7 on Hetzner | `lib/auth.ts`, `deploy/` | Done (see §5) |

---

## 2. Architecture

```
                 06:00 email                 09:00 refresh            click "Re-update"
                     │                            │                          │
┌────────────────────▼────────────────────────────▼──────────────────────────▼──────────┐
│  pipeline  (Python 3.12 · FastAPI · APScheduler, Europe/London)                        │
│                                                                                        │
│  connectors/            jobs/                       summarize.py                       │
│   markets (yfinance,    scan.markets                 LLM (Haiku / 4o-mini)             │
│    BoE curve, ChinaBond) scan.calendar               • quote-only, JSON-only            │
│   calendar_ff           scan.releases  ──────────►   • $1/day budget guard             │
│   eco_data (FRED, ONS,  scan.decision_makers         • falls back to extractive text   │
│    BoE IADB, NBS, DBnomics) scan.news                                                  │
│   feeds (RSS/Atom/HTML) dashboard.refresh                                              │
│   news_brave            weekly.positioning          email_render.py → Resend/SMTP      │
│   positioning (CFTC,    daily_brief.email                                              │
│    Polymarket, AAII)                                                                   │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ SQLAlchemy (SQLite dev / Postgres prod)
┌──────────────────────────────────────▼─────────────────────────────────────────────────┐
│  Postgres: market_snapshots · calendar_events · eco_observations (long, amendable)      │
│            eco_series_meta · documents (release/dm_item/headline + raw_text for audit) │
│            run_log · briefs (every day's HTML + bundle, re-renderable)                 │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ internal HTTP, bearer token
┌──────────────────────────────────────▼─────────────────────────────────────────────────┐
│  web  (Next.js 15 · React 19 · Tailwind 4 · Recharts)                                  │
│   /login  /brief  /eco  /decision-makers  /email/preview  /sources  /settings          │
│   middleware: HMAC-signed session cookie · TOTP 2FA · login rate limit                 │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
                         Caddy (TLS 1.3, HSTS, CSP, rate-limit) ── UFW ── fail2ban
                                   Hetzner CX22, Ubuntu 24.04
```

Why two languages: The analyst is a Python/SQL person and will live in `pipeline/` (add a series = one YAML line; add a decision maker = one YAML block). The dashboard is a viewer he shouldn't need to touch. The data contract between them is `apps/web/src/lib/types.ts` ⇄ `pipeline/macrobrief/models.py`.

Why a database rather than re-scraping: the brief must be *reproducible* (what did the LLM read?), *amendable* (revise a data point at the backend), and the dashboard must not re-pull on every open.

---

## 3. Data-source map (all free unless stated)

### Markets
| Need | Source | Method | Notes |
|---|---|---|---|
| Equities, FX, commodities, UST yields | Yahoo Finance via `yfinance` | API (unofficial) | One batched call/day. Fallback: Stooq CSV |
| Gilt curve (2/10/30Y) | Bank of England yield curves | CSV/XLSX daily | Official; use instead of patchy Yahoo gilt tickers |
| CGB 10Y, USD/CNY fixing | ChinaBond / CFETS | Scrape (24h cache) | English pages exist |
| Holiday handling | built-in | — | Detects last close > 1 business day old (e.g. US Labor Day) and labels 1D "vs Fri close" |

### Calendar
| Source | Method | Notes |
|---|---|---|
| Forex Factory `ff_calendar_thisweek.json` | JSON | Free, intraday updates, has consensus/previous/actual, impact levels. **Verified live.** |
| ONS release calendar RSS, BLS/BEA schedules, NBS calendar | RSS/scrape | Adds official next-week look-ahead and the official link per release |
| Trading Economics | API | Paid ($) — not needed |

### Economic data (dashboard)
| Geo | Source | Method | Coverage |
|---|---|---|---|
| US | **FRED API** (free key) | API | Everything: BLS, BEA, Fed, Census, Freddie Mac, Treasury |
| UK | **ONS API** (beta, no key) | API | CPI, GDP, labour, retail, PSF, trade, HPI — series by CDID/dataset |
| UK | BoE Interactive Database | CSV | Mortgage approvals, lending, M4, effective rates |
| UK | OBR databank | CSV | Forecast profiles → "vs OBR profile" chart |
| CN | NBS data portal | JSON (easyquery) | CPI/PPI, IP, retail, FAI, PMI; slow from abroad → **DBnomics** mirror as fallback |
| CN | PBoC statistics | Scrape | TSF, loans, M2 (monthly page) |
| Any | Manual / SQL / DataFrame | `macrobrief import x.csv` | For DMP, Caixin, Halifax, anything without an API |

### Decision makers
| Institution | Source | Notes |
|---|---|---|
| BoE | RSS: news, speeches, publications; DMP page | **Live** |
| HMT, No.10, DBT, DWP | gov.uk Atom feeds (every org has one) | **Live** |
| OBR | RSS | **Live** |
| FCA, Ofgem | RSS | **Live** |
| Ofcom, Ofwat, BLS | HTML | 403 to non-browser UAs today → use browser UA + Playwright fallback, or their gov.uk mirrors |
| PRA | Publications page | HTML list |
| Fed | RSS: press releases, speeches; Beige Book page | **Live** |
| US Treasury | Press releases page | HTML list |
| PBoC, NBS, MoF | English sites | HTML list; PBoC times out occasionally → cached copy |
| UK Parliament | Bills API | Bill stages for Pension Schemes Bill etc. |

### News
| Tier | Source | Access |
|---|---|---|
| 1 | Bloomberg, The Economist | Title-only (Economist RSS free; Bloomberg via Brave discovery). With a login cookie → full-text summary |
| 2 | FT, WSJ | RSS headlines free (**live**); full text with subscriber cookie |
| 3 | Reuters (via Google News/Brave), BBC, CNBC, Caixin, Politico | Full text, free |
| Discovery | **Brave Search API** | Free 2,000 queries/month; we use ~12–20/day. `freshness=pd`, ranked by tier |

### Positioning & sentiment
| Need | Source |
|---|---|
| "CBOT equivalent" for hedge-fund positioning | **CFTC Commitments of Traders — Traders in Financial Futures** (Leveraged Funds ≈ hedge funds). Fri 15:30 ET. Free CSV |
| Gilt / SONIA / Brent positioning | ICE COT reports (free) |
| Retail & adviser sentiment | AAII (Thu), NAAIM (Wed) |
| Event odds (Fed/BoE decisions, politics) | Polymarket Gamma API (free, no key); Kalshi API for US |
| Pension/insurer gilt demand | ONS MQ5 (quarterly), PPF 7800 (monthly), DMO auction results (weekly), insurer H1/FY reports (LLM-parsed) |

### Polling / households
YouGov trackers (weekly), Ipsos Issues Index (monthly), GfK, ONS Opinions & Lifestyle (fortnightly), BoE/Ipsos Inflation Attitudes (quarterly).

---

## 4. Cost

| Item | Monthly |
|---|---|
| Hetzner CX22 (2 vCPU / 4 GB / 40 GB) | €4.5 |
| Domain (annualised) | ~€1 |
| LLM summaries (Haiku-class, ~60 docs/day) | ~$6–12 |
| Brave Search API | €0 (free tier) — $5/1k over |
| Email (Resend 3k/mo free; Postmark 100/mo free) | €0 |
| FRED, ONS, BoE, NBS, CFTC, Polymarket, RSS | €0 |
| Backups to Hetzner Storage Box (optional) | €3.8 |
| **Total** | **≈ €14–20 / month** |

Publisher subscriptions (FT/WSJ/Bloomberg) are the analyst's own. Bloomberg Terminal data is not scrapeable under its licence; the design treats Bloomberg as *headline discovery only*.

---

## 5. Security ("no one can break into it")

Layers, outermost first:

1. **Network**: UFW allows only 22 (or a moved port), 80, 443. Postgres and the pipeline are on a private Docker network with no published ports.
2. **Host**: SSH keys only, root login disabled, fail2ban on sshd, unattended security upgrades, sysctl hardening, Docker log rotation. Script: `deploy/hetzner-bootstrap.sh`.
3. **Edge (Caddy)**: automatic Let's Encrypt TLS 1.3 + HTTP/3, HSTS preload, CSP, X-Frame-Options, Referrer-Policy; rate limit on `/api/auth/login`; JSON access logs feed a fail2ban jail (10 failed logins in 10 min → 6 h ban). Raw-IP requests get 404.
4. **App auth**: single admin account (invite-only; multi-user is a table away), SHA-256 password hash from env (swap to argon2 when multi-user), **TOTP 2FA** (Google Authenticator/1Password), HMAC-signed 12h sessions, `HttpOnly; Secure; SameSite=Strict`, in-app login rate limiting with uniform error and delay, no `X-Powered-By`.
5. **Containers**: non-root users, `no-new-privileges`, read-only root FS for the web container, health checks, pinned base images.
6. **Secrets**: `.env` on the server only (gitignored); API keys never reach the browser.
7. **Optional belt-and-braces** (recommended for a hedge-fund laptop): put the site behind **Cloudflare Access** (SSO + device posture, free for ≤50 users) or restrict Caddy to **Tailscale** IPs so the site is invisible to the public internet entirely.
8. **Backups**: nightly `pg_dump` (14-day rotation) + restic to a Storage Box; every day's brief HTML and the raw text the LLM read are stored, so any email can be reproduced and audited.

What this does *not* defend against: a compromised laptop or a leaked TOTP seed. Rotate `AUTH_SECRET` and the TOTP seed if a device is lost.

---

## 6. LLM policy (keeps the product honest)

- Models: Anthropic Haiku (default) or OpenAI 4o-mini. ~$0.20–0.40/day at one scan.
- Every prompt: *quote only numbers present in the text; never infer; "not stated" if absent; JSON only.* Raw text is stored next to the summary for audit.
- Budget guard: stop calling at $1/day; fall back to extractive first sentences.
- The email says so in the footer.

---

## 7. Roadmap

**Week 1 — "EoW" (the analyst's target)**
- [x] Dashboard mock-up with all views
- [x] Email template
- [x] Pipeline skeleton with live calendar/DM/news scans
- [ ] Add keys: FRED, Brave, Anthropic, Resend (30 min)
- [ ] Wire gilt curve (BoE XLSX) and CGB connectors (2 h)
- [ ] Ship to Hetzner with bootstrap script; first real 06:00 email

**Weeks 2–3 — make it his**
- Seed UK history from the analyst's SQL/DataFrames (`macrobrief import`)
- Decision-maker config as YAML (remit, focus, KPIs, sources) with an in-app editor
- Publisher logins (FT/WSJ cookie jar) for full-text summaries
- Browser-UA/Playwright fallback for Ofcom/Ofwat/BLS
- Sunday "week ahead" edition; holiday-aware labelling

**Month 2 — product**
- Multi-user accounts (argon2, invites, per-user recipients & geographies)
- Alerting: push/Slack when a print misses consensus by > N σ or a decision maker uses a new phrase
- "Ask the brief": chat over the stored documents (RAG on `documents.raw_text`)
- Backtest view: how consensus vs actual evolved; who was right
- PDF export of the daily brief

---

## 8. Commercial angle

The moat is the *decision-maker* framing plus the curated, cited source graph — not the data (which is free). Positioning: "the £30/month Bloomberg Brief for people who can't justify a terminal seat": independent macro analysts, small funds, family offices, corporate treasurers, economics students, journalists.

- Tiers: Personal (£19/mo: 1 email, 1 dashboard), Desk (£99/mo: 5 seats, custom decision makers, Slack), Firm (bespoke).
- Each new geography (EU, JP, AU) is a YAML file, not a codebase change.
- Costs scale with LLM tokens (~$0.30/user/day at most) and nothing else; a CX32 handles hundreds of users.
- Risks: publisher ToS for full-text (mitigated: user-supplied logins, title-only default), Yahoo Finance reliability (mitigated: Stooq/official CSV fallbacks), LLM hallucination (mitigated: quote-only policy + stored raw text).

---

## 9. Open questions for the analyst

1. **Which publisher logins** can you share for full-text (FT? WSJ? Economist?) — or title-only for now?
2. **Historical seed**: do you have UK series in SQL/CSV already? Column names → we map once.
3. **Consensus source**: Forex Factory is free but coarse. If you have Bloomberg ECO access at work, exporting consensus daily is better — legal to do?
4. **UK focus for decision makers** confirmed; do you want US/China decision-maker cards at the same depth or just central banks?
5. **Recipients**: only you, or the desk too? (Changes the auth model slightly.)
6. **Weekend behaviour**: Saturday email with Friday close + week ahead; Sunday off?
7. Would you rather the pipeline used **your own Anthropic/OpenAI key** or ours (billing)?

---

## 10. Run it

```bash
# dashboard mock-up
cd apps/web && pnpm install && pnpm dev            # http://localhost:3000  (analyst@example.com / macro-brief-demo)

# pipeline (free scans, no keys)
cd pipeline && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/macrobrief run scan.calendar
.venv/bin/macrobrief run scan.decision_makers
.venv/bin/macrobrief run scan.news
.venv/bin/macrobrief render                          # → pipeline/out/brief-YYYY-MM-DD.html

# production
bash deploy/hetzner-bootstrap.sh                     # on a fresh Hetzner Ubuntu 24.04 box
cd deploy && cp .env.example .env && $EDITOR .env && docker compose up -d --build
```
