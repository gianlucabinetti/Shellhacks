"""Future range math and endpoint; Build it with AI (fallback and stubbed Bedrock). No network or live AI."""
import math
from unittest.mock import Mock

import pytest

from backend.ai import builder
from backend.ai.provider import BedrockExplanationProvider
from backend.analytics import projection as proj
from backend.services import ai_client
from backend.services import market_data as md
from backend.services import market_portfolio as mp
from backend.tests.test_insights import CRYPTO_MIX, fake_history


@pytest.fixture(autouse=True)
def offline_market(monkeypatch):
    monkeypatch.setattr(md.httpx, "get", Mock(side_effect=AssertionError("Unexpected network call")))
    monkeypatch.setattr(mp, "get_history", fake_history)
    # The developer's .env may hold real Alpaca keys; these tests cover the keyless path.
    monkeypatch.delenv("APCA_API_KEY_ID", raising=False)
    monkeypatch.delenv("APCA_API_SECRET_KEY", raising=False)


# --- projection math ----------------------------------------------------------------

def test_median_includes_volatility_drag():
    # 20% expected return with 30% volatility: median grows at ln(1.2) - 0.045 a year.
    median = proj.value_at(1000, 0.3, 0.2, 1, 0)
    assert median == pytest.approx(1000 * math.exp(math.log(1.2) - 0.045))
    assert median < 1200  # the typical outcome trails the average


def test_bands_are_ordered_and_widen_over_time():
    points = proj.project_range(10000, 0.25, 0.05, 3)
    assert len(points) == 37 and points[0]["p5"] == points[0]["p95"] == pytest.approx(10000)
    for p in points[1:]:
        assert p["p5"] < p["p25"] < p["p50"] < p["p75"] < p["p95"]
    assert points[-1]["p95"] - points[-1]["p5"] > points[12]["p95"] - points[12]["p5"]


def test_probability_below_start():
    assert proj.probability_below(100, 100, 0.2, 0.0, 1) == pytest.approx(proj.normal_cdf(0.1))
    assert proj.probability_below(100, 100, 0.0, 0.05, 1) == 0.0
    assert proj.probability_below(100, 100, 0.0, -0.05, 1) == 1.0


def test_projection_endpoint_uses_real_volatility(client):
    body = client.post("/api/market/projection", json={"portfolio": CRYPTO_MIX, "years": 1, "annual_return": 0.04}).json()
    portfolio = client.post("/api/market/portfolio", json=CRYPTO_MIX).json()
    assert body["data_id"] == portfolio["data_id"]
    assert body["annual_volatility"] == pytest.approx(portfolio["annualized_volatility"])
    assert body["start_value"] == 10000 and len(body["points"]) == 13
    assert any("Not a forecast" in n for n in body["notes"])
    assert any("only 10 days" in n for n in body["notes"])


@pytest.mark.parametrize("payload", [{"years": 2}, {"annual_return": 0.5}, {"annual_return": -0.5}])
def test_projection_rejects_bad_input(client, payload):
    response = client.post("/api/market/projection", json={"portfolio": CRYPTO_MIX, **payload})
    assert response.status_code == 422


# --- fallback builder -----------------------------------------------------------------

@pytest.mark.parametrize("goal, level", [
    ("I'm 22, want growth but can't handle big drops", 3),
    ("Retiring in 20 years, keep it steady", 2),  # "20 years" is not an age
    ("I'm 60 and nervous about losing money", 1),
    ("YOLO max growth, I am 19", 5),
    ("I want to grow my money", 4),
    ("Spread my money out", 3),
])
def test_risk_level_from_plain_language(goal, level):
    assert builder.risk_level(goal) == level


def test_fallback_build_is_crypto_only_without_stock_keys(client):
    body = client.post("/api/market/build", json={"goal": "I'm 60 and want to be careful", "days": 30}).json()
    assert body["source"] == "fallback"
    assert all(h["symbol"].endswith("/USD") for h in body["holdings"])
    assert "Stocks and bonds need Alpaca stock keys" in body["summary"]
    assert sum(h["weight"] for h in body["holdings"]) == pytest.approx(1)
    assert all(h["reason"] for h in body["holdings"])
    assert body["result"]["final_value"] > 0


def test_fallback_build_uses_stock_templates_when_available(monkeypatch):
    name, summary, mix = builder.fallback_build("I'm 22, want growth but can't handle big drops", True)
    assert name == "Balanced Builder" and sum(mix.values()) == 100
    assert mix["BND"] >= 25 and mix.get("BTC/USD", 0) <= 5
    assert builder.fallback_build("safe crypto please", True)[2]["BTC/USD"] == 10


