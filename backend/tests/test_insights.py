"""Benchmark, correlation, diversification, and portfolio chat. No network or live AI."""
from datetime import date, datetime, timezone
from unittest.mock import Mock

import pytest

from backend.ai import chat as ai_chat
from backend.ai.provider import BedrockExplanationProvider
from backend.analytics import insights as ins
from backend.models.market import ChatMessage, MarketRequest
from backend.services import ai_client
from backend.services import market_data as md
from backend.services import market_portfolio as mp
from backend.services.market_insights import run_what_if

CRYPTO_MIX = {"holdings": [{"symbol": "BTC/USD", "weight": 0.5}, {"symbol": "ETH/USD", "weight": 0.5}], "days": 30}
SWINGS = {"BTC/USD": [100, 104, 99, 106, 101, 108, 103, 110, 105, 112],
          "ETH/USD": [50, 52, 49, 53, 50, 54, 51, 55, 52, 56],
          "SOL/USD": [20, 19, 21, 20, 22, 21, 23, 22, 24, 23]}


def fake_history(selected, days, today=None, last_day=11):
    """Jan 2 to `last_day` 2026. Stocks skip weekends (Jan 3–4, 10–11, 17–18)."""
    series = {}
    for i, asset in enumerate(selected):
        prices = SWINGS.get(asset.symbol) or [100 + d + (d * (i + 2)) % 7 for d in range(10)]
        series[asset.symbol] = {
            date(2026, 1, d): float(prices[(d - 2) % len(prices)]) for d in range(2, last_day + 1)
            if asset.asset_class == "crypto" or date(2026, 1, d).weekday() < 5
        }
    return {"series": series, "end": date(2026, 1, last_day), "feeds": ["test"],
            "fetched_at": datetime(2026, 1, 12, tzinfo=timezone.utc), "cached": False}


@pytest.fixture(autouse=True)
def offline_market(monkeypatch):
    monkeypatch.setattr(md.httpx, "get", Mock(side_effect=AssertionError("Unexpected network call")))
    monkeypatch.setattr(mp, "get_history", fake_history)


# --- analytics -----------------------------------------------------------------

def test_aligned_returns_use_only_shared_trading_days():
    series = {
        "C": {date(2026, 1, d): 100.0 + d for d in range(2, 10)},
        "S": {date(2026, 1, d): 50.0 + d for d in (2, 5, 6)},
    }
    returns = ins.aligned_returns(series, ["C", "S"], date(2026, 1, 2))
    # Jan 2 -> 5 is one return for both assets, not three days with fake zeros.
    assert returns["C"] == pytest.approx([105 / 102 - 1, 106 / 105 - 1])
    assert returns["S"] == pytest.approx([55 / 52 - 1, 56 / 55 - 1])


def test_correlation_edge_cases():
    moves = [0.01, -0.02, 0.03, -0.01, 0.02]
    assert ins.correlation(moves, moves) == pytest.approx(1)
    assert ins.correlation(moves, [-m for m in moves]) == pytest.approx(-1)
    assert ins.correlation(moves, [0.0] * 5) is None
    assert ins.correlation(moves[:3], moves[:3]) is None


def test_identical_assets_are_one_bet_and_independent_assets_are_two():
    a = [0.01, -0.01] * 4
    b = [0.01, 0.01, -0.01, -0.01] * 2
    same = ins.diversification({"A": 0.5, "B": 0.5}, {"A": a, "B": a})
    assert same["effective_bets"] == pytest.approx(1)
    assert same["score"] == 0
    independent = ins.diversification({"A": 0.5, "B": 0.5}, {"A": a, "B": b})
    assert independent["average_correlation"] == pytest.approx(0, abs=1e-9)
    assert independent["effective_bets"] == pytest.approx(2)
    assert independent["score"] == 50


