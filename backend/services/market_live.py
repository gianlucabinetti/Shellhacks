"""Latest prices for the live market ticker. Read-only Alpaca snapshots."""
import copy
import os
import time
from datetime import datetime, timedelta, timezone
from threading import Lock

from backend.models.market import MarketTicker, TickerQuote
from backend.services import market_data as md

CRYPTO = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD"]
STOCKS = ["SPY", "AAPL", "MSFT", "VTI"]
CACHE_SECONDS = 20
# A stock trade older than this means the market is closed, so the price is labelled "at close".
# Crypto markets never close; a quiet coin is still live.
LIVE_WINDOW = timedelta(minutes=15)
_CACHE: dict = {}
_LOCK = Lock()


def _parse_time(value: str) -> datetime:
    # Alpaca sends nanoseconds; Python keeps microseconds.
    head, _, frac = value.rstrip("Z").partition(".")
    return datetime.fromisoformat(f"{head}.{(frac or '0')[:6]}+00:00")


def _quote(symbol: str, snapshot: dict, catalog: dict, now: datetime, spark: list[float]) -> TickerQuote | None:
    try:
        trade = snapshot["latestTrade"]
        price = float(trade["p"])
        as_of = _parse_time(trade["t"])
        previous = float(snapshot["prevDailyBar"]["c"])
    except (KeyError, TypeError, ValueError):
        return None
    if price <= 0 or previous <= 0:
        return None
    asset = catalog[symbol]
    return TickerQuote(
        symbol=symbol, name=asset.name, asset_class=asset.asset_class, price=price,
        change=price / previous - 1, as_of=as_of, spark=spark,
        live=asset.asset_class == "crypto" or now - as_of <= LIVE_WINDOW,
    )


def _sparklines(assets: list) -> dict[str, list[float]]:
    """Last 30 daily closes per symbol, reusing the cached history; empty if unavailable."""
    try:
        series = md.get_history(assets, 30)["series"]
    except md.MarketDataError:
        return {}
    return {s: [v for _, v in sorted(points.items())] for s, points in series.items()}


def get_ticker(now: datetime | None = None) -> MarketTicker:
    now = now or datetime.now(timezone.utc)
    with _LOCK:
        cached = _CACHE.get("ticker")
        if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
            return copy.deepcopy(cached[1])
    catalog = {a.symbol: a for a in md.assets()}
    quotes: list[TickerQuote] = []

    crypto = [s for s in CRYPTO if s in catalog]
    data = md._request_json("/v1beta3/crypto/us/snapshots", {"symbols": ",".join(crypto)}, {})
    snapshots = data.get("snapshots") if isinstance(data.get("snapshots"), dict) else {}
    spark = _sparklines([catalog[s] for s in crypto])
    quotes += [q for s in crypto if (q := _quote(s, snapshots.get(s) or {}, catalog, now, spark.get(s, [])))]

    stocks_included = False
    stocks = [s for s in STOCKS if s in catalog]
    if stocks and md.stock_credentials_configured():
        headers = {
            "APCA-API-KEY-ID": os.environ["APCA_API_KEY_ID"],
            "APCA-API-SECRET-KEY": os.environ["APCA_API_SECRET_KEY"],
        }
        try:
            data = md._request_json("/v2/stocks/snapshots", {"symbols": ",".join(stocks), "feed": "iex"}, headers)
            spark = _sparklines([catalog[s] for s in stocks])
            found = [q for s in stocks if (q := _quote(s, data.get(s) or {}, catalog, now, spark.get(s, [])))]
            quotes += found
            stocks_included = bool(found)
        except md.MarketDataError:
            pass  # Crypto alone still makes a useful ticker.

    if not quotes:
        raise md.MarketDataError("market_unavailable", "Live prices are unavailable right now.")
    result = MarketTicker(quotes=quotes, fetched_at=now, stocks_included=stocks_included)
    with _LOCK:
        _CACHE["ticker"] = (time.monotonic(), copy.deepcopy(result))
    return result
