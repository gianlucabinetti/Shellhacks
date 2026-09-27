"""Contracts for actual market prices and hypothetical buy-and-hold portfolios."""
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class MarketAsset(BaseModel):
    symbol: str
    name: str
    asset_class: Literal["crypto", "stock", "bond"]
    category: str

class MarketHolding(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    symbol: str = Field(min_length=1, max_length=24)
    weight: float = Field(gt=0, le=1)

class MarketRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    holdings: list[MarketHolding] = Field(min_length=1, max_length=12)
    initial_investment: float = Field(default=10000, gt=0, le=1000000)
    days: Literal[30, 90, 365] = 90

    @model_validator(mode="after")
    def validate_holdings(self):
        if len({h.symbol for h in self.holdings}) != len(self.holdings):
            raise ValueError("Each asset may appear only once.")
        if abs(sum(h.weight for h in self.holdings) - 1) > 0.000001:
            raise ValueError("Portfolio weights must sum to 100%.")
        return self

class MarketPoint(BaseModel):
    date: date
    value: float

class MarketPosition(MarketAsset):
    weight: float
    start_price: float
    last_close: float
    last_close_date: date
    units: float
    end_value: float
    period_return: float

class MarketPortfolio(BaseModel):
    request: MarketRequest
    data_id: str
    provider: str = "Alpaca"
    feeds: list[str]
    prices_source: str = "market_data"
    holdings_source: str = "fictional"
    performance_method: str = "buy_and_hold_daily"
    is_simulated: bool = True
    start_date: date
    end_date: date
    fetched_at: datetime
    cached: bool
    initial_value: float
    final_value: float
    total_return: float
    annualized_return: float | None
    annualized_volatility: float
    max_drawdown: float
    positions: list[MarketPosition]
    performance: list[MarketPoint]
    notes: list[str]


# --- Portfolio insights: benchmark, correlation, diversification --------------

BenchmarkId = Literal["SPY", "60_40", "BTC"]


class InsightsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    portfolio: MarketRequest
    benchmark: BenchmarkId | None = None


class CorrelationPair(BaseModel):
    a: str
    b: str
    correlation: float


class CorrelationMatrix(BaseModel):
    symbols: list[str]
    matrix: list[list[float | None]]
    observations: int


class Diversification(BaseModel):
    score: int = Field(ge=0, le=100)
    label: str
    effective_bets: float
    diversification_ratio: float
    average_correlation: float | None
    observations: int
    most_correlated: CorrelationPair | None
    least_correlated: CorrelationPair | None
    message: str


class BenchmarkComparison(BaseModel):
    id: BenchmarkId
    name: str
    available: bool
    message: str | None = None
    performance: list[MarketPoint] = Field(default_factory=list)
    total_return: float | None = None
    annualized_volatility: float | None = None
    max_drawdown: float | None = None
    excess_return: float | None = None


class ReturnContribution(BaseModel):
    symbol: str
    dollars: float
    portfolio_return: float


class MarketInsights(BaseModel):
    data_id: str
    correlation: CorrelationMatrix
    diversification: Diversification
    contributions: list[ReturnContribution]
    benchmark: BenchmarkComparison | None


# --- Portfolio chat ------------------------------------------------------------

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    portfolio: MarketRequest
    benchmark: BenchmarkId | None = None
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def ends_with_question(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be from the user.")
        return self


class WhatIfResult(BaseModel):
    holdings: list[MarketHolding]
    total_return: float
    annualized_volatility: float
    max_drawdown: float
    final_value: float
    diversification_score: int


class ChatResponse(BaseModel):
    data_id: str
    source: Literal["bedrock", "fallback"]
    reply: str
    what_ifs: list[WhatIfResult] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
