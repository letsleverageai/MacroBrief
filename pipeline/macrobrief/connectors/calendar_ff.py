"""Economic calendar from the Forex Factory public JSON feed (free, updated intraday).

Feeds: ff_calendar_thisweek.json / ff_calendar_nextweek.json
Fields: title, country (USD/GBP/CNY/EUR…), date (ISO with offset), impact (High/Medium/Low/Holiday),
        forecast, previous, actual (when released), url.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from dateutil import parser as dtp

from ..models import CalendarEvent
from .base import get_json, stable_id

# Only "thisweek" is published (verified 2026-09-08). Next-week look-ahead comes from official release
# calendars (ONS release calendar RSS, BLS schedule) via feeds.py, merged in scan.calendar.
FEEDS = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
]

# Official "backing document" pages by (country, keyword). Stable URLs — publishers post to the same place each time.
OFFICIAL = {
    ("US", "cpi"): ("BLS", "https://www.bls.gov/cpi/"),
    ("US", "ppi"): ("BLS", "https://www.bls.gov/ppi/"),
    ("US", "non-farm"): ("BLS", "https://www.bls.gov/news.release/empsit.toc.htm"),
    ("US", "unemployment claims"): ("DOL", "https://www.dol.gov/ui/data.pdf"),
    ("US", "retail sales"): ("Census", "https://www.census.gov/retail/"),
    ("US", "gdp"): ("BEA", "https://www.bea.gov/data/gdp/gross-domestic-product"),
    ("US", "fomc"): ("Federal Reserve", "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"),
    ("US", "ism"): ("ISM", "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/"),
    ("UK", "cpi"): ("ONS", "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/latest"),
    ("UK", "gdp"): ("ONS", "https://www.ons.gov.uk/economy/grossdomesticproductgdp"),
    ("UK", "claimant"): ("ONS", "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/latest"),
    ("UK", "earnings"): ("ONS", "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/latest"),
    ("UK", "retail sales"): ("ONS", "https://www.ons.gov.uk/businessindustryandtrade/retailindustry/bulletins/retailsales/latest"),
    ("UK", "official bank rate"): ("Bank of England", "https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes"),
    ("UK", "public sector net borrowing"): ("ONS", "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/latest"),
    ("CN", "cpi"): ("NBS", "https://www.stats.gov.cn/english/PressRelease/"),
    ("CN", "ppi"): ("NBS", "https://www.stats.gov.cn/english/PressRelease/"),
    ("CN", "trade balance"): ("GACC", "http://english.customs.gov.cn/"),
    ("CN", "industrial production"): ("NBS", "https://www.stats.gov.cn/english/PressRelease/"),
    ("CN", "new loans"): ("PBoC", "http://www.pbc.gov.cn/en/3688247/3688978/index.html"),
    ("CN", "pmi"): ("NBS", "https://www.stats.gov.cn/english/PressRelease/"),
    ("GLOBAL", "main refinancing"): ("ECB", "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html"),
}


def _official(geo: str, title: str) -> tuple:
    t = title.lower()
    for (g, kw), v in OFFICIAL.items():
        if g == geo and kw in t:
            return v
    return ("Forex Factory", "https://www.forexfactory.com/calendar")


def fetch(cfg: Dict[str, Any]) -> List[CalendarEvent]:
    cmap = cfg.get("country_map", {"USD": "US", "GBP": "UK", "CNY": "CN", "EUR": "GLOBAL"})
    keep = {i.lower() for i in cfg.get("importance", ["high", "medium"])}
    horizon = datetime.now(timezone.utc) + timedelta(days=int(cfg.get("lookahead_days", 10)))
    out: List[CalendarEvent] = []
    for feed in FEEDS:
        try:
            items = get_json(feed, cache_ttl=1800)
        except Exception as e:
            print(f"[calendar] {feed}: {e}")
            continue
        for it in items:
            geo = cmap.get(it.get("country"))
            if not geo or (it.get("impact") or "").lower() not in keep:
                continue
            at = dtp.parse(it["date"]).astimezone(timezone.utc)
            if at > horizon:
                continue
            src, url = _official(geo, it["title"])
            out.append(CalendarEvent(
                id=stable_id(geo, it["title"], at.isoformat()), geo=geo, at=at, title=it["title"],
                importance="high" if it["impact"].lower() == "high" else "medium",
                consensus=it.get("forecast") or None, previous=it.get("previous") or None, actual=it.get("actual") or None,
                source=src, source_url=url,
            ))
    out.sort(key=lambda e: e.at)
    return out
