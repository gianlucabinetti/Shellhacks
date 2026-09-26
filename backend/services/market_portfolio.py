"""Calculate hypothetical results from validated daily market prices."""
import hashlib
import json
import math
import statistics
from datetime import timedelta

from backend.models.market import MarketPortfolio, MarketRequest
from backend.services.market_data import MarketDataError, assets, get_history


def analyze_market_portfolio(request: MarketRequest) -> MarketPortfolio:
    catalog = {a.symbol: a for a in assets()}
    unknown = [h.symbol for h in request.holdings if h.symbol not in catalog]
    if unknown:
        raise MarketDataError("unsupported_asset", "Choose assets from the supported catalog: " + ", ".join(unknown), 422)
    selected = [catalog[h.symbol] for h in request.holdings]
    history = get_history(selected, request.days)
    return calculate_portfolio(request, selected, history)


def calculate_portfolio(request, selected, history) -> MarketPortfolio:
    series = history["series"]
    start = max(min(series[a.symbol]) for a in selected)
    end = history["end"]
    if (end - start).days < 7:
        raise MarketDataError("insufficient_history", "At least seven overlapping calendar days are required.", 422)
    observed, prices, units = {}, {}, {}
    carried = set()
    positions = []
    for asset, holding in zip(selected, request.holdings):
        prior = [d for d in series[asset.symbol] if d <= start]
        if not prior:
            raise MarketDataError("insufficient_history", "There is no common starting period.", 422)
        observed[asset.symbol] = max(prior)
        price = series[asset.symbol][observed[asset.symbol]]
        prices[asset.symbol] = price
        units[asset.symbol] = request.initial_investment * holding.weight / price
        positions.append({
            **asset.model_dump(), "weight": holding.weight, "start_price": price,
            "units": units[asset.symbol],
        })
    performance = []
    day = start
    while day <= end:
        for asset in selected:
            symbol = asset.symbol
            if day in series[symbol]:
                prices[symbol] = series[symbol][day]
                observed[symbol] = day
            elif asset.asset_class == "crypto":
                raise MarketDataError("missing_prices", f"Missing daily crypto price for {symbol} on {day}.", 422)
            elif (day - observed[symbol]).days > 4:
                raise MarketDataError("missing_prices", f"A price gap longer than four days was found for {symbol}.", 422)
            else:
                carried.add(symbol)
        value = sum(units[a.symbol] * prices[a.symbol] for a in selected)
        performance.append({"date": day, "value": value})
        day += timedelta(days=1)
    values = [p["value"] for p in performance]
    returns = [values[i] / values[i - 1] - 1 for i in range(1, len(values))]
    elapsed = (end - start).days
    peak, max_drawdown = values[0], 0.0
    for value in values:
        peak = max(peak, value)
        max_drawdown = min(max_drawdown, value / peak - 1)
    for position in positions:
        symbol = position["symbol"]
        position.update(
            last_close=prices[symbol], last_close_date=observed[symbol],
            end_value=units[symbol] * prices[symbol],
            period_return=prices[symbol] / position["start_price"] - 1,
        )
    notes = [
        "Fictional initial holdings; buy and hold with no rebalancing, fees, taxes, staking income, or trading.",
        "Completed daily prices only. Crypto uses Alpaca US data; equity data, when selected, uses IEX with corporate-action adjustments.",
        "Volatility uses sample standard deviation of calendar-day portfolio returns, annualized by sqrt(365). Drawdown is measured at daily observations.",
    ]
    if carried:
        notes.append("Latest observed equity close carried over non-reporting dates (up to four days): " + ", ".join(sorted(carried)) + ". No crypto prices are filled.")
    requested_start = end - timedelta(days=request.days - 1)
    if start > requested_start:
        notes.append("History starts later than requested because the assets have different available histories.")
    payload = {"request": request.model_dump(), "performance": [{"date": str(p["date"]), "value": p["value"]} for p in performance]}
    data_id = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:20]
    return MarketPortfolio(
        request=request, data_id=data_id, feeds=history["feeds"],
        start_date=start, end_date=end, fetched_at=history["fetched_at"],
        cached=history["cached"], initial_value=values[0], final_value=values[-1],
        total_return=values[-1] / values[0] - 1,
        annualized_return=(values[-1] / values[0]) ** (365 / elapsed) - 1 if elapsed >= 364 else None,
        annualized_volatility=statistics.stdev(returns) * math.sqrt(365),
        max_drawdown=max_drawdown, positions=positions, performance=performance, notes=notes,
    )
