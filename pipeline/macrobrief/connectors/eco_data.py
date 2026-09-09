"""Economic series connectors: FRED (US), ONS API (UK), BoE IADB (UK), NBS (CN), plus manual/SQL import.

Each returns a list of (period, value) tuples in ascending order. Transforms (yoy/mom/diff/sum12) are
applied here so the stored series matches the unit shown on the dashboard.
"""
from __future__ import annotations

import csv
import io
from typing import Any, Dict, List, Optional, Tuple

from ..config import env
from .base import get, get_json

Obs = List[Tuple[str, float]]


# ------------------------------------------------------------------ transforms

def _pct(a: float, b: float) -> float:
    return (a / b - 1.0) * 100.0 if b else 0.0


def transform(obs: Obs, kind: str, scale: float = 1.0) -> Obs:
    vals = [(p, v * scale) for p, v in obs]
    if kind == "yoy":
        return [(p, round(_pct(v, vals[i - 12][1]), 2)) for i, (p, v) in enumerate(vals) if i >= 12]
    if kind == "mom":
        return [(p, round(_pct(v, vals[i - 1][1]), 2)) for i, (p, v) in enumerate(vals) if i >= 1]
    if kind == "diff":
        return [(p, round(v - vals[i - 1][1], 1)) for i, (p, v) in enumerate(vals) if i >= 1]
    if kind == "minus100":  # index with 'same month last year = 100' -> % y/y (NBS style)
        return [(p, round(v - 100.0, 2)) for p, v in vals]
    if kind == "sum12":
        return [(p, round(sum(x[1] for x in vals[i - 11:i + 1]), 1)) for i, (p, v) in enumerate(vals) if i >= 11]
    return [(p, round(v, 3)) for p, v in vals]


# ------------------------------------------------------------------ FRED (US)

def fred(series_id: str, limit: int = 240) -> Obs:
    key = env("FRED_API_KEY")
    if not key:
        raise RuntimeError("FRED_API_KEY not set (free at https://fred.stlouisfed.org/docs/api/api_key.html)")
    j = get_json("https://api.stlouisfed.org/fred/series/observations",
                 params={"series_id": series_id, "api_key": key, "file_type": "json", "sort_order": "asc", "limit": limit,
                         "observation_start": "2015-01-01"}, cache_ttl=3600)
    out: Obs = []
    for o in j["observations"]:
        if o["value"] in (".", ""):
            continue
        out.append((o["date"][:7], float(o["value"])))
    return out


# ------------------------------------------------------------------ ONS (UK)

def ons(key: str) -> Obs:
    """key = 'CDID/dataset', e.g. 'D7G7/mm23' (CPI y/y).

    The old api.ons.gov.uk timeseries API was retired 25/11/2024. The website exposes the same JSON at
    /<section>/timeseries/<cdid>/<dataset>/data; the search API resolves the section path for a CDID.
    """
    cdid, dataset = key.split("/")
    cdid, dataset = cdid.lower(), dataset.lower()
    s = get_json("https://api.beta.ons.gov.uk/v1/search", params={"content_type": "timeseries", "cdids": cdid.upper()}, cache_ttl=30 * 86400)
    items = [i["uri"] for i in s.get("items", []) if i.get("uri", "").lower().endswith(f"/timeseries/{cdid}/{dataset}")]
    if not items:
        items = [i["uri"] for i in s.get("items", []) if f"/timeseries/{cdid}/" in i.get("uri", "").lower()]
    if not items:
        raise RuntimeError(f"ONS: no timeseries page found for {cdid}/{dataset}")
    j = get_json(f"https://www.ons.gov.uk{items[0]}/data", cache_ttl=3600)
    months = j.get("months") or []
    if months:
        return [(f"{m['year']}-{_month_num(m['month']):02d}", float(m["value"])) for m in months if m.get("value") not in ("", None)]
    quarters = j.get("quarters") or []
    return [(f"{q['year']}-{q['quarter']}", float(q["value"])) for q in quarters if q.get("value") not in ("", None)]


def _month_num(name: str) -> int:
    return ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].index(name.lower()) + 1


# ------------------------------------------------------------------ BoE IADB (UK)

def boe(series_code: str) -> Obs:
    """Bank of England Interactive Database CSV export, e.g. LPMVTVX (mortgage approvals)."""
    r = get("https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp",
            params={"csv.x": "yes", "Datefrom": "01/Jan/2015", "Dateto": "now", "SeriesCodes": series_code,
                    "CSVF": "TN", "UsingCodes": "Y", "VPD": "Y", "VFD": "N"}, cache_ttl=3600)
    out: Obs = []
    for row in csv.DictReader(io.StringIO(r.text)):
        d = row.get("DATE")
        v = row.get(series_code)
        if not d or not v:
            continue
        # DATE like '31 Jul 2026'
        from dateutil import parser as dtp
        dt = dtp.parse(d)
        out.append((dt.strftime("%Y-%m"), float(v)))
    return out


# ------------------------------------------------------------------ NBS (CN)

def nbs(indicator_code: str, fallback: Optional[str] = None) -> Obs:
    """NBS data portal (data.stats.gov.cn) 'easyquery' endpoint. Codes like A01010101 = CPI y/y.
    The portal geo-blocks most non-Chinese IPs (403 UrlACL); DBnomics mirrors NBS (lagging a few months), so
    each series carries a `fallback` like 'NBS/M_A010801/A01080101'. Production fix: a CN-region proxy or Wind/CEIC."""
    try:
        j = get_json("https://data.stats.gov.cn/english/easyquery.htm",
                     params={"m": "QueryData", "dbcode": "hgyd", "rowcode": "zb", "colcode": "sj",
                             "wds": "[]", "dfwds": f'[{{"wdcode":"zb","valuecode":"{indicator_code}"}},{{"wdcode":"sj","valuecode":"LAST36"}}]'},
                     cache_ttl=6 * 3600)
        nodes = j["returndata"]["datanodes"]
        out: Obs = []
        for n in nodes:
            code = next(w["valuecode"] for w in n["wds"] if w["wdcode"] == "sj")  # '202607'
            if n["data"]["hasdata"]:
                out.append((f"{code[:4]}-{code[4:6]}", float(n["data"]["data"])))
        return sorted(out)
    except Exception:
        if not fallback:
            raise
        return dbnomics(fallback)


def dbnomics(series: str) -> Obs:
    """series = 'PROVIDER/DATASET/SERIES_CODE'."""
    j = get_json(f"https://api.db.nomics.world/v22/series/{series}", params={"observations": 1}, cache_ttl=6 * 3600)
    docs = j["series"]["docs"][0]
    return [(p[:7], float(v)) for p, v in zip(docs["period"], docs["value"]) if v not in ("NA", None)]


# ------------------------------------------------------------------ dispatch

def fetch(series_cfg: Dict[str, Any]) -> Obs:
    src = series_cfg.get("source", "manual")
    key = series_cfg.get("key")
    if src == "fred":
        raw = fred(key)
    elif src == "ons":
        raw = ons(key)
    elif src == "boe":
        raw = boe(key)
    elif src == "nbs":
        raw = nbs(key, series_cfg.get("fallback"))
    elif src == "dbnomics":
        raw = dbnomics(key)
    else:
        return []  # manual: maintained via `macrobrief import` (CSV/SQL/DataFrame)
    return transform(raw, series_cfg.get("transform", "none"), float(series_cfg.get("scale", 1.0)))
