"""GET /api/portfolio/{profile} — historical performance + metrics."""
from fastapi import APIRouter, HTTPException

from backend.models.schemas import PortfolioResponse
from backend.services.analytics_client import UnsupportedProfileError, get_portfolio_analysis

router = APIRouter()


@router.get("/{profile}", response_model=PortfolioResponse)
def get_portfolio(profile: str) -> PortfolioResponse:
    # `profile` is taken as a plain str (not the RiskProfile enum) on
    # purpose: an unknown profile in a GET path is a "resource not
    # found" (404), not a malformed request (422) — see README for the
    # full 404-vs-422 rationale.
    try:
        data = get_portfolio_analysis(profile)
    except UnsupportedProfileError:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown profile '{profile}'. Supported: conservative, moderate, aggressive.",
        )
    return PortfolioResponse(**data)

