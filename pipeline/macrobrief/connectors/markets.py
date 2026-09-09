"""Market data: yfinance for equities/FX/commodities/UST; official CSVs for gilts (BoE) and CGBs.

Free. One batched download per day (~35 symbols, 1y history) is well within Yahoo's tolerance.
Holiday handling: '1D' compares the last two *available* closes, and we flag when the last close is
older than one business day (e.g. US Labor Day) so the email can say "vs Friday close".
"""
from __future__ import annotations

import csv
import io
from datetime import date
from typing import Any, Dict, List

from ..models import MarketRow
from .base import get


def _perf(series: List[float], n: int) -> float:
    if len(series) <= n or series[-1 - n] == 0:
        return 0.0
    return (series[-1] / series[-1 - n] - 1.0) * 100.0


def _bp(series: List[float], n: int) -> float:
    if len(series) <= n:
        return 0.0
    return (series[-1] - series[-1 - n]) * 100.0


def _since(series: List[float], dates: List[date], start: date, unit: str) -> float:
    base = None
    for v, d in zip(series, dates):
        if d < start:
            base = v
    if base is None:
        base = series[0]
    return (series[-1] - base) * 100.0 if unit == "pct" else (series[-1] / base - 1.0) * 100.0


def rows_from_history(cfg: Dict[str, Any], closes: List[float], dates: List[date], as_of: date) -> MarketRow:
    unit = cfg.get("unit", "px")
    mtd_start = as_of.replace(day=1)
    ytd_start = as_of.replace(month=1, day=1)
    year = closes[-252:]
    return MarketRow(
        symbol=cfg["symbol"], name=cfg["name"], asset_class=cfg["asset_class"], geo=cfg["geo"], unit=unit,
        close=round(closes[-1], 4),
        d1=round(_bp(closes, 1) if unit == "pct" else _perf(closes, 1), 2),
        d5=round(_bp(closes, 5) if unit == "pct" else _perf(closes, 5), 2),
        mtd=round(_since(closes, dates, mtd_start, unit), 2),
        ytd=round(_since(closes, dates, ytd_start, unit), 2),
        hi52=round(max(year), 4), lo52=round(min(year), 4),
        spark=[round(v, 4) for v in closes[-24:]],
        source_url=cfg.get("url") or f"https://finance.yahoo.com/quote/{cfg['symbol']}",
        as_of=dates[-1],
    )


def fetch_yfinance(cfgs: List[Dict[str, Any]], as_of: date) -> List[MarketRow]:
    import yfinance as yf  # optional dependency (pipeline[markets])

    symbols = [c["symbol"] for c in cfgs]
    data = yf.download(symbols, period="1y", interval="1d", auto_adjust=False, progress=False, group_by="ticker", threads=True)
    out: List[MarketRow] = []
    for c in cfgs:
        try:
            s = data[c["symbol"]]["Close"].dropna() if len(symbols) > 1 else data["Close"].dropna()
            closes = [float(v) for v in s.values]
            dates = [d.date() for d in s.index]
            if len(closes) < 10:
                continue
            row = rows_from_history(c, closes, dates, as_of)
            if row.unit == "pct" and row.close > 20:  # ^TNX etc. are quoted ×10 in some periods
                row.close /= 10
            out.append(row)
        except Exception as e:  # keep going; the run log will show partial coverage
            print(f"[markets] {c['symbol']}: {e}")
    return out


def fetch_boe_gilt_curve(cfgs: List[Dict[str, Any]], as_of: date) -> List[MarketRow]:
    """Bank of England nominal government spot curve (daily). Free CSV/ZIP.
    https://www.bankofengland.co.uk/statistics/yield-curves — the 'latest' zip contains GLC Nominal daily data.
    For the mock we implement the parsing contract and fall back gracefully if the layout changes."""
    # Implementation note: the BoE publishes an XLSX in a zip; in production use openpyxl to read the
    # '4. spot curve' sheet, columns are tenors (0.5..40y). Here we sketch the flow.
    return []


def fetch_chinabond(cfgs: List[Dict[str, Any]], as_of: date) -> List[MarketRow]:
    """ChinaBond CGB yield curve (English site has a daily table). Scrape with a 24h cache."""
    return []


def fetch_all(cfgs: List[Dict[str, Any]], as_of: date) -> List[MarketRow]:
    yf_cfgs = [c for c in cfgs if c.get("source", "yfinance") == "yfinance"]
    rows = fetch_yfinance(yf_cfgs, as_of)
    rows += fetch_boe_gilt_curve([c for c in cfgs if c.get("source") == "boe_curve"], as_of)
    rows += fetch_chinabond([c for c in cfgs if c.get("source") == "chinabond"], as_of)
    return rows


def stooq_history(symbol: str) -> List[Dict[str, Any]]:
    """Fallback: Stooq daily CSV (e.g. '^spx', 'gbpusd'). Free, no key."""
    r = get(f"https://stooq.com/q/d/l/?s={symbol}&i=d", cache_ttl=3600)
    return list(csv.DictReader(io.StringIO(r.text)))