def test_concentrated_weights_score_low_even_when_uncorrelated():
    a = [0.01, -0.01] * 4
    b = [0.01, 0.01, -0.01, -0.01] * 2
    assert ins.diversification({"A": 0.99, "B": 0.01}, {"A": a, "B": b})["score"] <= 3


def test_single_asset_is_labelled_and_scores_zero():
    stats = ins.diversification({"A": 1.0}, {"A": [0.01, -0.02, 0.01, 0.0, 0.02]})
    assert stats["score"] == 0 and stats["average_correlation"] is None
    assert ins.diversification_label(0, 1) == "Single asset"


def test_series_stats_rebase_and_drawdown_window():
    stats = ins.series_stats([100, 120, 90, 110])
    assert stats["total_return"] == pytest.approx(0.1)
    assert stats["max_drawdown"] == pytest.approx(-0.25)
    days = [date(2026, 1, d) for d in (1, 2, 3, 4)]
    rebased = ins.rebase(list(zip(days, [50, 60, 45, 55])), days[1:], 1000)
    assert [round(v) for _, v in rebased] == [1000, 750, 917]
    window = ins.drawdown_window(list(zip(days, [100, 120, 90, 110])))
    assert window == {"peak_date": days[1], "trough_date": days[2], "decline": pytest.approx(-0.25)}
    assert ins.drawdown_window(list(zip(days, [1, 2, 3, 4]))) is None


def test_contributions_and_window_price_changes():
    rows = ins.return_contributions(1000, [
        {"symbol": "A", "weight": 0.5, "end_value": 600},
        {"symbol": "B", "weight": 0.5, "end_value": 450},
    ])
    assert [(r["symbol"], r["dollars"]) for r in rows] == [("A", 100), ("B", -50)]
    series = {date(2026, 1, 2): 10.0, date(2026, 1, 5): 8.0}
    assert ins.price_change_between(series, date(2026, 1, 3), date(2026, 1, 6)) == pytest.approx(-0.2)
    assert ins.price_change_between(series, date(2026, 1, 1), date(2026, 1, 6)) is None


# --- insights endpoint -----------------------------------------------------------

def test_insights_endpoint_with_benchmark(client):
    response = client.post("/api/market/insights", json={"portfolio": CRYPTO_MIX, "benchmark": "BTC"})
    assert response.status_code == 200
    body = response.json()
    assert body["correlation"]["symbols"] == ["BTC/USD", "ETH/USD"]
    assert body["correlation"]["matrix"][0][0] == 1
    assert body["correlation"]["matrix"][0][1] > 0.9
    assert body["diversification"]["label"] == "Concentrated"
    bench = body["benchmark"]
    assert bench["available"] and bench["performance"][0]["value"] == pytest.approx(10000)
    portfolio = client.post("/api/market/portfolio", json=CRYPTO_MIX).json()
    assert body["data_id"] == portfolio["data_id"]
    assert bench["excess_return"] == pytest.approx(portfolio["total_return"] - bench["total_return"])
    assert sum(c["dollars"] for c in body["contributions"]) == pytest.approx(
        portfolio["final_value"] - portfolio["initial_value"])


def test_insights_include_exposure_by_type_and_sector(client):
    mix = {"holdings": [{"symbol": "VTI", "weight": 0.5}, {"symbol": "AAPL", "weight": 0.3},
                        {"symbol": "BND", "weight": 0.1}, {"symbol": "BTC/USD", "weight": 0.1}], "days": 30}
    exposure = client.post("/api/market/insights", json={"portfolio": mix}).json()["exposure"]
    portfolio = client.post("/api/market/portfolio", json=mix).json()
    assert {t["label"] for t in exposure["by_type"]} == {"Stock index funds", "Individual stocks", "Bonds", "Crypto"}
    assert sum(t["value"] for t in exposure["by_type"]) == pytest.approx(portfolio["final_value"])
    shares = exposure["by_sector"] + exposure["outside_companies"]
    assert sum(s["weight"] for s in shares) == pytest.approx(1)
    tech = exposure["by_sector"][0]
    assert tech["label"] == "Technology" and {h["symbol"] for h in tech["holdings"]} == {"AAPL", "VTI"}
    assert tech["market_weight"] == pytest.approx(exposure["company_weight"] * 36.68 / 100.01)
    assert {o["label"] for o in exposure["outside_companies"]} == {"Bonds", "Crypto"}
    assert exposure["as_of"] == "2026-08-31"
    assert exposure["message"].startswith("Technology is your largest sector")


