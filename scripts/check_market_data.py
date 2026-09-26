"""One live Alpaca check. No account or order APIs; no fixture fallback."""
import argparse

from backend.models.market import MarketRequest
from backend.services.market_data import MarketDataError
from backend.services.market_portfolio import analyze_market_portfolio


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stocks", action="store_true", help="Check VTI/BND; requires backend Alpaca keys.")
    options = parser.parse_args()
    holdings = (
        [{"symbol": "VTI", "weight": 0.6}, {"symbol": "BND", "weight": 0.4}]
        if options.stocks else
        [{"symbol": "BTC/USD", "weight": 0.5}, {"symbol": "ETH/USD", "weight": 0.3}, {"symbol": "SOL/USD", "weight": 0.2}]
    )
    try:
        result = analyze_market_portfolio(MarketRequest(holdings=holdings, days=30))
    except MarketDataError as error:
        print(f"Alpaca check FAILED ({error.code}): {error.message}")
        return 1
    print(f"Alpaca check PASSED: {', '.join(p.symbol for p in result.positions)}")
    print(f"Completed daily observations: {result.start_date} to {result.end_date}; {len(result.performance)} points.")
    print(f"Feeds: {', '.join(result.feeds)}. Holdings are fictional.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
