"""Portfolio insight calculations: correlation, diversification, benchmarks.

Pure functions over plain numbers and dates so they are easy to test
without market data or the API.
"""
import math
import statistics
from datetime import date
from itertools import combinations

MIN_OBSERVATIONS = 5


def aligned_returns(series: dict[str, dict[date, float]], symbols: list[str], start: date) -> dict[str, list[float]]:
    """Daily returns on dates where every asset has a real price.

    Using only shared observation dates avoids the fake zero returns that
    carrying stock prices over weekends would add next to 24/7 crypto.
    """
    common = sorted(set.intersection(*(set(d for d in series[s] if d >= start) for s in symbols)))
    return {
        s: [series[s][b] / series[s][a] - 1 for a, b in zip(common, common[1:])]
        for s in symbols
    }


def correlation(a: list[float], b: list[float]) -> float | None:
    """Pearson correlation, or None when either series never moves."""
    if len(a) < MIN_OBSERVATIONS or len(a) != len(b):
        return None
    try:
        return max(-1.0, min(1.0, statistics.correlation(a, b)))
    except statistics.StatisticsError:
        return None


def correlation_matrix(returns: dict[str, list[float]], symbols: list[str]) -> list[list[float | None]]:
    return [[1.0 if x == y else correlation(returns[x], returns[y]) for y in symbols] for x in symbols]


def diversification(weights: dict[str, float], returns: dict[str, list[float]]) -> dict:
    """Diversification ratio and "effective independent bets".

    ratio = weighted average asset volatility / portfolio volatility.
    effective_bets = ratio**2 (Choueifaty): 1 means one bet, however
    many assets are held. score = 100 * (1 - 1/effective_bets), so a
    single asset or perfectly correlated assets score 0 and four equal,
    uncorrelated, equally volatile assets score 75.
    """
    symbols = list(weights)
    observations = len(next(iter(returns.values()), []))
    pairs = [(a, b, correlation(returns[a], returns[b])) for a, b in combinations(symbols, 2)]
    known = [(a, b, c) for a, b, c in pairs if c is not None]
    pair_weight = sum(weights[a] * weights[b] for a, b, _ in known)
    average = sum(weights[a] * weights[b] * c for a, b, c in known) / pair_weight if pair_weight else None
    result = {
        "score": 0, "effective_bets": 1.0, "diversification_ratio": 1.0,
        "average_correlation": average, "observations": observations,
        "most_correlated": None, "least_correlated": None,
    }
    if known:
        top = max(known, key=lambda p: p[2])
        low = min(known, key=lambda p: p[2])
        result["most_correlated"] = {"a": top[0], "b": top[1], "correlation": top[2]}
        result["least_correlated"] = {"a": low[0], "b": low[1], "correlation": low[2]}
    if len(symbols) < 2 or observations < MIN_OBSERVATIONS:
        return result
    vols = {s: statistics.stdev(returns[s]) for s in symbols}
    variance = 0.0
    for a in symbols:
        for b in symbols:
            c = 1.0 if a == b else correlation(returns[a], returns[b])
            variance += weights[a] * weights[b] * vols[a] * vols[b] * (c or 0.0)
    if variance <= 0:
        return result
    ratio = sum(weights[s] * vols[s] for s in symbols) / math.sqrt(variance)
    ratio = max(1.0, ratio)
    bets = ratio ** 2
    result.update(
        diversification_ratio=ratio, effective_bets=bets,
        score=round(max(0.0, min(100.0, 100 * (1 - 1 / bets)))),
    )
    return result


def diversification_label(score: int, assets: int) -> str:
    if assets < 2:
        return "Single asset"
    if score < 15:
        return "Concentrated"
    if score < 35:
        return "Moderately diversified"
    if score < 60:
        return "Well diversified"
    return "Highly diversified"


def series_stats(values: list[float]) -> dict:
    """Return, max drawdown, and sqrt(365)-annualized volatility of a daily value series.

    Matches the portfolio calculation so benchmark numbers are comparable.
    """
    returns = [b / a - 1 for a, b in zip(values, values[1:])]
    peak, drawdown = values[0], 0.0
    for value in values:
        peak = max(peak, value)
        drawdown = min(drawdown, value / peak - 1)
    return {
        "total_return": values[-1] / values[0] - 1,
        "max_drawdown": drawdown,
        "annualized_volatility": statistics.stdev(returns) * math.sqrt(365) if len(returns) > 1 else 0.0,
    }


def rebase(points: list[tuple[date, float]], dates: list[date], start_value: float) -> list[tuple[date, float]]:
    """Restrict a value series to `dates` and scale it to start at `start_value`."""
    lookup = dict(points)
    kept = [(d, lookup[d]) for d in dates if d in lookup]
    if not kept:
        return []
    scale = start_value / kept[0][1]
    return [(d, v * scale) for d, v in kept]


def drawdown_window(points: list[tuple[date, float]]) -> dict | None:
    """Peak and trough dates of the largest decline, or None if it never fell."""
    peak_date, peak = points[0]
    worst, window = 0.0, None
    for day, value in points:
        if value > peak:
            peak_date, peak = day, value
        if value / peak - 1 < worst:
            worst = value / peak - 1
            window = {"peak_date": peak_date, "trough_date": day, "decline": worst}
    return window


def return_contributions(initial_value: float, positions: list[dict]) -> list[dict]:
    """Each holding's share of the total gain or loss, in dollars and portfolio percent."""
    rows = []
    for p in positions:
        dollars = p["end_value"] - initial_value * p["weight"]
        rows.append({"symbol": p["symbol"], "dollars": dollars, "portfolio_return": dollars / initial_value})
    return sorted(rows, key=lambda r: r["dollars"], reverse=True)


def price_change_between(series: dict[date, float], start: date, end: date) -> float | None:
    """Change from the last price on or before `start` to the last on or before `end`."""
    before = [d for d in series if d <= start]
    after = [d for d in series if d <= end]
    if not before or not after:
        return None
    return series[max(after)] / series[max(before)] - 1
