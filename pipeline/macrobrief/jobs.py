"""Pipeline jobs. Each is idempotent for a given day and writes a run_log row.

  scan.markets          → market_snapshots
  scan.calendar         → calendar_events
  scan.releases         → documents(kind=release)  [reads report text, LLM one-liners]
  scan.decision_makers  → documents(kind=dm_item)
  scan.news             → documents(kind=headline)
  dashboard.refresh     → eco_observations (+ meta)
  weekly.positioning    → documents(kind=positioning)
  daily_brief.email     → briefs (+ send)
"""
from __future__ import annotations

import traceback
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Dict, List

from sqlalchemy import select

from . import db, summarize
from .config import env, load
from .connectors import calendar_ff, eco_data, feeds, markets, news_brave, positioning
from .connectors.base import fetch_text, stable_id
from .email_render import render, send
from .models import BriefBundle, CalendarEvent, DecisionMakerItem, EcoRelease, Headline, MarketRow

JOBS: Dict[str, Callable[[], str]] = {}


def job(name: str):
    def deco(fn: Callable[[], str]):
        def wrapped() -> Dict[str, Any]:
            started = db.now()
            try:
                detail = fn()
                status = "warn" if detail.startswith("WARN") else "ok"
            except Exception as e:  # noqa: BLE001
                detail, status = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-800:]}", "fail"
            db.log_run(name, started, status, detail, summarize.spent_today())
            print(f"[{name}] {status}: {detail.splitlines()[0]}")
            return {"job": name, "status": status, "detail": detail, "started_at": started.isoformat()}
        JOBS[name] = wrapped
        return wrapped
    return deco


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _geo_guess(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ("bank of england", "gilt", "sterling", "uk ", "britain", "reeves", "starmer", "ons ")):
        return "UK"
    if any(k in t for k in ("china", "pboc", "beijing", "yuan", "renminbi", "hong kong")):
        return "CN"
    if any(k in t for k in ("fed", "treasur", "u.s.", "us ", "wall street", "dollar", "powell")):
        return "US"
    return "GLOBAL"


# ------------------------------------------------------------------ scans

@job("scan.markets")
def scan_markets() -> str:
    cfg = load()["markets"]
    rows = markets.fetch_all(cfg, _today())
    db.upsert(db.market_snapshots, ({"as_of": _today(), "symbol": r.symbol, "payload": r.model_dump(mode="json")} for r in rows))
    stale = [r.symbol for r in rows if (_today() - r.as_of).days > 1]
    note = f" · stale>1d (holiday?): {', '.join(stale)}" if stale else ""
    return f"{'WARN ' if len(rows) < len(cfg) * 0.8 else ''}{len(rows)}/{len(cfg)} instruments{note}"


@job("scan.calendar")
def scan_calendar() -> str:
    evs = calendar_ff.fetch(load()["calendar"])
    db.upsert(db.calendar_events, ({"id": e.id, "geo": e.geo, "at": e.at, "payload": e.model_dump(mode="json"), "updated_at": db.now()} for e in evs))
    return f"{len(evs)} high/med events"


@job("scan.releases")
def scan_releases() -> str:
    """Find releases that happened in the last 36h (from the calendar), read the official page, summarise."""
    since = db.now() - timedelta(hours=36)
    with db.engine().connect() as c:
        rows = c.execute(select(db.calendar_events.c.payload).where(db.calendar_events.c.at >= since, db.calendar_events.c.at <= db.now())).scalars().all()
    events = [CalendarEvent(**p) for p in rows if p.get("importance") == "high"]
    done = 0
    for e in events:
        try:
            text = fetch_text(e.source_url)
        except Exception:
            text = ""
        s = summarize.summarize_release(e.title, text, e.consensus)
        rel = EcoRelease(id=stable_id("rel", e.id), geo=e.geo, category=_category(e.title), title=e.title, released_at=e.at,
                         source_name=e.source, source_url=e.source_url, report_url=e.source_url,
                         outcome=s["outcome"] or (f"Actual {e.actual}" if e.actual else "See report"),
                         consensus=s["consensus"], surprise=s.get("surprise", "na"))
        db.upsert(db.documents, [{"id": rel.id, "kind": "release", "geo": rel.geo, "published_at": rel.released_at, "url": rel.source_url,
                                   "title": rel.title, "raw_text": text[:20000], "payload": rel.model_dump(mode="json"), "created_at": db.now()}])
        done += 1
    return f"{done} releases summarised (LLM ${summarize.spent_today():.2f})"


def _category(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ("cpi", "ppi", "inflation", "price")):
        return "inflation"
    if any(k in t for k in ("payroll", "employment", "unemployment", "claims", "earnings", "wage", "jolts")):
        return "labour"
    if any(k in t for k in ("gdp", "retail", "production", "pmi", "ism", "construction", "output")):
        return "activity"
    if any(k in t for k in ("mortgage", "loan", "credit", "house", "m2", "financing")):
        return "credit"
    if any(k in t for k in ("trade", "borrowing", "budget", "current account", "reserves")):
        return "government"
    return "other"


