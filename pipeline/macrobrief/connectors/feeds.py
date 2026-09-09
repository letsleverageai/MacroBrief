"""RSS/Atom/HTML feeds for decision makers and news publishers."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import feedparser
from dateutil import parser as dtp

from ..models import DecisionMakerItem, Headline
from .base import get, stable_id


def _when(entry: Any) -> Optional[datetime]:
    for k in ("published", "updated", "created"):
        v = entry.get(k)
        if v:
            try:
                d = dtp.parse(v)
                return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def parse_feed(url: str, since_hours: int = 36) -> List[Dict[str, Any]]:
    r = get(url, cache_ttl=900)
    fp = feedparser.parse(r.text)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    out = []
    for e in fp.entries:
        when = _when(e) or datetime.now(timezone.utc)
        if when < cutoff:
            continue
        out.append({"title": e.get("title", "").strip(), "url": e.get("link", ""), "published_at": when,
                    "summary": re.sub(r"<[^>]+>", "", e.get("summary", "") or "")[:600]})
    return out


_LINK = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S | re.I)


def parse_html_list(url: str, min_title_len: int = 25, limit: int = 15) -> List[Dict[str, Any]]:
    """Fallback for publishers with no feed (PBoC, US Treasury, Ofwat): take the page's long-ish links."""
    r = get(url, cache_ttl=900)
    base = re.match(r"^(https?://[^/]+)", url).group(1)
    seen, out = set(), []
    for href, inner in _LINK.findall(r.text):
        title = re.sub(r"<[^>]+>|\s+", " ", inner).strip()
        if len(title) < min_title_len or href in seen:
            continue
        seen.add(href)
        full = href if href.startswith("http") else base + (href if href.startswith("/") else "/" + href)
        out.append({"title": title, "url": full, "published_at": datetime.now(timezone.utc), "summary": ""})
        if len(out) >= limit:
            break
    return out


def decision_maker_items(feeds: List[Dict[str, Any]]) -> List[DecisionMakerItem]:
    items: List[DecisionMakerItem] = []
    for f in feeds:
        try:
            raw = parse_html_list(f["url"]) if f.get("kind") == "html" else parse_feed(f["url"])
        except Exception as e:
            print(f"[feeds] {f['institution']}: {e}")
            continue
        for r in raw:
            items.append(DecisionMakerItem(
                id=stable_id(f["institution"], r["url"]), geo=f["geo"], institution=f["institution"], type=f["type"],
                title=r["title"], published_at=r["published_at"], url=r["url"], summary=r["summary"],
            ))
    return items


def news_rss(feeds: List[Dict[str, Any]], geo_guess) -> List[Headline]:
    out: List[Headline] = []
    for f in feeds:
        try:
            raw = parse_feed(f["url"], since_hours=24)
        except Exception as e:
            print(f"[news] {f['source']}: {e}")
            continue
        for r in raw:
            out.append(Headline(id=stable_id(r["url"]), tier=f["tier"], source=f["source"], title=r["title"], url=r["url"],
                                published_at=r["published_at"], geo=geo_guess(r["title"]), access="title"))
    return out
