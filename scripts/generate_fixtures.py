"""
Generates the mock portfolio fixtures used by `analytics_client.py`
when USE_MOCK_ANALYTICS=true (the default). Deterministic: a fixed
seed per profile every run, mirroring the analytics engine's own
`FixtureDataSource` philosophy — a mock should still be reproducible,
not just random noise on every request.

These are illustrative quarterly points for frontend integration, not
a substitute for the real engine's daily-resolution output. Once the
real `analyze_portfolio()` is wired in (USE_MOCK_ANALYTICS=false),
these fixtures are unused.

Run with: python -m scripts.generate_fixtures
"""
import json
import random
from pathlib import Path

INITIAL_INVESTMENT = 10_000.0
CURRENCY = "USD"
QUARTERS = 12  # 3 years, quarterly points

_PROFILES = {
    "conservative": {
        "seed": 1,
        "allocation": {"stocks": 0.30, "bonds": 0.55, "cash": 0.15},
        "annualized_return": 0.045,
        "annualized_volatility": 0.06,
        "max_drawdown": -0.08,
    },
    "moderate": {
        "seed": 2,
        "allocation": {"stocks": 0.60, "bonds": 0.35, "cash": 0.05},
        "annualized_return": 0.085,
        "annualized_volatility": 0.12,
        "max_drawdown": -0.18,
    },
    "aggressive": {
        "seed": 3,
        "allocation": {"stocks": 0.85, "bonds": 0.15, "cash": 0.00},
        "annualized_return": 0.115,
        "annualized_volatility": 0.19,
        "max_drawdown": -0.32,
    },
}

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "backend" / "services" / "fixtures"


def _quarterly_dates(n: int) -> list[str]:
    # Synthetic quarter-end labels for the mock only; the real engine
    # emits actual trading-day dates from yfinance.
    dates = []
    year, quarter = 2023, 1
    for _ in range(n):
        month = quarter * 3
        dates.append(f"{year}-{month:02d}-28")
        quarter += 1
        if quarter > 4:
            quarter = 1
            year += 1
    return dates


def _generate_series(profile_cfg: dict) -> list[dict]:
    rng = random.Random(profile_cfg["seed"])
    quarterly_return = profile_cfg["annualized_return"] / 4
    quarterly_vol = profile_cfg["annualized_volatility"] / 2  # rough quarterly scaling

    value = INITIAL_INVESTMENT
    series = [{"date": "2023-01-01", "value": round(value, 2)}]
    for date in _quarterly_dates(QUARTERS):
        shock = rng.gauss(quarterly_return, quarterly_vol)
        value *= 1 + shock
        series.append({"date": date, "value": round(value, 2)})
    return series


def main() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    for profile, cfg in _PROFILES.items():
        fixture = {
            "profile": profile,
            "initial_investment": INITIAL_INVESTMENT,
            "currency": CURRENCY,
            "allocation": cfg["allocation"],
            "metrics": {
                "annualized_return": cfg["annualized_return"],
                "annualized_volatility": cfg["annualized_volatility"],
                "max_drawdown": cfg["max_drawdown"],
            },
            "performance": _generate_series(cfg),
            "data_source": "fixture",
            "is_simulated": True,
        }
        out_path = FIXTURES_DIR / f"portfolio_{profile}.json"
        out_path.write_text(json.dumps(fixture, indent=2))
        print(f"wrote {out_path}")


if __name__ == "__main__":
    main()

