# MacroBrief — Guide

A 06:00 daily brief email plus a dashboard covering US, UK and China: markets, economic calendar, key releases read for
you, what every decision maker just published, and the day's headlines — organised by *who decides*, not just by series.
There's also an Economic Calendar tab (with calendar-app export) and a Journal for calls and post-mortems.

This guide is for you to run it, judge it, and tell us what to change.

---

## 1. Run it (10 minutes)

You need **Node 20+** (nodejs.org, LTS installer) and **Python 3** (python.org) installed. That's it.

**Easiest (Mac):** double-click **`Start MacroBrief.command`** in the folder. It installs anything missing, runs the first
scan, starts everything and opens the dashboard in your browser. `Stop MacroBrief.command` stops it.
(If macOS says it can't be opened: right-click → Open, or System Settings → Privacy & Security → Open Anyway. Once.)

**Or from a terminal** (Cursor: drag the folder onto the Cursor window, then Terminal → New Terminal):

```bash
make up
```

First run installs dependencies, builds the dashboard, runs a full scan of every free source (~5 minutes), then starts:

- Dashboard → **http://localhost:3000** — login `admin@macrobrief.local` / `macrobrief`
- Pipeline + scheduler → `127.0.0.1:8000` (internal; the dashboard talks to it)

Stop with `make down`. Force a fresh scan with `make scan-now`. Logs are in `.run/`.

While it's running, the scheduler fires the **email job at 06:00 Mon–Sat** and the **dashboard refresh at 09:00 Mon–Fri**.
Without an email key the "email" is written to `pipeline/out/brief-YYYYMMDD.html` — open it in a browser.

---

## 2. What's real today vs. what needs a key

Green **live scan** badge = pulled from the source in the last run. Grey **sample data** = illustrative until a key is added.

| Section | Source | State without keys |
|---|---|---|
| Market Summary (33 instruments) | Yahoo Finance, BoE gilt curve, ChinaBond | **Live** |
| Economic Calendar | Forex Factory (this week) | **Live** |
| Economic Summary (releases read) | Official release PDFs/HTML → LLM | Sample — needs an LLM key |
| Decision Maker Summary | ~75 RSS/HTML feeds: BoE, Fed, HMT, No.10, OBR, FCA, Ofgem, PBoC… | **Live** (a few block bots — see §6) |
| Global Summary (headlines) | RSS: Reuters, FT, BBC, Bloomberg, Economist… | **Live** (title-only for paywalled) |
| One-line overnight summary | LLM over the above | Sample — needs an LLM key |
| Eco Dashboard — UK (10 series) | ONS, BoE IADB | **Live** |
| Eco Dashboard — China (4 series) | NBS via DBnomics mirror | **Live** but lags ~3–6 months (NBS blocks foreign IPs) |
| Eco Dashboard — US (9 series) | FRED | Sample — needs a free FRED key |
| Decision Makers pages (KPIs, watchlists, flags) | Hand-curated + linked series | Curated content, sample KPIs |
| Weekly positioning (CFTC COT, Polymarket) | CFTC, Polymarket | Live job (Sat 08:00), not yet surfaced in the UI |
| Journal, Calendar `.ics`, run log, Re-update, Send test email | Pipeline DB / scheduler | **Working** |

---

## 3. What to add — keys (all free or near-free)

Put these in `pipeline/.env` (created on first run), then `make down && make up`.

| Key | Get it | Unlocks | Cost |
|---|---|---|---|
| `FRED_API_KEY` | https://fred.stlouisfed.org/docs/api/api_key.html | All US series (CPI, core PCE, payrolls, unemployment, retail, IP, mortgage rate, deficit) | Free |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | Release summaries (one line on outcome, one on consensus) and the overnight one-liner. Strictly grounded: every number is quoted from the linked document, budget-capped per day | ≈ $0.15–0.40/day, capped by `llm.daily_budget_usd` in config.yaml |
| `OPENAI_API_KEY` | https://platform.openai.com | Alternative to Anthropic (set `LLM_MODEL=gpt-4o-mini`) | Similar |
| `BRAVE_API_KEY` | https://brave.com/search/api/ | Headline search per topic (Fed, gilts, PBoC, China property…) on top of RSS | Free tier (2,000 queries/month) |
| `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_TO` | https://resend.com | The 06:00 email actually delivered (needs a domain you control for `EMAIL_FROM`) | Free tier (3,000/month) |
| or `SMTP_HOST/PORT/USER/PASS` | your mailbox provider | Same, via SMTP | — |

Everything else (markets, calendar, feeds, ONS, BoE, DBnomics, CFTC, Polymarket) needs no key.

---

## 4. What we'd like from you

This is the part that matters. In rough priority:

1. **Instruments and series.** `pipeline/config.yaml` lists every market instrument, economic series and feed. What's
   missing? What's noise? What's the *right* 30 numbers you look at every morning?
2. **Decision makers.** `apps/web/src/data/decisionMakers.ts` — the cards (remit, "what matters to them right now",
   KPIs, watchlist, flags). Are these the right institutions and the right lenses? What do you want to see per person/body?
3. **The email.** Open `pipeline/out/brief-*.html` (or the Email Preview tab). Is the order right? Too long? What would you
   delete? What would make you open it every day?
4. **Calendar.** Right importance filter? Want next week too? Want it in Outlook (the `.ics` link does that)?
5. **Journal.** Are the templates (pre-release call, post-mortem, decision-maker read, weekly review) the right
   discipline? What fields are missing — conviction, size, P&L, linked trade?
6. **Anything that looks wrong.** Numbers, labels, units, a source we should be using instead.

Write it in the Journal tab if you like — it saves to the local database and exports to JSON.

---

## 5. Editing it in Cursor — where things live

```
pipeline/config.yaml                  ← instruments, series, feeds, news topics, schedule. Most changes start here.
pipeline/macrobrief/connectors/       ← one file per source type (markets, calendar_ff, eco_data, feeds, news_brave, positioning)
pipeline/macrobrief/jobs.py           ← the scan jobs; daily_brief_email() is the whole chain
pipeline/macrobrief/summarize.py      ← LLM prompts + grounding rules + daily budget guard
pipeline/macrobrief/templates/        ← the email (Jinja2)

apps/web/src/app/(app)/               ← one folder per tab: brief, calendar, eco, decision-makers, journal, email, settings…
apps/web/src/data/                    ← sample data + decision-maker cards (decisionMakers.ts) + journal templates
apps/web/src/lib/data.ts              ← how the dashboard reads the pipeline (falls back to sample data per section)
apps/web/src/lib/types.ts             ← the data contract (mirrored in pipeline/macrobrief/models.py)

deploy/                               ← Docker Compose + Caddy + Hetzner hardening for the always-on version
docs/PLAN.md                          ← architecture, costs, security, roadmap
```

Typical edits:

- **Add a market instrument:** one line under `markets:` in `config.yaml` (Yahoo symbol, name, asset class, geo). Re-run `make scan-now`.
- **Add a UK series:** find the CDID on ons.gov.uk (e.g. `D7G7/mm23`), add under `eco_series:` with `source: ons`. Use
  `transform: yoy|mom|diff|minus100` if the source gives an index rather than a rate.
- **Add a US series:** the FRED series id, `source: fred`.
- **Add a feed:** under `decision_maker_feeds:` — RSS/Atom URL, or an HTML page with a CSS selector for the list.
- **Change the email time or recipients:** `schedule:` in `config.yaml`, `EMAIL_TO` in `.env`.
- **Change the login:** `apps/web/.env.local` (`AUTH_EMAIL`, `AUTH_PASSWORD`; optional `AUTH_TOTP_SECRET` for 2FA).

Dev mode with hot reload for the dashboard: `make web` (keep `make up`'s pipeline running for live data).

---

## 6. Known gaps (honest list)

- **ONS** retired its API in Nov 2024; we read the website's JSON instead. Works, but it's not a supported API.
- **NBS (China)** blocks non-Chinese IPs. We use DBnomics's mirror, which lags months. Production fix: a CN-region proxy, or Wind/CEIC if the desk has it.
- **Ofcom, Ofwat, BLS** block non-browser clients (403). Needs a browser-UA/Playwright fallback.
- **Paywalled news** (FT, Bloomberg, Economist) is title-only unless you supply credentials — we don't scrape behind logins.
- **Forex Factory** publishes this week only; next week appears on Sunday.
- **Decision-maker KPIs and flags** on the cards are curated sample values; wiring each to a live series is the next step once the list of KPIs is agreed.
- **Positioning** (CFTC/Polymarket) is scanned weekly but has no tab yet.
- Not multi-user yet: one login, one recipient list. Accounts/roles are on the roadmap in `docs/PLAN.md`.

---

## 7. Making it always-on

Locally it only runs while your machine is awake. For the real thing: a ~€5/month Hetzner VM, Docker Compose in `deploy/`,
Caddy for TLS, Cloudflare in front, 2FA on the login. The **Setup: DNS & TLS** tab in the dashboard walks through it step by
step; `deploy/hetzner-bootstrap.sh` hardens the box (SSH keys only, UFW, fail2ban). Running cost all-in: ≈ €5–7/month for the server plus ≈ $5–10/month of LLM.
