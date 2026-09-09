"""Scheduler + small internal API.

- APScheduler runs the cron jobs in Europe/London (DST-aware).
- FastAPI exposes /health, /run/{job} (bearer token; used by the dashboard's "Re-update now" button),
  /brief/latest.json and /eco/{series_id}.json for the web app.
Bind only to the Docker network — never expose this port publicly (see deploy/docker-compose.yml).
"""
from __future__ import annotations

import os
from typing import Any, Dict

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import Depends, FastAPI, Header, HTTPException
from sqlalchemy import select

from . import db, jobs
from .config import env, load, timezone

app = FastAPI(title="MacroBrief pipeline", docs_url=None, redoc_url=None)
scheduler = BackgroundScheduler(timezone=timezone())


def _auth(authorization: str = Header(default="")) -> None:
    token = env("PIPELINE_TOKEN")
    if not token or authorization != f"Bearer {token}":
        raise HTTPException(401, "unauthorised")


@app.on_event("startup")
def _start() -> None:
    db.engine()
    sched = load()["schedule"]
    scheduler.add_job(jobs.JOBS["daily_brief.email"], CronTrigger.from_crontab(env("EMAIL_CRON", sched["daily_email"])), id="email", coalesce=True, misfire_grace_time=1800)
    scheduler.add_job(jobs.JOBS["dashboard.refresh"], CronTrigger.from_crontab(env("DASHBOARD_REFRESH_CRON", sched["dashboard_refresh"])), id="refresh", coalesce=True, misfire_grace_time=3600)
    scheduler.add_job(jobs.JOBS["weekly.positioning"], CronTrigger.from_crontab(sched["weekly_positioning"]), id="positioning", coalesce=True, misfire_grace_time=7200)
    scheduler.start()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "tz": timezone(), "jobs": [{"id": j.id, "next": str(j.next_run_time)} for j in scheduler.get_jobs()]}


@app.post("/run/{job}", dependencies=[Depends(_auth)])
def run(job: str) -> Dict[str, Any]:
    if job not in jobs.JOBS:
        raise HTTPException(404, f"unknown job; available: {sorted(jobs.JOBS)}")
    return jobs.JOBS[job]()


@app.get("/brief/latest.json", dependencies=[Depends(_auth)])
def latest_brief() -> Dict[str, Any]:
    with db.engine().connect() as c:
        row = c.execute(select(db.briefs.c.as_of, db.briefs.c.bundle).order_by(db.briefs.c.as_of.desc()).limit(1)).first()
    if not row:
        raise HTTPException(404, "no brief yet")
    return {"as_of": str(row[0]), **row[1]}


@app.get("/eco/{series_id}.json", dependencies=[Depends(_auth)])
def eco_series(series_id: str) -> Dict[str, Any]:
    with db.engine().connect() as c:
        meta = c.execute(select(db.eco_series_meta.c.payload).where(db.eco_series_meta.c.series_id == series_id)).scalar()
    if not meta:
        raise HTTPException(404, "unknown series")
    return {**meta, "history": db.series_history(series_id)}


@app.get("/calendar.json", dependencies=[Depends(_auth)])
def calendar_json() -> Any:
    from datetime import timedelta
    with db.engine().connect() as c:
        rows = c.execute(select(db.calendar_events.c.payload).where(db.calendar_events.c.at >= db.now() - timedelta(days=3))
                         .order_by(db.calendar_events.c.at)).scalars().all()
    return list(rows)


@app.get("/eco-all.json", dependencies=[Depends(_auth)])
def eco_all() -> Any:
    """All configured series with stored history, shaped for the dashboard (camelCase)."""
    out = []
    for s in load()["eco_series"]:
        hist = db.series_history(s["id"])
        if not hist:
            continue
        out.append({
            "id": s["id"], "geo": s["geo"], "category": s["category"], "name": s["name"], "unit": s["unit"],
            "frequency": s.get("freq", "M"), "history": hist, "sourceName": s.get("source", "").upper() or "official",
            "sourceUrl": s.get("url", ""), "higherIsHot": bool(s.get("hot", False)),
        })
    return out


@app.get("/runs.json", dependencies=[Depends(_auth)])
def runs() -> Any:
    with db.engine().connect() as c:
        rows = c.execute(select(db.run_log).order_by(db.run_log.c.id.desc()).limit(50)).mappings().all()
    return [dict(r) for r in rows]


@app.get("/journal.json", dependencies=[Depends(_auth)])
def journal_list() -> Any:
    with db.engine().connect() as c:
        rows = c.execute(select(db.journal_entries).order_by(db.journal_entries.c.date.desc())).mappings().all()
    return [dict(r) for r in rows]


@app.put("/journal/{entry_id}", dependencies=[Depends(_auth)])
def journal_put(entry_id: str, entry: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import date, datetime
    created = entry.get("created_at")
    row = {
        "id": entry_id, "date": date.fromisoformat(str(entry.get("date") or date.today())[:10]), "geo": entry.get("geo", "GLOBAL"),
        "title": entry.get("title", ""), "body": entry.get("body", ""), "tags": entry.get("tags", []), "links": entry.get("links", []),
        "created_at": datetime.fromisoformat(created.replace("Z", "+00:00")) if isinstance(created, str) and created else db.now(),
        "updated_at": db.now(),
    }
    db.upsert(db.journal_entries, [row])
    return {"ok": True, "id": entry_id}


@app.delete("/journal/{entry_id}", dependencies=[Depends(_auth)])
def journal_delete(entry_id: str) -> Dict[str, Any]:
    with db.engine().begin() as c:
        c.execute(db.journal_entries.delete().where(db.journal_entries.c.id == entry_id))
    return {"ok": True}


def main() -> None:  # `python -m macrobrief.server`
    import uvicorn
    uvicorn.run(app, host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", "8000")))


if __name__ == "__main__":
    main()
