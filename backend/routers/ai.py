"""POST /api/ai/explain — fetches the portfolio then asks the AI module to explain it."""
from fastapi import APIRouter, HTTPException

from backend.models.schemas import AIExplainRequest, AIExplainResponse
from backend.services.ai_client import get_ai_explanation
from backend.services.analytics_client import UnsupportedProfileError, get_portfolio_analysis

router = APIRouter()


@router.post("/explain", response_model=AIExplainResponse)
def explain(request: AIExplainRequest) -> AIExplainResponse:
    try:
        portfolio = get_portfolio_analysis(request.profile.value)
    except UnsupportedProfileError:
        # In practice unreachable today: `profile` is a RiskProfile enum
        # in the request body, so pydantic already rejects anything
        # outside the three values with a 422 before this runs. Kept so
        # the route degrades gracefully if the enum is ever loosened.
        raise HTTPException(status_code=404, detail=f"Unknown profile: {request.profile}")

    explanation = get_ai_explanation(portfolio, request.experience.value)
    return AIExplainResponse(**explanation)

