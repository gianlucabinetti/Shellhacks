"""
Adapts the AI teammate's real `backend.ai` package to the API's stable
AIExplainResponse contract.

Why an adapter layer at all, instead of calling `backend.ai` straight
from the route: `backend.ai`'s own models (`PortfolioAnalytics`,
`PortfolioExplanation`) use different field names and a slightly
different shape than what was agreed with the frontend team (see
README "AI contract gaps" for the full list). Keeping that
reconciliation here means the route and the Pydantic response model
never change even if the reconciliation with the AI teammate goes a
different way later — only this file would.
"""
import logging
import os

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

# Load root .env before selecting a provider, including in CLI scripts.
from backend import config as _config

from backend.ai.models import Allocation as _AiAllocation, PortfolioAnalytics
from backend.ai.provider import (
    BedrockExplanationProvider,
    ExplanationProvider,
    FallbackExplanationProvider,
    error_code,
)

logger = logging.getLogger(__name__)


def create_bedrock_provider() -> BedrockExplanationProvider:
    """Use the standard AWS credential chain: role, profile, or temporary keys."""
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    model = os.getenv("BEDROCK_MODEL_ID") or "amazon.nova-lite-v1:0"
    client = boto3.client(
        "bedrock-runtime",
        region_name=region,
        config=Config(
            connect_timeout=3,
            read_timeout=20,
            retries={"mode": "standard", "total_max_attempts": 1},
        ),
    )
    return BedrockExplanationProvider(client=client, model=model)


def _get_provider() -> ExplanationProvider:
    """Explicit provider choice; zero-config local runs stay offline."""
    provider = os.getenv("AI_PROVIDER", "fallback").strip().lower()
    if provider == "fallback":
        return FallbackExplanationProvider()
    if provider != "bedrock":
        raise ValueError("AI_PROVIDER must be 'bedrock' or 'fallback'.")
    try:
        return create_bedrock_provider()
    except (BotoCoreError, ClientError) as error:
        logger.warning(
            "Bedrock client could not initialize (%s); using deterministic fallback. "
            "Run python -m scripts.check_bedrock to diagnose AWS access.",
            error_code(error),
        )
        return FallbackExplanationProvider()


def _to_portfolio_analytics(portfolio: dict) -> PortfolioAnalytics:
    """Map our PortfolioResponse contract dict onto backend.ai's input model.

    Field-name differences bridged here: profile -> risk_profile,
    initial_investment -> portfolio_value, metrics.annualized_return ->
    annual_return, metrics.annualized_volatility -> annual_volatility.
    `time_horizon_years` has no source in the portfolio contract today
    (it's an investor-level fact, not a portfolio-level one) — left as
    None, which the model accepts.
    """
    metrics = portfolio.get("metrics", {})
    allocation = portfolio.get("allocation", {})
    return PortfolioAnalytics(
        risk_profile=portfolio.get("profile", "moderate"),
        portfolio_value=portfolio.get("initial_investment", 0),
        allocation=_AiAllocation(**allocation),
        annual_return=metrics.get("annualized_return"),
        annual_volatility=metrics.get("annualized_volatility"),
        max_drawdown=metrics.get("max_drawdown"),
        time_horizon_years=None,
        is_simulated=portfolio.get("is_simulated", True),
    )


def get_ai_explanation(portfolio: dict, experience: str) -> dict:
    """Return the AIExplainResponse contract dict for a portfolio.

    NOTE — flagged for the AI teammate, not silently patched here:
    `ExplanationProvider.explain()` only takes `analytics`, so
    `experience` isn't actually threaded through to `backend.ai` yet.
    The fallback explanation's tip is the same regardless of
    experience level, even though its own SYSTEM_PROMPT claims to
    tailor language "for investors of different experience levels."
    This parameter is accepted and kept in the route/contract for when
    that's wired up, but it currently has no effect on the output.
    """
    analytics = _to_portfolio_analytics(portfolio)
    provider = _get_provider()
    explanation = provider.explain(analytics)

    return {
        # backend.ai splits "summary" and "allocation_explanation" into
        # two fields; our contract has one `summary` slot, so they're
        # joined here rather than dropping the allocation description.
        "summary": f"{explanation.summary} {explanation.allocation_explanation}".strip(),
        "risk_explanation": explanation.risk_explanation,
        "educational_tip": explanation.beginner_tip,
        "disclaimer": explanation.disclaimer,
    }

