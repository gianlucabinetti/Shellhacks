from datetime import date, datetime, timedelta, timezone
from unittest.mock import Mock

import httpx
import pytest
from pydantic import ValidationError

from backend.models.market import MarketAsset, MarketRequest
from backend.services import market_data as md
from backend.services import market_portfolio as mp

TODAY = date(2026, 1, 12)
CRYPTO = MarketAsset(symbol="BTC/USD", name="Bitcoin", asset_class="crypto", category="Currency")
STOCK = MarketAsset(symbol="VTI", name="Stock ETF", asset_class="stock", category="ETF")


@pytest.fixture(autouse=True)
def isolate_market(monkeypatch):
    md._CACHE.clear()
    monkeypatch.delenv("APCA_API_KEY_ID", raising=False)
    monkeypatch.delenv("APCA_API_SECRET_KEY", raising=False)
    # Unit tests must never contact a live provider.
    monkeypatch.setattr(md.httpx, "get", Mock(side_effect=AssertionError("Unexpected network call")))
    yield
    md._CACHE.clear()


def bars(symbol="BTC/USD", offset=0):
    return {symbol: [
        {"t": f"2026-01-{d:02}T00:00:00Z", "c": 100 + d + offset}
        for d in range(2, 12)
    ]}


def request(holdings=None, **kwargs):
    return MarketRequest(holdings=holdings or [{"symbol": "BTC/USD", "weight": 1}], **kwargs)


def history(crypto_prices=None, stocks=False):
    series = {"BTC/USD": {date(2026, 1, d): (crypto_prices[d - 2] if crypto_prices else 100 + d) for d in range(2, 12)}}
    if stocks:
        series["VTI"] = {date(2026, 1, d): 100.0 for d in (2, 5, 6, 7, 8, 9)}
    return {
        "series": series, "end": date(2026, 1, 11),
        "feeds": ["Alpaca US crypto"], "fetched_at": datetime(2026, 1, 12, tzinfo=timezone.utc),
        "cached": False,
    }


@pytest.mark.parametrize("holdings", [
    [], [{"symbol": "BTC/USD", "weight": 0.5}],
    [{"symbol": "BTC/USD", "weight": 0.5}, {"symbol": "BTC/USD", "weight": 0.5}],
    [{"symbol": "BTC/USD", "weight": 0}],
    [{"symbol": "BTC/USD", "weight": float("nan")}],
])
def test_bad_allocations_are_rejected(holdings):
    with pytest.raises(ValidationError):
        MarketRequest(holdings=holdings)


def test_too_many_assets_are_rejected():
    with pytest.raises(ValidationError):
        MarketRequest(holdings=[{"symbol": str(i), "weight": 1 / 13} for i in range(13)])


