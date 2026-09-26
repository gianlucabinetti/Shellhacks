"""POST /api/risk/assess — deterministic preliminary risk-tolerance scoring."""
from fastapi import APIRouter

from backend.models.schemas import RiskAssessmentRequest, RiskAssessmentResponse
from backend.services.risk_scoring import assess_risk

router = APIRouter()


@router.post("/assess", response_model=RiskAssessmentResponse)
def assess(request: RiskAssessmentRequest) -> RiskAssessmentResponse:
    profile, explanation, allocation = assess_risk(request)
    return RiskAssessmentResponse(
        risk_profile=profile, explanation=explanation, allocation=allocation
    )

