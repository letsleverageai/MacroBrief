"""Shared HTTP client: polite UA, timeouts, retries, on-disk cache for re-runs, and a text extractor."""
from __future__ import annotations

import hashlib
import json
import re
import time
from html import unescape
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import ROOT

UA = "MacroBrief/0.1 (+https://github.com/; personal research tool; contact via site)"
CACHE_DIR = ROOT / "data" / "http_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

_client = httpx.Client(headers={"User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9"}, timeout=25, follow_redirects=True)


def _cache_path(url: str, params: Optional[Dict[str, Any]]) -> Path:
    h = hashlib.sha1((url + json.dumps(params or {}, sort_keys=True)).encode()).hexdigest()
    return CACHE_DIR / f"{h}.json"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8), reraise=True)
def get(url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None,
        cache_ttl: int = 0) -> httpx.Response:
    """GET with retry. cache_ttl>0 caches the body on disk (useful when re-rendering a brief)."""
    cp = _cache_path(url, params)
    if cache_ttl and cp.exists() and time.time() - cp.stat().st_mtime < cache_ttl:
        data = json.loads(cp.read_text())
        return httpx.Response(200, text=data["text"], request=httpx.Request("GET", url))
    r = _client.get(url, params=params, headers=headers)
    r.raise_for_status()
    if cache_ttl:
        cp.write_text(json.dumps({"text": r.text}))
    return r


def get_json(url: str, **kw: Any) -> Any:
    return get(url, **kw).json()


_TAG = re.compile(r"<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", re.S | re.I)
_TAGS = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t\r\f\v]+")


def html_to_text(html: str, max_chars: int = 20000) -> str:
    """Cheap, dependency-free HTML→text good enough for LLM summarisation of official releases."""
    html = _TAG.sub(" ", html)
    html = re.sub(r"<br\s*/?>|</p>|</div>|</li>|</h\d>|</tr>", "\n", html, flags=re.I)
    txt = unescape(_TAGS.sub(" ", html))
    txt = _WS.sub(" ", txt)
    txt = re.sub(r"\n\s*\n+", "\n\n", txt).strip()
    return txt[:max_chars]


def fetch_text(url: str, cache_ttl: int = 6 * 3600) -> str:
    r = get(url, cache_ttl=cache_ttl)
    ctype = r.headers.get("content-type", "") if hasattr(r, "headers") else ""
    if "pdf" in ctype.lower() or url.lower().endswith(".pdf"):
        return pdf_to_text(r.content)
    return html_to_text(r.text)


def pdf_to_text(data: bytes, max_chars: int = 20000) -> str:
    try:
        import io

        from pypdf import PdfReader  # optional dependency
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((p.extract_text() or "") for p in reader.pages[:12])[:max_chars]
    except Exception:  # pragma: no cover
        return ""


def stable_id(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]
