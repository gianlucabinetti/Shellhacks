from pydantic import BaseModel, Field


class Allocation(BaseModel):
    stocks: float = Field(ge=0, le=1)
    bonds: float = Field(ge=0, le=1)
    cash: float = Field(ge=0, le=1)
    crypto: float = Field(default=0, ge=0, le=1)


class PortfolioAnalytics(BaseModel):
    risk_profile: str
    portfolio_value: float = Field(gt=0)
    allocation: Allocation

    annual_return: float | None = None
    annual_volatility: float | None = None
    max_drawdown: float | None = None

    time_horizon_years: int | None = None
    is_simulated: bool = True
    period_return: float | None = None
    period_start: str | None = None
    period_end: str | None = None
    data_source: str | None = None
    asset_symbols: list[str] = Field(default_factory=list)


class PortfolioExplanation(BaseModel):
    summary: str
    risk_explanation: str
    allocation_explanation: str
    beginner_tip: str
    disclaimer: str
