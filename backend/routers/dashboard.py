"""
GET /api/dashboard/{profile} — a single aggregated call for the
frontend's main dashboard screen: portfolio analytics plus an AI
explanation in one round trip, so the dashboard doesn't have to fire
two requests and juggle partial-loading states on first load.

Not part of the original three-endpoint contract — added because a
"dashboard" needs both pieces together. It's a thin composition on top
of the other two services, so it's easy to drop or change without
touching /api/portfolio or /api/ai directly.
"""
from fastapi import APIRouter, HTTPException, Query

from backend.models.schemas import DashboardResponse, ExperienceLevel, PortfolioResponse
from backend.services.ai_client import get_ai_explanation
from backend.services.analytics_client import UnsupportedProfileError, get_portfolio_analysis

router = APIRouter()


@router.get("/{profile}", response_model=DashboardResponse)
def get_dashboard(
    profile: str,
    experience: ExperienceLevel = Query(
        default=ExperienceLevel.beginner,
        description="Tailors the AI explanation's tone; defaults to beginner.",
    ),
    include_explanation: bool = Query(
        default=True,
        description="Set false to skip the AI call and return only the portfolio.",
    ),
) -> DashboardResponse:
    try:
        portfolio_data = get_portfolio_analysis(profile)
    except UnsupportedProfileError:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown profile '{profile}'. Supported: conservative, moderate, aggressive.",
        )

    portfolio = PortfolioResponse(**portfolio_data)
    explanation = None
    if include_explanation:
        explanation = get_ai_explanation(portfolio_data, experience.value)

    return DashboardResponse(portfolio=portfolio, explanation=explanation)

