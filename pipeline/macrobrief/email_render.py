"""Render the daily brief HTML and send it (Resend API or SMTP)."""
from __future__ import annotations

import smtplib
from collections import OrderedDict
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Tuple
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .config import env, timezone
from .models import BriefBundle, CalendarEvent

TEMPLATES = Path(__file__).parent / "templates"


def _london(dt: datetime, fmt: str) -> str:
    return dt.astimezone(ZoneInfo(timezone())).strftime(fmt)


def _by_day(events: List[CalendarEvent]) -> List[Tuple[str, List[CalendarEvent]]]:
    days: "OrderedDict[str, List[CalendarEvent]]" = OrderedDict()
    for e in sorted(events, key=lambda e: e.at):
        days.setdefault(_london(e.at, "%A %-d %B"), []).append(e)
    return list(days.items())


def render(bundle: BriefBundle) -> str:
    jenv = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=select_autoescape(["html", "j2"]))
    jenv.filters["london"] = _london
    tpl = jenv.get_template("daily_brief.html.j2")
    return tpl.render(
        as_of=bundle.as_of, generated_at=bundle.generated_at, one_liner=bundle.one_liner,
        dashboard_url=env("DASHBOARD_URL", "http://localhost:3000"),
        markets=bundle.markets, calendar_by_day=_by_day(bundle.calendar), releases=bundle.releases,
        decision_makers=sorted(bundle.decision_makers, key=lambda d: d.published_at, reverse=True),
        headlines=bundle.headlines,
    )


def send(subject: str, html: str, to: List[str]) -> str:
    sender = env("EMAIL_FROM", "brief@localhost")
    if env("RESEND_API_KEY"):
        import resend  # optional dependency
        resend.api_key = env("RESEND_API_KEY")
        r = resend.Emails.send({"from": sender, "to": to, "subject": subject, "html": html})
        return f"resend:{r.get('id')}"
    if env("SMTP_HOST"):
        msg = MIMEMultipart("alternative")
        msg["Subject"], msg["From"], msg["To"] = subject, sender, ", ".join(to)
        msg.attach(MIMEText("Open in an HTML-capable client.", "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(env("SMTP_HOST"), int(env("SMTP_PORT", "587"))) as s:
            s.starttls()
            if env("SMTP_USER"):
                s.login(env("SMTP_USER"), env("SMTP_PASS"))
            s.sendmail(sender, to, msg.as_string())
        return "smtp:ok"
    out = Path(__file__).resolve().parent.parent / "out"
    out.mkdir(exist_ok=True)
    p = out / f"brief-{datetime.now():%Y%m%d}.html"
    p.write_text(html, encoding="utf-8")
    return f"file:{p}"