def test_builder_summary_never_reads_like_personal_advice():
    assert builder.soften("Making it suitable for you. Ideal for savers, perfect for retirees.") == (
        "Making it aimed at you. Aimed at savers, aimed at retirees.")
    assert builder.soften("A suitably calm mix.") == "A suitably calm mix."


def test_build_rejects_empty_goal(client):
    assert client.post("/api/market/build", json={"goal": "  "}).status_code == 422


# --- Bedrock builder --------------------------------------------------------------------

def tool_turn(name, args, tool_id):
    return {"stopReason": "tool_use", "output": {"message": {"role": "assistant", "content": [
        {"toolUse": {"toolUseId": tool_id, "name": name, "input": args}}]}}}


def use_bedrock(monkeypatch, *turns):
    aws = Mock()
    aws.converse.side_effect = list(turns)
    monkeypatch.setattr(ai_client, "_get_provider", lambda: BedrockExplanationProvider(aws, "test-model"))
    return aws


def mix(*pairs):
    return [{"symbol": s, "weight": w, "reason": f"{s} reason"} for s, w in pairs]


def test_bedrock_builder_tests_candidates_then_proposes(client, monkeypatch):
    aws = use_bedrock(
        monkeypatch,
        tool_turn(builder.WHAT_IF_TOOL, {"holdings": mix(("BTC/USD", 0.7), ("ETH/USD", 0.3))}, "a"),
        tool_turn(builder.WHAT_IF_TOOL, {"holdings": mix(("BTC/USD", 0.5), ("SOL/USD", 0.5))}, "b"),
        tool_turn(builder.PROPOSE_TOOL, {"name": "Calm Coins", "summary": "Mostly Bitcoin.",
                                          "holdings": mix(("BTC/USD", 70), ("ETH/USD", 30))}, "c"),
    )
    body = client.post("/api/market/build", json={"goal": "Crypto but calm", "days": 30}).json()
    assert body["source"] == "bedrock" and body["name"] == "Calm Coins"
    assert [len(t["holdings"]) for t in body["tested"]] == [2, 2]
    assert {h["symbol"]: round(h["weight"], 6) for h in body["holdings"]} == {"BTC/USD": 0.7, "ETH/USD": 0.3}
    assert body["holdings"][0]["reason"] == "BTC/USD reason"
    system = aws.converse.call_args_list[0].kwargs["system"][0]["text"]
    assert "BTC/USD" in system and "VTI" not in system  # stocks are hidden without keys
    # The mock keeps a reference to the growing conversation: [goal, tool call a, result a, ...].
    first_result = aws.converse.call_args_list[-1].kwargs["messages"][2]["content"][0]["toolResult"]
    assert first_result["status"] == "success" and "largest_decline" in first_result["content"][0]["json"]


def test_invalid_proposal_is_sent_back_and_final_rounds_force_a_proposal(client, monkeypatch):
    bad = tool_turn(builder.PROPOSE_TOOL, {"name": "X", "summary": "Y", "holdings": mix(("FAKE", 0.5), ("BTC/USD", 0.5))}, "bad")
    idle = {"stopReason": "end_turn", "output": {"message": {"role": "assistant", "content": [{"text": "Thinking."}]}}}
    good = tool_turn(builder.PROPOSE_TOOL, {"name": "Two Coins", "summary": "Split.", "holdings": mix(("BTC/USD", 0.5), ("ETH/USD", 0.5))}, "ok")
    aws = use_bedrock(monkeypatch, bad, idle, idle, idle, good)
    body = client.post("/api/market/build", json={"goal": "anything", "days": 30}).json()
    assert body["source"] == "bedrock" and body["name"] == "Two Coins"
    calls = aws.converse.call_args_list
    error = calls[-1].kwargs["messages"][2]["content"][0]["toolResult"]
    assert error["status"] == "error" and "supported catalog" in error["content"][0]["json"]["error"]
    assert "toolChoice" not in calls[0].kwargs["toolConfig"]
    assert calls[4].kwargs["toolConfig"]["toolChoice"] == {"tool": {"name": builder.PROPOSE_TOOL}}


def test_bedrock_builder_failure_falls_back(client, monkeypatch):
    idle = {"stopReason": "end_turn", "output": {"message": {"role": "assistant", "content": [{"text": "Hmm."}]}}}
    use_bedrock(monkeypatch, *[idle] * builder.MAX_ROUNDS)
    body = client.post("/api/market/build", json={"goal": "I'm 30 and want growth", "days": 30}).json()
    assert body["source"] == "fallback" and body["holdings"]
