"""Live ticker from Alpaca snapshots. No network."""
from datetime import date, datetime, timedelta, timezone
from unittest.mock import Mock

import pytest

from backend.services import market_data as md
from backend.services import market_live as live

NOW = datetime(2026, 9, 27, 12, 0, tzinfo=timezone.utc)


def snap(price, prev, minutes_ago=1):
    t = (NOW - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%dT%H:%M:%S.123456789Z")
    return {"latestTrade": {"p": price, "t": t}, "prevDailyBar": {"c": prev}}


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    live._CACHE.clear()
    monkeypatch.setattr(md.httpx, "get", Mock(side_effect=AssertionError("Unexpected network call")))
    monkeypatch.setattr(md, "get_history", lambda assets, days: {"series": {
        a.symbol: {date(2026, 9, d): 100.0 + d for d in range(1, 4)} for a in assets}})
    monkeypatch.delenv("APCA_API_KEY_ID", raising=False)
    monkeypatch.delenv("APCA_API_SECRET_KEY", raising=False)
    yield
    live._CACHE.clear()


def test_crypto_only_ticker_without_keys(monkeypatch):
    calls = Mock(return_value={"snapshots": {"BTC/USD": snap(110, 100, minutes_ago=90), "ETH/USD": {"broken": True}}})
    monkeypatch.setattr(md, "_request_json", calls)
    result = live.get_ticker(NOW)
    assert calls.call_count == 1 and calls.call_args.args[2] == {}  # never sends keys for crypto
    assert [q.symbol for q in result.quotes] == ["BTC/USD"]  # malformed snapshots are skipped
    btc = result.quotes[0]
    assert btc.change == pytest.approx(0.1)
    assert btc.live  # crypto is always open, even after a quiet hour
    assert btc.spark == [101.0, 102.0, 103.0]
    assert result.stocks_included is False


def test_stocks_are_marked_closed_when_the_last_trade_is_old(monkeypatch):
    monkeypatch.setenv("APCA_API_KEY_ID", "id")
    monkeypatch.setenv("APCA_API_SECRET_KEY", "secret")
    def fake(path, params, headers):
        if "crypto" in path:
            return {"snapshots": {"BTC/USD": snap(110, 100)}}
        assert params["feed"] == "iex" and headers["APCA-API-KEY-ID"] == "id"
        return {"SPY": snap(505, 500, minutes_ago=60 * 40), "AAPL": snap(200, 190, minutes_ago=2)}
    monkeypatch.setattr(md, "_request_json", fake)
    quotes = {q.symbol: q for q in live.get_ticker(NOW).quotes}
    assert quotes["SPY"].live is False and quotes["AAPL"].live is True
    assert quotes["SPY"].change == pytest.approx(0.01)


def test_stock_failure_keeps_crypto(monkeypatch):
    monkeypatch.setenv("APCA_API_KEY_ID", "id")
    monkeypatch.setenv("APCA_API_SECRET_KEY", "secret")
    def fake(path, params, headers):
        if "crypto" in path:
            return {"snapshots": {"BTC/USD": snap(110, 100)}}
        raise md.MarketDataError("market_access", "rejected")
    monkeypatch.setattr(md, "_request_json", fake)
    result = live.get_ticker(NOW)
    assert [q.symbol for q in result.quotes] == ["BTC/USD"] and not result.stocks_included


def test_ticker_is_cached_and_endpoint_reports_errors(client, monkeypatch):
    calls = Mock(return_value={"snapshots": {"BTC/USD": snap(110, 100)}})
    monkeypatch.setattr(md, "_request_json", calls)
    assert client.get("/api/market/ticker").status_code == 200
    assert client.get("/api/market/ticker").status_code == 200
    assert calls.call_count == 1
    live._CACHE.clear()
    monkeypatch.setattr(md, "_request_json", Mock(return_value={"snapshots": {}}))
    response = client.get("/api/market/ticker")
    assert response.status_code == 503 and response.json()["error"]["code"] == "market_unavailable"
