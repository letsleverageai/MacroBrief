"""Positioning & sentiment: CFTC Commitments of Traders (the 'CBOT equivalent'), Polymarket, AAII.

CFTC publishes every Friday 15:30 ET for the Tuesday prior. The 'Traders in Financial Futures' (TFF)
report splits Dealer / Asset Manager / Leveraged Funds — 'Leveraged Funds' ≈ hedge funds.
"""
from __future__ import annotations

import csv
import io
from typing import Any, Dict, List

from .base import get, get_json

TFF_URL = "https://www.cftc.gov/dea/newcot/FinComDisagg.txt"  # current week, futures+options combined
TFF_COLUMNS = [
    "Market_and_Exchange_Names", "As_of_Date_In_Form_YYMMDD", "Report_Date_as_YYYY-MM-DD", "CFTC_Contract_Market_Code",
    "CFTC_Market_Code", "CFTC_Region_Code", "CFTC_Commodity_Code", "Open_Interest_All",
    "Dealer_Positions_Long_All", "Dealer_Positions_Short_All", "Dealer_Positions_Spread_All",
    "Asset_Mgr_Positions_Long_All", "Asset_Mgr_Positions_Short_All", "Asset_Mgr_Positions_Spread_All",
    "Lev_Money_Positions_Long_All", "Lev_Money_Positions_Short_All", "Lev_Money_Positions_Spread_All",
]


def cftc_tff(markets: List[str]) -> List[Dict[str, Any]]:
    r = get(TFF_URL, cache_ttl=6 * 3600)
    rows = csv.reader(io.StringIO(r.text))
    out = []
    for row in rows:
        name = row[0].strip() if row else ""
        if not any(m.upper() in name.upper() for m in markets):
            continue
        rec = dict(zip(TFF_COLUMNS, row))
        try:
            lev_net = int(rec["Lev_Money_Positions_Long_All"]) - int(rec["Lev_Money_Positions_Short_All"])
            am_net = int(rec["Asset_Mgr_Positions_Long_All"]) - int(rec["Asset_Mgr_Positions_Short_All"])
        except (KeyError, ValueError):
            continue
        out.append({"market": name, "report_date": rec["Report_Date_as_YYYY-MM-DD"], "open_interest": int(rec["Open_Interest_All"]),
                    "leveraged_funds_net": lev_net, "asset_managers_net": am_net,
                    "source_url": "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm"})
    return out


def polymarket(slugs: List[str]) -> List[Dict[str, Any]]:
    """Gamma API: https://gamma-api.polymarket.com/events?slug=... (free, no key)."""
    out = []
    for slug in slugs:
        try:
            ev = get_json("https://gamma-api.polymarket.com/events", params={"slug": slug}, cache_ttl=1800)
        except Exception as e:
            print(f"[polymarket] {slug}: {e}")
            continue
        for e in ev:
            for m in e.get("markets", []):
                try:
                    prices = [float(p) for p in eval(m.get("outcomePrices", "[]"))] if isinstance(m.get("outcomePrices"), str) else m.get("outcomePrices", [])
                    outcomes = eval(m.get("outcomes", "[]")) if isinstance(m.get("outcomes"), str) else m.get("outcomes", [])
                except Exception:
                    prices, outcomes = [], []
                out.append({"event": e.get("title"), "market": m.get("question"), "outcomes": dict(zip(outcomes, prices)),
                            "volume": m.get("volumeNum"), "url": f"https://polymarket.com/event/{slug}"})
    return out


def aaii() -> Dict[str, Any]:
    """AAII publishes a weekly sentiment table; scrape the three percentages (bullish/neutral/bearish)."""
    import re
    r = get("https://www.aaii.com/sentimentsurvey/sent_results", cache_ttl=6 * 3600)
    nums = re.findall(r"(\d{1,2}\.\d)%", r.text)
    if len(nums) >= 3:
        b, n, be = (float(x) for x in nums[:3])
        return {"bullish": b, "neutral": n, "bearish": be, "spread": round(b - be, 1), "source_url": "https://www.aaii.com/sentimentsurvey"}
    return {}