def test_unavailable_benchmark_does_not_fail_the_insights(client, monkeypatch):
    def crypto_only(selected, days, today=None):
        if any(a.asset_class != "crypto" for a in selected):
            raise md.MarketDataError("alpaca_keys_required", "Stocks need keys.")
        return fake_history(selected, days)
    monkeypatch.setattr(mp, "get_history", crypto_only)
    body = client.post("/api/market/insights", json={"portfolio": CRYPTO_MIX, "benchmark": "SPY"}).json()
    assert body["benchmark"] == {**body["benchmark"], "available": False, "message": "Stocks need keys."}
    assert body["diversification"]["score"] >= 0


def test_later_starting_benchmark_is_compared_over_the_same_window(client, monkeypatch):
    def spy_starts_monday(selected, days, today=None):
        result = fake_history(selected, days, last_day=16)
        for asset in selected:
            if asset.asset_class != "crypto":
                result["series"][asset.symbol].pop(date(2026, 1, 2))
        return result
    monkeypatch.setattr(mp, "get_history", spy_starts_monday)
    body = client.post("/api/market/insights", json={"portfolio": CRYPTO_MIX, "benchmark": "SPY"}).json()
    portfolio = {p["date"]: p["value"] for p in client.post("/api/market/portfolio", json=CRYPTO_MIX).json()["performance"]}
    bench = body["benchmark"]["performance"]
    assert bench[0]["date"] == "2026-01-05"
    # Both lines meet on the first shared date, and the excess return covers only shared dates.
    assert bench[0]["value"] == pytest.approx(portfolio["2026-01-05"])
    own = portfolio[bench[-1]["date"]] / portfolio["2026-01-05"] - 1
    assert body["benchmark"]["excess_return"] == pytest.approx(own - body["benchmark"]["total_return"])


# --- what-if runner ----------------------------------------------------------------

def test_what_if_normalizes_percent_weights():
    result = run_what_if(MarketRequest(**CRYPTO_MIX), [{"symbol": "btc/usd", "weight": 70}, {"symbol": "SOL/USD", "weight": 30}])
    assert {h.symbol: round(h.weight, 6) for h in result.holdings} == {"BTC/USD": 0.7, "SOL/USD": 0.3}
    assert result.final_value > 0


@pytest.mark.parametrize("holdings, message", [
    ([{"symbol": "NOPE", "weight": 1}], "supported catalog"),
    ([{"symbol": "BTC/USD", "weight": 0}], "positive weight"),
    ([{"weight": 1}], "symbol and a numeric weight"),
])
def test_what_if_rejects_bad_input_with_a_readable_reason(holdings, message):
    with pytest.raises(ValueError, match=message):
        run_what_if(MarketRequest(**CRYPTO_MIX), holdings)


# --- chat ------------------------------------------------------------------------------

def ask(client, question, **extra):
    return client.post("/api/market/chat", json={
        "portfolio": CRYPTO_MIX, "benchmark": "BTC",
        "messages": [{"role": "assistant", "content": "Hi!"}, {"role": "user", "content": question}], **extra,
    })


