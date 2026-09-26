"""Read-only Alpaca market data. Never calls account, position, or order APIs."""
import copy
import json
import math
import os
import time
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

import httpx

from backend.models.market import MarketAsset

BASE_URL = "https://data.alpaca.markets"
CACHE_SECONDS = 300
_CACHE: OrderedDict = OrderedDict()
_LOCK = Lock()


class MarketDataError(Exception):
    def __init__(self, code: str, message: str, status: int = 503):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


def assets() -> list[MarketAsset]:
    raw = json.loads((Path(__file__).resolve().parents[1] / "market_assets.json").read_text(encoding="utf-8"))
    return [MarketAsset.model_validate(item) for item in raw]


def stock_credentials_configured() -> bool:
    return bool(os.getenv("APCA_API_KEY_ID") and os.getenv("APCA_API_SECRET_KEY"))


def _request_json(path: str, params: dict, headers: dict) -> dict:
    try:
        response = httpx.get(BASE_URL + path, params=params, headers=headers, timeout=20)
    except httpx.RequestError:
        raise MarketDataError("market_connection", "Could not reach Alpaca. Try again shortly.") from None
    if response.status_code in (401, 403):
        raise MarketDataError("market_access", "Alpaca rejected these credentials or this data feed. Check the backend configuration.")
    if response.status_code == 429:
        raise MarketDataError("market_rate_limit", "Alpaca's request limit was reached. Wait a minute before trying again.", 429)
    if response.status_code != 200:
        raise MarketDataError("market_unavailable", "Alpaca could not serve the selected assets or date range.")
    try:
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError()
        return result
    except ValueError:
        raise MarketDataError("market_response", "Alpaca returned an unreadable response.") from None


def get_history(selected: list[MarketAsset], days: int, today: date | None = None) -> dict:
    today = today or datetime.now(timezone.utc).date()
    start = today - timedelta(days=days)
    end = today - timedelta(days=1)
    # Never request credentials for anonymous crypto reads; a broken equity key
    # must not prevent a crypto-only demo from working.
    needs_stocks = any(a.asset_class != "crypto" for a in selected)
    if needs_stocks and not stock_credentials_configured():
        raise MarketDataError(
            "alpaca_keys_required",
            "Stocks and ETFs need APCA_API_KEY_ID and APCA_API_SECRET_KEY in the backend .env. Crypto works without them.",
        )
    key = (tuple(sorted(a.symbol for a in selected)), start, end)
    with _LOCK:
        entry = _CACHE.get(key)
        if entry and time.monotonic() - entry[0] < CACHE_SECONDS:
            _CACHE.move_to_end(key)
            result = copy.deepcopy(entry[1])
            result["cached"] = True
            return result
    history = {}
    feeds = []
    for is_crypto in (True, False):
        symbols = [a.symbol for a in selected if (a.asset_class == "crypto") == is_crypto]
        if not symbols:
            continue
        path = "/v1beta3/crypto/us/bars" if is_crypto else "/v2/stocks/bars"
        params = {
            "symbols": ",".join(sorted(symbols)), "timeframe": "1Day",
            "start": start.isoformat(), "end": end.isoformat() + "T23:59:59Z",
            "limit": 10000, "sort": "asc",
        }
        headers = {}
        if not is_crypto:
            params.update(feed="iex", adjustment="all")
            headers = {
                "APCA-API-KEY-ID": os.environ["APCA_API_KEY_ID"],
                "APCA-API-SECRET-KEY": os.environ["APCA_API_SECRET_KEY"],
            }
        feeds.append("Alpaca US crypto" if is_crypto else "IEX equities (adjusted)")
        seen_tokens = set()
        for _ in range(12):
            data = _request_json(path, params, headers)
            bars = data.get("bars")
            if not isinstance(bars, dict):
                raise MarketDataError("market_response", "Alpaca returned invalid price history.")
            for symbol in symbols:
                rows = bars.get(symbol) or []
                if not isinstance(rows, list):
                    raise MarketDataError("market_response", "Alpaca returned invalid price history.")
                series = history.setdefault(symbol, {})
                for bar in rows:
                    try:
                        day = datetime.fromisoformat(bar["t"].replace("Z", "+00:00")).date()
                        close = float(bar["c"])
                        if not math.isfinite(close) or close <= 0:
                            raise ValueError()
                    except (KeyError, ValueError, TypeError, AttributeError):
                        raise MarketDataError("market_response", "Alpaca returned an invalid closing price.") from None
                    if start <= day <= end:
                        series[day] = close
            token = data.get("next_page_token")
            if not token:
                break
            if token in seen_tokens:
                raise MarketDataError("market_pagination", "Alpaca repeated a page of price history.")
            seen_tokens.add(token)
            params["page_token"] = token
        else:
            raise MarketDataError("market_pagination", "The price history exceeded the supported page limit.")
    for asset in selected:
        series = history.get(asset.symbol, {})
        if len(series) < 2:
            raise MarketDataError("insufficient_history", f"Not enough price history for {asset.symbol} in this period.", 422)
        if (end - max(series)).days > (0 if asset.asset_class == "crypto" else 4):
            raise MarketDataError("stale_prices", f"Recent completed daily prices are unavailable for {asset.symbol}.")
    result = {
        "series": history, "feeds": feeds, "end": end,
        "fetched_at": datetime.now(timezone.utc), "cached": False,
    }
    with _LOCK:
        _CACHE[key] = (time.monotonic(), copy.deepcopy(result))
        _CACHE.move_to_end(key)
        while len(_CACHE) > 64:
            _CACHE.popitem(last=False)
    return result
