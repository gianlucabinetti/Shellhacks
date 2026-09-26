from backend.ai.models import Allocation, PortfolioAnalytics
from backend.ai.explanations import create_fallback_explanation
from backend.ai.provider import FallbackExplanationProvider


def make_analytics() -> PortfolioAnalytics:
    return PortfolioAnalytics(
        risk_profile="moderate",
        portfolio_value=10000,
        allocation=Allocation(
            stocks=0.60,
            bonds=0.35,
            cash=0.05,
        ),
        annual_return=0.07,
        annual_volatility=0.12,
        max_drawdown=-0.22,
        time_horizon_years=10,
        is_simulated=True,
    )


def test_fallback_explanation():
    analytics = make_analytics()

    result = create_fallback_explanation(analytics)

    assert "moderate" in result.summary.lower()
    assert "60%" in result.allocation_explanation
    assert result.disclaimer


def test_fallback_provider():
    provider = FallbackExplanationProvider()

    result = provider.explain(make_analytics())

    assert result.summary
    assert result.risk_explanation
    assert result.allocation_explanation
    assert result.beginner_tip
    assert result.disclaimer
