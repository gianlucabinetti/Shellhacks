"""
Shared Pydantic contracts for the Portfolio X-Ray API.

These mirror the JSON shapes agreed on with the frontend, analytics,
and AI teammates. Field names and nesting here are the source of
truth for the API layer — if a contract needs to change, change it
here first and tell the other three people before touching a route.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------

class ExperienceLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    experienced = "experienced"


class LossTolerance(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class InvestmentGoal(str, Enum):
    preservation = "preservation"
    income = "income"
    growth = "growth"


class RiskProfile(str, Enum):
    conservative = "conservative"
    moderate = "moderate"
    aggressive = "aggressive"


# ---------------------------------------------------------------------------
# POST /api/risk/assess
# ---------------------------------------------------------------------------

class RiskAssessmentRequest(BaseModel):
    experience: ExperienceLevel
    investment_horizon_years: int = Field(..., ge=0, le=60)
    loss_tolerance: LossTolerance
    goal: InvestmentGoal


class Allocation(BaseModel):
    stocks: float = Field(..., ge=0, le=1)
    bonds: float = Field(..., ge=0, le=1)
    cash: float = Field(..., ge=0, le=1)

    @field_validator("cash")
    @classmethod
    def weights_sum_to_one(cls, cash: float, info) -> float:
        stocks = info.data.get("stocks")
        bonds = info.data.get("bonds")
        if stocks is not None and bonds is not None:
            total = round(stocks + bonds + cash, 6)
            if total != 1.0:
                raise ValueError(f"allocation weights must sum to 1.0, got {total}")
        return cash


class RiskAssessmentResponse(BaseModel):
    risk_profile: RiskProfile
    explanation: str
    allocation: Allocation


# ---------------------------------------------------------------------------
# GET /api/portfolio/{profile}
# ---------------------------------------------------------------------------

class PortfolioMetrics(BaseModel):
    annualized_return: float
    annualized_volatility: float
    max_drawdown: float


class PerformancePoint(BaseModel):
    date: str
    value: float


class PortfolioResponse(BaseModel):
    profile: RiskProfile
    initial_investment: float
    currency: str
    allocation: Allocation
    metrics: PortfolioMetrics
    performance: list[PerformancePoint]
    data_source: str
    is_simulated: bool


# ---------------------------------------------------------------------------
# POST /api/ai/explain
# ---------------------------------------------------------------------------

class AIExplainRequest(BaseModel):
    profile: RiskProfile
    experience: ExperienceLevel


class AIExplainResponse(BaseModel):
    summary: str
    risk_explanation: str
    educational_tip: str
    disclaimer: str


# ---------------------------------------------------------------------------
# GET /api/dashboard/{profile} — aggregate view for the frontend's main screen
# ---------------------------------------------------------------------------

class DashboardResponse(BaseModel):
    portfolio: PortfolioResponse
    explanation: Optional[AIExplainResponse] = None

