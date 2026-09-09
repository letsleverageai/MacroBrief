"""Brave Search API — headline discovery. Free tier: 2,000 queries/month (~66/day); we use ~12–20/day.

We ask for news results with freshness=pd (past day), then rank by publisher tier and de-duplicate by
normalised title. Full text is only fetched for domains where the user has supplied a login cookie
(FT_COOKIE, WSJ_COOKIE …); otherwise the brief carries the title only, as specified in the brief.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from dateutil import parser as dtp

from ..config import env
from ..models import Headline
from .base import get_json, stable_id

BRAVE_NEWS = "https://api.search.brave.com/res/v1/news/search"


def _tier(url: str, tiers: Dict[int, List[str]]) -> Optional[int]:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    for t, domains in tiers.items():
        if any(host == d or host.endswith("." + d) for d in domains):
            return int(t)
    return None


def _norm(title: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", title.lower())[:80]


def search(query: str, count: int = 10) -> List[Dict[str, Any]]:
    key = env("BRAVE_API_KEY")
    if not key:
        raise RuntimeError("BRAVE_API_KEY not set (https://brave.com/search/api/)")
    j = get_json(BRAVE_NEWS, params={"q": query, "count": count, "freshness": "pd", "search_lang": "en"},
                 headers={"X-Subscription-Token": key, "Accept": "application/json"}, cache_ttl=1800)
    return j.get("results", [])


def headlines(cfg: Dict[str, Any]) -> List[Headline]:
    tiers = {int(k): v for k, v in cfg["tiers"].items()}
    seen, out = set(), []
    for geo, queries in cfg.get("brave_queries", {}).items():
        for q in queries:
            try:
                results = search(q)
            except Exception as e:
                print(f"[brave] {q}: {e}")
                continue
            for r in results:
                tier = _tier(r.get("url", ""), tiers)
                if tier is None:
                    tier = 3 if "news" in r.get("url", "") else None
                if tier is None:
                    continue
                key = _norm(r["title"])
                if key in seen:
                    continue
                seen.add(key)
                age = r.get("age") or r.get("page_age")
                try:
                    when = dtp.parse(age) if age and re.match(r"\d{4}-", age) else datetime.now(timezone.utc)
                except Exception:
                    when = datetime.now(timezone.utc)
                if when.tzinfo is None:
                    when = when.replace(tzinfo=timezone.utc)
                out.append(Headline(
                    id=stable_id(r["url"]), tier=tier, source=(r.get("meta_url") or {}).get("hostname", urlparse(r["url"]).netloc),
                    title=r["title"], url=r["url"], published_at=when, geo=geo,
                    summary=(r.get("description") or None) if tier == 3 else None, access="title",
                ))
    # Rank: tier asc, recency desc; cap per tier
    cap = int(cfg.get("max_per_tier", 6))
    ranked: List[Headline] = []
    for t in (1, 2, 3):
        ranked += sorted([h for h in out if h.tier == t], key=lambda h: h.published_at, reverse=True)[:cap]
    return ranked
