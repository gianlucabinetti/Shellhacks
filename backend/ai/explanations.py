from .models import PortfolioAnalytics, PortfolioExplanation


def percent(value: float | None) -> str:
    if value is None:
        return "not available"

    return f"{value * 100:.1f}%"


def create_fallback_explanation(
    data: PortfolioAnalytics,
) -> PortfolioExplanation:
    stocks = data.allocation.stocks * 100
    bonds = data.allocation.bonds * 100
    cash = data.allocation.cash * 100

    summary = (
        f"This example portfolio follows a "
        f"{data.risk_profile.lower()} risk profile."
    )

    if data.risk_profile == "custom":
        summary = "This is a hypothetical portfolio built from your selected assets."

    allocation_explanation = (
        f"It contains approximately {stocks:.0f}% stocks, "
        f"{bonds:.0f}% bonds, and {cash:.0f}% cash."
    )
    if data.allocation.crypto:
        allocation_explanation = (
            f"Its initial allocation is {stocks:.0f}% stocks, {bonds:.0f}% bonds, "
            f"{cash:.0f}% cash, and {data.allocation.crypto * 100:.0f}% crypto."
        )

    if data.annual_volatility is not None:
        risk_explanation = (
            f"Historical annual volatility for this example was "
            f"approximately {percent(data.annual_volatility)}. "
        )
    else:
        risk_explanation = (
            "Historical volatility information is not currently available. "
        )

    if data.max_drawdown is not None:
        risk_explanation += (
            f"The largest historical decline measured in the selected "
            f"period was approximately "
            f"{percent(abs(data.max_drawdown))}."
        )

    beginner_tip = (
        "Higher stock allocations generally create greater potential "
        "for growth, but they can also produce larger short-term losses. "
        "Bonds and cash can reduce some portfolio volatility, although "
        "they do not eliminate investment risk."
    )

    disclaimer = (
        "This information is educational and based on simulated or "
        "historical data. It is not a guarantee of future performance "
        "or individualized financial advice."
    )

    if data.allocation.crypto:
        beginner_tip = (
            "Crypto trades around the clock. Holding several coins does not eliminate "
            "shared market risk. This example excludes staking income, fees, and taxes."
        )
    if data.period_return is not None:
        summary += f" Its calculated return over the displayed period was {percent(data.period_return)}."

    return PortfolioExplanation(
        summary=summary,
        risk_explanation=risk_explanation,
        allocation_explanation=allocation_explanation,
        beginner_tip=beginner_tip,
        disclaimer=disclaimer,
    )
