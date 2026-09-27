"""Benchmark comparison, correlation, and diversification for a market portfolio."""
from pydantic import ValidationError

from backend.analytics.projection import probability_below, project_range
from backend.analytics.insights import (
    aligned_returns,
    correlation_matrix,
    diversification,
    diversification_label,
    rebase,
    return_contributions,
    series_stats,
)
from backend.models.market import (
    BenchmarkComparison,
    BenchmarkId,
    CorrelationMatrix,
    Diversification,
    MarketInsights,
    MarketPortfolio,
    MarketRequest,
    Projection,
    ProjectionRequest,
    ReturnContribution,
    WhatIfResult,
)
from backend.services.market_data import MarketDataError
from backend.services.market_portfolio import analyze_market_portfolio, load_market_portfolio

BENCHMARKS: dict[str, tuple[str, list[tuple[str, float]]]] = {
    "SPY": ("S&P 500 (SPY)", [("SPY", 1.0)]),
    "60_40": ("60/40 stocks & bonds", [("VTI", 0.6), ("BND", 0.4)]),
    "BTC": ("Bitcoin only", [("BTC/USD", 1.0)]),
}


def build_insights(request: MarketRequest, benchmark: BenchmarkId | None) -> MarketInsights:
    portfolio, history = load_market_portfolio(request)
    return insights_for(portfolio, history, benchmark)


def insights_for(portfolio: MarketPortfolio, history: dict, benchmark: BenchmarkId | None) -> MarketInsights:
    symbols = [p.symbol for p in portfolio.positions]
    returns = aligned_returns(history["series"], symbols, portfolio.start_date)
    stats = diversification({p.symbol: p.weight for p in portfolio.positions}, returns)
    return MarketInsights(
        data_id=portfolio.data_id,
        correlation=CorrelationMatrix(
            symbols=symbols, matrix=correlation_matrix(returns, symbols), observations=stats["observations"],
        ),
        diversification=Diversification(
            **stats, label=diversification_label(stats["score"], len(symbols)),
            message=diversification_message(stats, len(symbols)),
        ),
        contributions=[ReturnContribution(**row) for row in return_contributions(
            portfolio.initial_value, [p.model_dump() for p in portfolio.positions],
        )],
        benchmark=compare_benchmark(benchmark, portfolio) if benchmark else None,
    )


def diversification_message(stats: dict, assets: int) -> str:
    if assets < 2:
        return "A single asset has no diversification: all of the value depends on one price."
    if stats["average_correlation"] is None:
        return "There were not enough shared trading days to measure how these assets move together."
    bets = stats["effective_bets"]
    parts = [f"These {assets} holdings behaved like about {bets:.1f} independent "
             f"{'bet' if round(bets, 1) == 1 else 'bets'} over this period."]
    top = stats["most_correlated"]
    if top and top["correlation"] >= 0.7:
        parts.append(f"{top['a']} and {top['b']} moved closely together (correlation {top['correlation']:.2f}), "
                     "so holding both added little protection.")
    low = stats["least_correlated"]
    if low and low["correlation"] < 0.3:
        parts.append(f"{low['a']} and {low['b']} moved most independently ({low['correlation']:.2f}), "
                     "which is what spreads risk.")
    return " ".join(parts)


def compare_benchmark(benchmark: BenchmarkId, portfolio: MarketPortfolio) -> BenchmarkComparison:
    name, holdings = BENCHMARKS[benchmark]
    request = MarketRequest(
        holdings=[{"symbol": s, "weight": w} for s, w in holdings],
        initial_investment=portfolio.request.initial_investment, days=portfolio.request.days,
    )
    try:
        result = analyze_market_portfolio(request)
    except MarketDataError as error:
        return BenchmarkComparison(id=benchmark, name=name, available=False, message=error.message)
    own = {p.date: p.value for p in portfolio.performance}
    bench = {p.date: p.value for p in result.performance}
    common = [d for d in own if d in bench]
    if len(common) < 2:
        return BenchmarkComparison(id=benchmark, name=name, available=False,
                                   message="The benchmark has no prices overlapping this period.")
    # Start both lines at the same value on the first shared date so they compare the same window.
    points = rebase(list(bench.items()), common, own[common[0]])
    stats = series_stats([v for _, v in points])
    own_return = own[common[-1]] / own[common[0]] - 1
    return BenchmarkComparison(
        id=benchmark, name=name, available=True,
        performance=[{"date": d, "value": v} for d, v in points],
        excess_return=own_return - stats["total_return"], **stats,
    )


def run_what_if(base: MarketRequest, holdings: list[dict]) -> WhatIfResult:
    """Recalculate a model-proposed mix over the same period; ValueError explains bad input."""
    return backtest_mix(holdings, base.initial_investment, base.days)


def backtest_mix(holdings: list[dict], initial_investment: float, days: int) -> WhatIfResult:
    """Backtest any {symbol, weight} list on real prices; weights are normalized, ValueError explains bad input."""
    weights: dict[str, float] = {}
    for h in holdings:
        try:
            symbol, weight = str(h["symbol"]).strip().upper(), float(h["weight"])
        except (KeyError, TypeError, ValueError, AttributeError):
            raise ValueError("Each holding needs a symbol and a numeric weight.") from None
        if weight > 0:
            weights[symbol] = weights.get(symbol, 0.0) + weight
    total = sum(weights.values())
    if not weights or not 0 < total < float("inf"):
        raise ValueError("Give at least one holding a positive weight.")
    symbols = list(weights)
    fractions = [weights[s] / total for s in symbols]
    fractions[-1] = 1 - sum(fractions[:-1])  # exact sum for the request validator
    try:
        request = MarketRequest(
            holdings=[{"symbol": s, "weight": w} for s, w in zip(symbols, fractions)],
            initial_investment=initial_investment, days=days,
        )
        portfolio, history = load_market_portfolio(request)
    except ValidationError:
        raise ValueError("Use 1 to 12 different supported symbols with positive weights.") from None
    except MarketDataError as error:
        raise ValueError(error.message) from None
    stats = insights_for(portfolio, history, None).diversification
    return WhatIfResult(
        holdings=request.holdings, total_return=portfolio.total_return,
        annualized_volatility=portfolio.annualized_volatility, max_drawdown=portfolio.max_drawdown,
        final_value=portfolio.final_value, diversification_score=stats.score,
    )


def build_projection(request: ProjectionRequest) -> Projection:
    portfolio = analyze_market_portfolio(request.portfolio)
    start = request.portfolio.initial_investment
    vol = portfolio.annualized_volatility
    window = (portfolio.end_date - portfolio.start_date).days + 1
    notes = [
        f"Uses this mix's real annualized volatility ({vol * 100:.1f}%) measured from {portfolio.start_date} to "
        f"{portfolio.end_date}, and your assumed average return of {request.annual_return * 100:.0f}% a year.",
        "Log-normal model: bands show where 50% and 90% of outcomes would fall if the future had the same volatility. "
        "Real markets have crashes, regime changes, and fees this does not capture.",
        "Not a forecast. It shows how wide the range of outcomes gets with this level of volatility.",
    ]
    if window < 365:
        notes.append(f"Volatility was measured over only {window} days; a 1-year look-back gives a steadier estimate.")
    return Projection(
        data_id=portfolio.data_id, start_value=start, annual_volatility=vol,
        annual_return=request.annual_return, years=request.years, volatility_window_days=window,
        probability_below_start=probability_below(start, start, vol, request.annual_return, request.years),
        points=project_range(start, vol, request.annual_return, request.years), notes=notes,
    )
