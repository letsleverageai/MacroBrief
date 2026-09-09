"""Storage. SQLite in dev, Postgres in prod — same SQLAlchemy Core schema.

Design: append-only daily snapshots keyed by (as_of, id). The dashboard reads the latest snapshot;
history tables let you re-render any past day and audit what the LLM saw.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    select,
    text,
)
from sqlalchemy.engine import Engine

from .config import database_url

metadata = MetaData()

# One row per instrument per day
market_snapshots = Table(
    "market_snapshots", metadata,
    Column("as_of", Date, primary_key=True),
    Column("symbol", String(32), primary_key=True),
    Column("payload", JSON, nullable=False),
)

calendar_events = Table(
    "calendar_events", metadata,
    Column("id", String(64), primary_key=True),
    Column("geo", String(8), index=True),
    Column("at", DateTime(timezone=True), index=True),
    Column("payload", JSON, nullable=False),
    Column("updated_at", DateTime(timezone=True)),
)

# Long-format economic observations: one row per (series, period). Amendable at the backend.
eco_observations = Table(
    "eco_observations", metadata,
    Column("series_id", String(64), primary_key=True),
    Column("period", String(10), primary_key=True),  # YYYY-MM or YYYY-Qn or YYYY-MM-DD
    Column("value", Float, nullable=False),
    Column("revised_at", DateTime(timezone=True)),
    Column("source", String(32)),
)

eco_series_meta = Table(
    "eco_series_meta", metadata,
    Column("series_id", String(64), primary_key=True),
    Column("payload", JSON, nullable=False),
)

documents = Table(
    "documents", metadata,
    Column("id", String(64), primary_key=True),
    Column("kind", String(16), index=True),            # release | dm_item | headline
    Column("geo", String(8), index=True),
    Column("published_at", DateTime(timezone=True), index=True),
    Column("url", Text),
    Column("title", Text),
    Column("raw_text", Text),                          # what the LLM read (for audit)
    Column("payload", JSON, nullable=False),           # summarised model
    Column("created_at", DateTime(timezone=True)),
    UniqueConstraint("url", name="uq_documents_url"),
)

run_log = Table(
    "run_log", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("job", String(64), index=True),
    Column("started_at", DateTime(timezone=True)),
    Column("duration_sec", Float),
    Column("status", String(8)),
    Column("detail", Text),
    Column("cost_usd", Float, default=0.0),
)

# Analyst journal — free-text notes linked to dates, geographies and series.
journal_entries = Table(
    "journal_entries", metadata,
    Column("id", String(32), primary_key=True),
    Column("date", Date, index=True),
    Column("geo", String(8)),
    Column("title", Text),
    Column("body", Text),
    Column("tags", JSON),
    Column("links", JSON),
    Column("created_at", DateTime(timezone=True)),
    Column("updated_at", DateTime(timezone=True)),
)

briefs = Table(
    "briefs", metadata,
    Column("as_of", Date, primary_key=True),
    Column("html", Text),
    Column("bundle", JSON),
    Column("sent_at", DateTime(timezone=True)),
)


_engine: Optional[Engine] = None


def engine() -> Engine:
    global _engine
    if _engine is None:
        url = database_url()
        _engine = create_engine(url, future=True, pool_pre_ping=True)
        metadata.create_all(_engine)
        if url.startswith("sqlite"):
            with _engine.begin() as c:
                c.execute(text("PRAGMA journal_mode=WAL"))
    return _engine


def now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------ helpers

def upsert(table: Table, rows: Iterable[Dict[str, Any]]) -> int:
    """Portable upsert (delete+insert inside one transaction, keyed on the PK)."""
    rows = list(rows)
    if not rows:
        return 0
    pk = [c.name for c in table.primary_key.columns]
    with engine().begin() as c:
        for r in rows:
            cond = [table.c[k] == r[k] for k in pk]
            c.execute(table.delete().where(*cond))
            c.execute(table.insert().values(**r))
    return len(rows)


def log_run(job: str, started: datetime, status: str, detail: str, cost_usd: float = 0.0) -> None:
    with engine().begin() as c:
        c.execute(run_log.insert().values(
            job=job, started_at=started, duration_sec=(now() - started).total_seconds(),
            status=status, detail=detail, cost_usd=cost_usd,
        ))


def latest_market_date() -> Optional[date]:
    with engine().connect() as c:
        r = c.execute(text("select max(as_of) from market_snapshots")).scalar()
        return date.fromisoformat(str(r)) if r else None


def series_history(series_id: str, limit: int = 60) -> List[Dict[str, Any]]:
    with engine().connect() as c:
        q = select(eco_observations.c.period, eco_observations.c.value).where(
            eco_observations.c.series_id == series_id).order_by(eco_observations.c.period.desc()).limit(limit)
        rows = c.execute(q).all()
    return [{"period": p, "value": v} for p, v in reversed(rows)]


def dumps(o: Any) -> str:
    return json.dumps(o, default=str, ensure_ascii=False)
