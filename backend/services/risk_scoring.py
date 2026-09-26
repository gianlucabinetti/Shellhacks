"""
Deterministic preliminary risk-tolerance scoring.

Intentionally simple and fully deterministic (no ML, no randomness) so
it's easy to explain to a user and to unit-test: the same answers
always produce the same profile. It exists to produce an
*illustrative* starting allocation, not a suitability determination
(see the disclaimer baked into every response's explanation).

Design note: investment *experience* and financial *risk tolerance*
are kept separate on purpose. Someone can be a first-time investor
with a genuinely high tolerance for volatility (long horizon, growth
goal, comfortable with paper losses), and someone experienced can
still want a conservative book. So `experience` does NOT feed the
allocation score directly — it only shapes the wording of the
explanation. The allocation itself is driven by loss_tolerance,
horizon, and goal.
"""
from backend.models.schemas import (
    Allocation,
    ExperienceLevel,
    InvestmentGoal,
    LossTolerance,
    RiskAssessmentRequest,
    RiskProfile,
)

_LOSS_TOLERANCE_SCORE = {
    LossTolerance.low: 0,
    LossTolerance.medium: 1,
    LossTolerance.high: 2,
}

_GOAL_SCORE = {
    InvestmentGoal.preservation: 0,
    InvestmentGoal.income: 1,
    InvestmentGoal.growth: 2,
}

# Loss tolerance and horizon are weighted heaviest — they say the most
# about how much volatility someone can actually sit through. Goal
# carries less weight on its own so a "growth" goal paired with zero
# loss tolerance and a short horizon doesn't override those two.
_WEIGHTS = {"loss_tolerance": 2, "horizon": 2, "goal": 1}
_MAX_SCORE = 2 * _WEIGHTS["loss_tolerance"] + 2 * _WEIGHTS["horizon"] + 2 * _WEIGHTS["goal"]  # 10

_ALLOCATIONS = {
    RiskProfile.conservative: Allocation(stocks=0.30, bonds=0.55, cash=0.15),
    RiskProfile.moderate: Allocation(stocks=0.60, bonds=0.35, cash=0.05),
    RiskProfile.aggressive: Allocation(stocks=0.85, bonds=0.15, cash=0.00),
}


def _horizon_score(years: int) -> int:
    if years < 5:
        return 0
    if years <= 15:
        return 1
    return 2


def score_risk(request: RiskAssessmentRequest) -> int:
    """Return the raw 0-10 risk score for a request. Exposed for tests."""
    return (
        _WEIGHTS["loss_tolerance"] * _LOSS_TOLERANCE_SCORE[request.loss_tolerance]
        + _WEIGHTS["horizon"] * _horizon_score(request.investment_horizon_years)
        + _WEIGHTS["goal"] * _GOAL_SCORE[request.goal]
    )


def _profile_from_score(score: int) -> RiskProfile:
    if score <= 3:
        return RiskProfile.conservative
    if score <= 6:
        return RiskProfile.moderate
    return RiskProfile.aggressive


def _explanation(request: RiskAssessmentRequest, profile: RiskProfile) -> str:
    experience_note = {
        ExperienceLevel.beginner: (
            "Since you're new to investing, this leans on plain-language "
            "explanations rather than jargon."
        ),
        ExperienceLevel.intermediate: (
            "Since you've invested before, this assumes you're comfortable "
            "with standard terms like volatility and drawdown."
        ),
        ExperienceLevel.experienced: (
            "Given your experience, this skips the basics and focuses on "
            "the allocation rationale."
        ),
    }[request.experience]

    profile_note = {
        RiskProfile.conservative: (
            "Based on your lower tolerance for loss and/or shorter horizon, "
            "a conservative allocation prioritizes capital preservation over growth."
        ),
        RiskProfile.moderate: (
            "Based on your answers, a moderate allocation balances growth "
            "potential against the ups and downs you said you can tolerate."
        ),
        RiskProfile.aggressive: (
            "Based on your higher loss tolerance, longer horizon, and growth "
            "goal, an aggressive allocation leans heavily into stocks for "
            "long-term growth, accepting larger short-term swings."
        ),
    }[profile]

    return (
        f"{profile_note} {experience_note} This is an educational starting "
        "point, not a complete financial suitability determination."
    )


def assess_risk(request: RiskAssessmentRequest) -> tuple[RiskProfile, str, Allocation]:
    """Run the deterministic scoring pipeline end to end."""
    score = score_risk(request)
    profile = _profile_from_score(score)
    return profile, _explanation(request, profile), _ALLOCATIONS[profile]