def test_catalog_does_not_expose_keys(client, monkeypatch):
    monkeypatch.setenv("APCA_API_KEY_ID", "secret-id")
    monkeypatch.setenv("APCA_API_SECRET_KEY", "secret-value")
    response = client.get("/api/market/assets")
    assert response.status_code == 200
    body = response.json()
    assert body["stocks_configured"] is True
    assert {a["symbol"] for a in body["assets"]} >= {"BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "VTI"}
    assert "secret-id" not in response.text and "secret-value" not in response.text


def test_crypto_never_sends_account_keys(monkeypatch):
    monkeypatch.setenv("APCA_API_KEY_ID", "irrelevant")
    fake = Mock(return_value={"bars": bars()})
    monkeypatch.setattr(md, "_request_json", fake)
    result = md.get_history([CRYPTO], 30, TODAY)
    path, params, headers = fake.call_args.args
    assert path == "/v1beta3/crypto/us/bars"
    assert params["end"] == "2026-01-11T23:59:59Z"
    assert headers == {}
    assert result["cached"] is False
    assert result["series"]["BTC/USD"][date(2026, 1, 11)] == 111


def test_stock_configuration_error_is_actionable(client):
    response = client.post("/api/market/portfolio", json={"holdings": [{"symbol": "VTI", "weight": 1}]})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "alpaca_keys_required"


def test_equity_request_uses_iex_and_adjustments(monkeypatch):
    monkeypatch.setenv("APCA_API_KEY_ID", "test-id")
    monkeypatch.setenv("APCA_API_SECRET_KEY", "test-secret")
    fake = Mock(return_value={"bars": bars("VTI")})
    monkeypatch.setattr(md, "_request_json", fake)
    md.get_history([STOCK], 30, TODAY)
    path, params, headers = fake.call_args.args
    assert path == "/v2/stocks/bars"
    assert params["feed"] == "iex" and params["adjustment"] == "all"
    assert headers == {"APCA-API-KEY-ID": "test-id", "APCA-API-SECRET-KEY": "test-secret"}


def test_pagination_reads_every_symbol(monkeypatch):
    eth = MarketAsset(symbol="ETH/USD", name="Ethereum", asset_class="crypto", category="Platform")
    fake = Mock(side_effect=[
        {"bars": bars(), "next_page_token": "page-2"},
        {"bars": bars("ETH/USD"), "next_page_token": None},
    ])
    monkeypatch.setattr(md, "_request_json", fake)
    result = md.get_history([CRYPTO, eth], 30, TODAY)
    assert set(result["series"]) == {"BTC/USD", "ETH/USD"}
    assert all(len(points) == 10 for points in result["series"].values())
    assert fake.call_count == 2


def test_repeated_page_token_is_rejected(monkeypatch):
    monkeypatch.setattr(md, "_request_json", Mock(return_value={"bars": bars(), "next_page_token": "same"}))
    with pytest.raises(md.MarketDataError, match="repeated"):
        md.get_history([CRYPTO], 30, TODAY)


@pytest.mark.parametrize("close", [0, -1, None, "bad", float("nan"), float("inf")])
def test_invalid_provider_prices_are_not_used(monkeypatch, close):
    monkeypatch.setattr(md, "_request_json", lambda *args: {
        "bars": {"BTC/USD": [{"t": "2026-01-11T00:00:00Z", "c": close}]},
    })
    with pytest.raises(md.MarketDataError, match="invalid closing"):
        md.get_history([CRYPTO], 30, TODAY)


def test_partial_today_bar_is_ignored(monkeypatch):
    data = bars()
    data["BTC/USD"].append({"t": "2026-01-12T00:00:00Z", "c": 9999})
    monkeypatch.setattr(md, "_request_json", lambda *args: {"bars": data})
    result = md.get_history([CRYPTO], 30, TODAY)
    assert max(result["series"]["BTC/USD"]) == date(2026, 1, 11)


def test_missing_symbol_is_not_silently_dropped(monkeypatch):
    monkeypatch.setattr(md, "_request_json", lambda *args: {"bars": {}})
    with pytest.raises(md.MarketDataError, match="Not enough"):
        md.get_history([CRYPTO], 30, TODAY)


def test_old_crypto_data_is_rejected(monkeypatch):
    data = bars()
    data["BTC/USD"].pop()
    monkeypatch.setattr(md, "_request_json", lambda *args: {"bars": data})
    with pytest.raises(md.MarketDataError, match="Recent completed"):
        md.get_history([CRYPTO], 30, TODAY)


def test_cache_is_bounded_in_time_and_return_values_are_independent(monkeypatch):
    fake = Mock(return_value={"bars": bars()})
    monkeypatch.setattr(md, "_request_json", fake)
    clock = [0.0]
    monkeypatch.setattr(md.time, "monotonic", lambda: clock[0])
    first = md.get_history([CRYPTO], 30, TODAY)
    first["series"]["BTC/USD"].clear()
    second = md.get_history([CRYPTO], 30, TODAY)
    assert second["cached"] is True and second["series"]["BTC/USD"]
    assert fake.call_count == 1
    clock[0] = md.CACHE_SECONDS + 1
    assert md.get_history([CRYPTO], 30, TODAY)["cached"] is False
    assert fake.call_count == 2


@pytest.mark.parametrize("status,code", [(401, "market_access"), (403, "market_access"), (429, "market_rate_limit"), (500, "market_unavailable")])
def test_upstream_errors_do_not_leak_response_bodies(monkeypatch, status, code):
    monkeypatch.setattr(md.httpx, "get", lambda *a, **k: httpx.Response(status, text="private upstream detail"))
    with pytest.raises(md.MarketDataError) as raised:
        md._request_json("/path", {}, {})
    assert raised.value.code == code
    assert "private" not in raised.value.message


def test_timeout_is_reported_without_fixtures(monkeypatch):
    monkeypatch.setattr(md.httpx, "get", Mock(side_effect=httpx.ReadTimeout("private detail")))
    with pytest.raises(md.MarketDataError) as raised:
        md._request_json("/path", {}, {})
    assert raised.value.code == "market_connection"


def test_buy_and_hold_math_drawdown_and_no_short_period_extrapolation():
    prices = [100, 110, 120, 90, 95, 100, 105, 110, 115, 120]
    result = mp.calculate_portfolio(request(initial_investment=1000), [CRYPTO], history(prices))
    assert result.initial_value == 1000
    assert result.final_value == 1200
    assert result.total_return == pytest.approx(0.2)
    assert result.max_drawdown == pytest.approx(-0.25)
    assert result.positions[0].units == 10
    assert result.annualized_return is None
    assert result.annualized_volatility > 0


def test_mixed_calendar_carries_equity_closes_but_keeps_crypto_weekends():
    req = request([{"symbol": "BTC/USD", "weight": 0.5}, {"symbol": "VTI", "weight": 0.5}])
    result = mp.calculate_portfolio(req, [CRYPTO, STOCK], history(stocks=True))
    assert len(result.performance) == 10
    assert result.positions[1].last_close_date == date(2026, 1, 9)
    assert result.positions[1].end_value == 5000
    assert any("carried" in n for n in result.notes)


def test_crypto_gaps_are_never_filled():
    h = history()
    del h["series"]["BTC/USD"][date(2026, 1, 5)]
    with pytest.raises(md.MarketDataError, match="Missing daily crypto"):
        mp.calculate_portfolio(request(), [CRYPTO], h)


def test_large_equity_gap_is_rejected():
    req = request([{"symbol": "VTI", "weight": 1}])
    h = history(stocks=True)
    h["series"]["VTI"] = {date(2026, 1, 2): 100}
    with pytest.raises(md.MarketDataError, match="longer than four"):
        mp.calculate_portfolio(req, [STOCK], h)


def test_short_overlap_is_rejected():
    h = history()
    h["series"]["BTC/USD"] = {date(2026, 1, d): 100 for d in (10, 11)}
    with pytest.raises(md.MarketDataError, match="seven"):
        mp.calculate_portfolio(request(), [CRYPTO], h)


def test_unknown_assets_are_rejected_before_network(client):
    response = client.post("/api/market/portfolio", json={"holdings": [{"symbol": "FAKE/USD", "weight": 1}]})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_asset"


def test_market_endpoint_and_fallback_explanation_share_calculated_values(client, monkeypatch):
    monkeypatch.setattr(mp, "get_history", lambda *args: history())
    payload = request().model_dump()
    response = client.post("/api/market/portfolio", json=payload)
    assert response.status_code == 200
    portfolio = response.json()
    assert portfolio["prices_source"] == "market_data"
    assert portfolio["holdings_source"] == "fictional"
    assert portfolio["is_simulated"] is True
    explanation = client.post("/api/market/explain", json=payload)
    assert explanation.status_code == 200
    body = explanation.json()
    assert body["source"] == "fallback"
    assert body["data_id"] == portfolio["data_id"]
    assert "100% crypto" in body["explanation"]["allocation_explanation"]
    assert "staking" in body["explanation"]["beginner_tip"]


def test_bedrock_source_is_only_reported_after_success(client, monkeypatch):
    from backend.ai.provider import BedrockExplanationProvider
    from backend.services import ai_client
    from backend.tests.test_bedrock import response_for
    monkeypatch.setattr(mp, "get_history", lambda *args: history())
    aws = Mock()
    aws.converse.return_value = response_for()
    monkeypatch.setattr(ai_client, "_get_provider", lambda: BedrockExplanationProvider(aws, "test-model"))
    response = client.post("/api/market/explain", json=request().model_dump())
    assert response.status_code == 200
    assert response.json()["source"] == "bedrock"
    content = aws.converse.call_args.kwargs["messages"][0]["content"][0]["text"]
    assert '"crypto": 1.0' in content and '"BTC/USD"' in content