@job("scan.decision_makers")
def scan_decision_makers() -> str:
    items = feeds.decision_maker_items(load()["decision_maker_feeds"])
    warn = 0
    for it in items:
        try:
            text = fetch_text(it.url)
        except Exception:
            text, warn = "", warn + 1
        s = summarize.summarize_document(it.institution, it.title, text or it.summary or it.title)
        it.summary, it.tags = s["summary"], s["tags"]
        db.upsert(db.documents, [{"id": it.id, "kind": "dm_item", "geo": it.geo, "published_at": it.published_at, "url": it.url, "title": it.title,
                                   "raw_text": text[:20000], "payload": it.model_dump(mode="json"), "created_at": db.now()}])
    return f"{'WARN ' if warn else ''}{len(items)} new items ({warn} unreadable pages)"


@job("scan.news")
def scan_news() -> str:
    cfg = load()["news"]
    hs: List[Headline] = []
    try:
        hs += news_brave.headlines(cfg)
    except Exception as e:  # no key → RSS only
        print(f"[news] brave skipped: {e}")
    hs += feeds.news_rss(cfg.get("rss", []), _geo_guess)
    seen, kept = set(), []
    for h in sorted(hs, key=lambda h: (h.tier, -h.published_at.timestamp())):
        k = h.title.lower()[:70]
        if k in seen:
            continue
        seen.add(k)
        kept.append(h)
    cap = int(cfg.get("max_per_tier", 6))
    final = [h for t in (1, 2, 3) for h in [x for x in kept if x.tier == t][:cap]]
    db.upsert(db.documents, ({"id": h.id, "kind": "headline", "geo": h.geo, "published_at": h.published_at, "url": h.url, "title": h.title,
                              "raw_text": None, "payload": h.model_dump(mode="json"), "created_at": db.now()} for h in final))
    return f"{len(final)} headlines kept from {len(hs)} candidates"


@job("dashboard.refresh")
def dashboard_refresh() -> str:
    updated, failed = 0, []
    for s in load()["eco_series"]:
        try:
            obs = eco_data.fetch(s)
        except Exception as e:
            failed.append(f"{s['id']}({type(e).__name__})")
            continue
        if obs:
            db.upsert(db.eco_observations, ({"series_id": s["id"], "period": p, "value": v, "revised_at": db.now(), "source": s.get("source")} for p, v in obs))
            updated += 1
        db.upsert(db.eco_series_meta, [{"series_id": s["id"], "payload": s}])
    return f"{'WARN ' if failed else ''}{updated} series refreshed" + (f" · failed: {', '.join(failed)}" if failed else "")


@job("weekly.positioning")
def weekly_positioning() -> str:
    cfg = load()["positioning"]
    cot = positioning.cftc_tff(cfg["cftc_markets"])
    pm = positioning.polymarket(cfg.get("polymarket_slugs", []))
    db.upsert(db.documents, [{"id": stable_id("pos", str(_today())), "kind": "positioning", "geo": "GLOBAL", "published_at": db.now(),
                              "url": positioning.TFF_URL, "title": "Weekly positioning", "raw_text": None,
                              "payload": {"cftc": cot, "polymarket": pm}, "created_at": db.now()}])
    return f"CFTC {len(cot)} markets · Polymarket {len(pm)} markets"


# ------------------------------------------------------------------ brief

def build_bundle(as_of: date) -> BriefBundle:
    with db.engine().connect() as c:
        mk = [MarketRow(**p) for p in c.execute(select(db.market_snapshots.c.payload).where(db.market_snapshots.c.as_of == db.latest_market_date())).scalars()]
        cal = [CalendarEvent(**p) for p in c.execute(select(db.calendar_events.c.payload).where(db.calendar_events.c.at >= db.now() - timedelta(hours=6))).scalars()]
        since = db.now() - timedelta(hours=36)
        docs = c.execute(select(db.documents.c.kind, db.documents.c.payload).where(db.documents.c.published_at >= since)).all()
    rel = [EcoRelease(**p) for k, p in docs if k == "release"]
    dm = [DecisionMakerItem(**p) for k, p in docs if k == "dm_item"]
    hs = [Headline(**p) for k, p in docs if k == "headline"]
    bundle = BriefBundle(as_of=as_of, generated_at=db.now(), markets=mk, calendar=cal, releases=rel, decision_makers=dm, headlines=hs)
    facts = "\n".join(f"{m.name} {m.close} ({m.d1:+.2f})" for m in mk[:12]) + "\n" + "\n".join(r.outcome for r in rel[:4])
    bundle.one_liner = summarize.one_liner(facts)
    return bundle


@job("daily_brief.email")
def daily_brief_email() -> str:
    for name in ("scan.markets", "scan.calendar", "scan.releases", "scan.decision_makers", "scan.news"):
        JOBS[name]()
    bundle = build_bundle(_today())
    html = render(bundle)
    to = [x.strip() for x in env("EMAIL_TO", "").split(",") if x.strip()]
    receipt = send(f"MacroBrief — {bundle.as_of:%a %-d %b}: {bundle.one_liner[:60] or 'Daily brief'}", html, to or ["stdout"])
    db.upsert(db.briefs, [{"as_of": bundle.as_of, "html": html, "bundle": bundle.model_dump(mode="json"), "sent_at": db.now()}])
    return f"sent ({receipt}) · {len(bundle.markets)} mkts · {len(bundle.calendar)} events · {len(bundle.releases)} releases · {len(bundle.decision_makers)} DM · {len(bundle.headlines)} headlines · LLM ${summarize.spent_today():.2f}"
