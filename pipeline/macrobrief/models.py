"""Pydantic models — the data contract shared with apps/web/src/lib/types.ts. Keep in sync."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Geo = Literal["US", "UK", "CN", "GLOBAL"]
AssetClass = Literal["Equities", "Rates", "FX", "Commodities"]
Importance = Literal["high", "medium"]
Surprise = Literal["beat", "miss", "inline", "na"]
EcoCategory = Literal["activity", "labour", "inflation", "credit", "government", "other"]
InstitutionType = Literal["central_bank", "government", "treasury", "regulator", "statistics"]


class MarketRow(BaseModel):
    symbol: str
    name: str
    asset_class: AssetClass
    geo: Geo
    close: float
    unit: Literal["px", "pct"] = "px"
    d1: float
    d5: float
    mtd: float
    ytd: float
    hi52: float
    lo52: float
    spark: List[float] = Field(default_factory=list)
    source_url: str
    as_of: date


class CalendarEvent(BaseModel):
    id: str
    geo: Geo
    at: datetime
    title: str
    importance: Importance
    consensus: Optional[str] = None
    previous: Optional[str] = None
    actual: Optional[str] = None
    source: str
    source_url: str


class EcoRelease(BaseModel):
    id: str
    geo: Geo
    category: EcoCategory
    title: str
    released_at: datetime
    source_name: str
    source_url: str
    report_url: str
    outcome: str
    consensus: str
    surprise: Surprise = "na"


class DecisionMakerItem(BaseModel):
    id: str
    geo: Geo
    institution: str
    type: InstitutionType
    title: str
    published_at: datetime
    url: str
    summary: str = ""
    tags: List[str] = Field(default_factory=list)


class Headline(BaseModel):
    id: str
    tier: Literal[1, 2, 3]
    source: str
    title: str
    url: str
    published_at: datetime
    geo: Geo
    summary: Optional[str] = None
    access: Literal["full", "title"] = "title"


class SeriesPoint(BaseModel):
    period: str
    value: float


class EcoSeries(BaseModel):
    id: str
    geo: Geo
    category: EcoCategory
    name: str
    unit: str
    frequency: Literal["M", "Q", "W", "D"]
    history: List[SeriesPoint]
    consensus: Optional[float] = None
    source_name: str
    source_url: str
    next_release: Optional[date] = None
    note: Optional[str] = None
    higher_is_hot: bool = False

    @property
    def latest(self) -> SeriesPoint:
        return self.history[-1]

    @property
    def previous(self) -> SeriesPoint:
        return self.history[-2] if len(self.history) > 1 else self.history[-1]


class RunLogEntry(BaseModel):
    job: str
    started_at: datetime
    duration_sec: float
    status: Literal["ok", "warn", "fail"]
    detail: str
    cost_usd: float = 0.0


class BriefBundle(BaseModel):
    """Everything needed to render one day's email."""

    as_of: date
    generated_at: datetime
    markets: List[MarketRow]
    calendar: List[CalendarEvent]
    releases: List[EcoRelease]
    decision_makers: List[DecisionMakerItem]
    headlines: List[Headline]
    one_liner: str = ""