@pytest.mark.parametrize("question, expected", [
    ("Why did it fall so much?", "largest decline"),
    ("Why is my diversification score low?", "diversification score"),
    ("How did I do against the benchmark?", "Bitcoin only"),
    ("Which holding drove most of my result?", "contributed the most"),
    ("Am I too concentrated in one sector?", "no sector exposure"),
    ("What if I moved 30% into bonds?", "What-if questions need the AI"),
    ("hello", "Ask about"),
])
def test_fallback_chat_answers_from_calculated_facts(client, question, expected):
    response = ask(client, question)
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "fallback"
    assert expected in body["reply"]
    assert 1 <= len(body["suggestions"]) <= 4


def test_chat_requires_a_user_question_last(client):
    response = client.post("/api/market/chat", json={
        "portfolio": CRYPTO_MIX, "messages": [{"role": "assistant", "content": "Hi"}]})
    assert response.status_code == 422


def tool_turn(holdings, tool_id="t1"):
    return {"stopReason": "tool_use", "output": {"message": {"role": "assistant", "content": [
        {"text": "<thinking>I should compare.</thinking>"},
        {"toolUse": {"toolUseId": tool_id, "name": ai_chat.WHAT_IF_TOOL, "input": {"holdings": holdings}}},
    ]}}}


def text_turn(text):
    return {"stopReason": "end_turn", "output": {"message": {"role": "assistant", "content": [{"text": text}]}}}


def use_bedrock(monkeypatch, *turns):
    aws = Mock()
    aws.converse.side_effect = list(turns)
    monkeypatch.setattr(ai_client, "_get_provider", lambda: BedrockExplanationProvider(aws, "test-model"))
    return aws


def test_bedrock_chat_runs_what_if_on_real_calculations(client, monkeypatch):
    aws = use_bedrock(monkeypatch,
                      tool_turn([{"symbol": "BTC/USD", "weight": 0.5}, {"symbol": "ETH/USD", "weight": 0.5}], "same"),
                      tool_turn([{"symbol": "SOL/USD", "weight": 1}], "sol"),
                      text_turn("<thinking>done</thinking>Solana alone would have ended lower."))
    body = ask(client, "What if I only held Solana?").json()
    assert body["source"] == "bedrock"
    assert body["reply"] == "Solana alone would have ended lower."
    # Recalculating the current mix is not shown to the user as a what-if.
    assert [w["holdings"] for w in body["what_ifs"]] == [[{"symbol": "SOL/USD", "weight": 1.0}]]
    last = aws.converse.call_args.kwargs
    result = last["messages"][-1]["content"][0]["toolResult"]
    assert result["status"] == "success" and result["content"][0]["json"]["return"].endswith("%")
    assert "Largest decline" in last["system"][0]["text"] and "SOL/USD" in last["system"][0]["text"]
    assert last["messages"][0]["role"] == "user"  # the UI greeting is not sent


def test_bedrock_tool_errors_are_returned_to_the_model(client, monkeypatch):
    aws = use_bedrock(monkeypatch, tool_turn([{"symbol": "FAKE", "weight": 1}]), text_turn("That asset is unsupported."))
    body = ask(client, "What if I held FAKE?").json()
    assert body["what_ifs"] == []
    result = aws.converse.call_args.kwargs["messages"][-1]["content"][0]["toolResult"]
    assert result["status"] == "error" and "supported catalog" in result["content"][0]["json"]["error"]


def test_bedrock_failure_falls_back(client, monkeypatch):
    use_bedrock(monkeypatch, *[tool_turn([{"symbol": "SOL/USD", "weight": 1}], str(i)) for i in range(10)])
    body = ask(client, "Which holding drove most of my result?").json()
    assert body["source"] == "fallback" and "contributed the most" in body["reply"]


def test_sanitize_merges_roles_and_drops_leading_assistant():
    messages = [ChatMessage(role=r, content=c) for r, c in
                [("assistant", "hi"), ("user", "a"), ("user", "b"), ("assistant", "c"), ("user", "d")]]
    convo = ai_chat.sanitize(messages)
    assert [m["role"] for m in convo] == ["user", "assistant", "user"]
    assert convo[0]["content"][0]["text"] == "a\n\nb"
