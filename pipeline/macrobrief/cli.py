"""CLI: `macrobrief run <job>` · `macrobrief import <csv>` · `macrobrief render` · `macrobrief serve` · `macrobrief jobs`"""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import date
from pathlib import Path

from . import db, jobs
from .email_render import render


def cmd_run(a: argparse.Namespace) -> None:
    if a.job not in jobs.JOBS:
        sys.exit(f"unknown job '{a.job}'. Available: {', '.join(sorted(jobs.JOBS))}")
    r = jobs.JOBS[a.job]()
    print(r["detail"])


def cmd_import(a: argparse.Namespace) -> None:
    """Seed/override history from CSV with columns series_id,period,value (period = YYYY-MM | YYYY-Qn).
    For a pandas DataFrame: df[['series_id','period','value']].to_csv('x.csv', index=False)."""
    rows = list(csv.DictReader(open(a.csv, newline="", encoding="utf-8")))
    n = db.upsert(db.eco_observations, ({"series_id": r["series_id"], "period": r["period"], "value": float(r["value"]),
                                         "revised_at": db.now(), "source": "import"} for r in rows))
    print(f"imported {n} observations")


def cmd_render(a: argparse.Namespace) -> None:
    bundle = jobs.build_bundle(date.fromisoformat(a.date) if a.date else date.today())
    html = render(bundle)
    out = Path(a.out or f"out/brief-{bundle.as_of}.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html)//1024} KB)")


def cmd_serve(_: argparse.Namespace) -> None:
    from .server import main
    main()


def cmd_jobs(_: argparse.Namespace) -> None:
    for j in sorted(jobs.JOBS):
        print(j)


def main() -> None:
    p = argparse.ArgumentParser(prog="macrobrief")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="run a job once")
    r.add_argument("job")
    r.set_defaults(fn=cmd_run)
    i = sub.add_parser("import", help="import eco observations from CSV")
    i.add_argument("csv")
    i.set_defaults(fn=cmd_import)
    rd = sub.add_parser("render", help="render the brief HTML from stored data")
    rd.add_argument("--date")
    rd.add_argument("--out")
    rd.set_defaults(fn=cmd_render)
    sub.add_parser("serve", help="start scheduler + internal API").set_defaults(fn=cmd_serve)
    sub.add_parser("jobs", help="list jobs").set_defaults(fn=cmd_jobs)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
