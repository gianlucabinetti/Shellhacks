# pytest helps us automatically check whether our calculations work.
import pytest

# Import the functions we want to test.
from backend.analytics.returns import (
    calculate_portfolio_return,
    calculate_volatility,
    calculate_max_drawdown,
)

from backend.analytics.scenarios import calculate_future_value


def test_calculate_portfolio_return():
    # Example moderate portfolio:
    # 60% stocks, 35% bonds, 5% cash.
    weights = [0.60, 0.35, 0.05]

    # Example gains/losses:
    # stocks gained 10%
    # bonds gained 4%
    # cash gained 0%
    returns = [0.10, 0.04, 0.00]

    # Run the portfolio return function.
    result = calculate_portfolio_return(weights, returns)

    # Expected result:
    # 0.074 = 7.4%
    #
    # assert means:
    # "This must be true or the test fails."
    assert result == 0.074


def test_calculate_volatility():
    # Example portfolio returns across 3 time periods:
    # period 1 = gained 5%
    # period 2 = lost 2%
    # period 3 = gained 8%
    portfolio_returns = [0.05, -0.02, 0.08]

    # Calculate how much those returns jump around.
    result = calculate_volatility(portfolio_returns)

    # pytest.approx allows tiny decimal rounding differences.
    assert result == pytest.approx(0.051316)


def test_calculate_max_drawdown():
    # Example portfolio values over time:
    #
    # $10,000 -> $11,000 -> $9,000 -> $12,000
    #
    # The biggest drop happens from $11,000 to $9,000.
    portfolio_values = [10000, 11000, 9000, 12000]

    # Calculate the biggest percentage drop.
    result = calculate_max_drawdown(portfolio_values)

    # Expected biggest drop:
    # about -18.18%
    assert result == pytest.approx(-0.18181818181818182)


def test_calculate_future_value():
    # Start with $10,000.
    initial_investment = 10000

    # Assume it grows 5% every year.
    annual_return = 0.05

    # Let it grow for 10 years.
    years = 10

    # Calculate the future amount.
    result = calculate_future_value(
        initial_investment,
        annual_return,
        years,
    )

    # $10,000 growing at 5% for 10 years
    # should become about $16,288.95.
    assert result == pytest.approx(16288.946)

    