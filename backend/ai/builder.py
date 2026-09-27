"""Build an example portfolio from a goal written in plain language.

With Bedrock, the model backtests candidate mixes on real prices through the
what-if tool, then proposes one; the proposal is backtested again before it is
returned, so every number shown comes from real data. Without Bedrock, a
keyword-based responder picks a template mix and backtests it the same way.
Both produce educational examples, not recommendations.
"""
import re
from collections.abc import Callable

from backend.ai.chat import WHAT_IF_SPEC, WHAT_IF_TOOL, clean, pct
from backend.models.market import MarketAsset, WhatIfResult

PROPOSE_TOOL = "propose_portfolio"
MAX_ROUNDS = 6
MAX_TESTS = 4

PROPOSE_SPEC = {"toolSpec": {
    "name": PROPOSE_TOOL,
    "description": "Submit the final example portfolio. Call exactly once, after testing candidates.",
    "inputSchema": {"json": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "A friendly 2-4 word name for the mix."},
            "summary": {"type": "string", "description": (
                "How this mix matches the goal and its backtest trade-offs, max 60 words, plain language. "
                "Do not call it suitable, ideal, or recommended for the user.")},
            "holdings": {"type": "array", "items": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string"},
                    "weight": {"type": "number"},
                    "reason": {"type": "string", "description": "This holding's role, max 15 words."},
                },
                "required": ["symbol", "weight", "reason"],
            }},
        },
        "required": ["name", "summary", "holdings"],
    }},
}}

BUILD_SYSTEM_PROMPT = """You are Portfolio X-Ray's portfolio builder for everyday investors, including
complete beginners. From the user's goal, build ONE example portfolio for learning, using only
the supported assets below.

Process:
1. Read the goal for risk tolerance (how big a drop they could live with) and time horizon.
2. Use {what_if} to backtest 2 or 3 different candidate mixes on real historical prices.
   Compare their largest declines, volatility, and returns against the goal.
3. Call {propose} once with the best-fitting mix: 2 to 6 holdings, weights that sum to 1.

Rules:
- Use only the supported symbols listed below, spelled exactly.
- If the user cannot handle big drops, favor the candidate with the smaller largest decline,
  even if its return was lower. Say so in the summary.
- Crypto swings hard. Keep it small unless the user clearly asks for crypto.
- Past results do not predict future results. Never promise returns.
- This is an educational example, not advice. Do not tell the user to buy anything, and do not
  call the mix "suitable", "ideal", or "recommended" for them. Describe how it matches the goal
  and what its trade-offs were in the backtest.

Supported assets:
{catalog}

Starting amount: ${amount:,.0f}. Backtest period: the last {days} days."""

REASONS = {
    "VTI": "The whole US stock market in one fund: the main growth engine",
    "VXUS": "Stocks outside the US, so growth is not tied to one country",
    "SPY": "The 500 largest US companies",
    "AAPL": "A single large tech company: more upside and more risk than a fund",
    "MSFT": "A single large tech company: more upside and more risk than a fund",
    "BND": "Bonds tend to fall less than stocks and cushion drops",
    "SGOV": "Short-term US Treasuries: very steady, close to cash",
    "BTC/USD": "The largest crypto: extra growth potential with big swings",
    "ETH/USD": "The second-largest crypto, often moving with Bitcoin",
    "SOL/USD": "A smaller, faster-moving crypto: the highest-risk slice",
    "LINK/USD": "A smaller crypto that adds variety within crypto",
    "AVAX/USD": "A smaller crypto that adds variety within crypto",
}

# Template mixes by risk level (1 = most cautious, 5 = most aggressive).
STOCK_TEMPLATES = {
    1: ("Steady Saver", {"VTI": 25, "VXUS": 10, "BND": 45, "SGOV": 20}),
    2: ("Calm Growth", {"VTI": 35, "VXUS": 15, "BND": 40, "SGOV": 10}),
    3: ("Balanced Builder", {"VTI": 45, "VXUS": 20, "BND": 30, "BTC/USD": 5}),
    4: ("Growth Focus", {"VTI": 50, "VXUS": 20, "BND": 15, "BTC/USD": 10, "ETH/USD": 5}),
    5: ("High Octane", {"VTI": 35, "MSFT": 15, "AAPL": 15, "BTC/USD": 20, "ETH/USD": 15}),
}
CRYPTO_TILT = {
    1: ("Crypto Curious", {"VTI": 50, "BND": 35, "BTC/USD": 10, "ETH/USD": 5}),
    3: ("Crypto Forward", {"VTI": 45, "BND": 20, "BTC/USD": 20, "ETH/USD": 15}),
    5: ("Crypto Heavy", {"VTI": 30, "BTC/USD": 35, "ETH/USD": 25, "SOL/USD": 10}),
}
CRYPTO_ONLY = {
    1: ("Crypto Core", {"BTC/USD": 70, "ETH/USD": 30}),
    3: ("Crypto Blend", {"BTC/USD": 55, "ETH/USD": 30, "SOL/USD": 15}),
    5: ("Crypto Explorer", {"BTC/USD": 40, "ETH/USD": 25, "SOL/USD": 15, "LINK/USD": 10, "AVAX/USD": 10}),
}

CAUTIOUS = ["can't handle", "cant handle", "cannot handle", "can not handle", "safe", "low risk", "low-risk",
            "conservative", "steady", "stable", "retire", "protect", "nervous", "careful", "drop", "crash",
            "lose", "losing", "sleep", "worried", "short term", "short-term"]
BOLD = ["growth", "grow", "aggressive", "high risk", "high-risk", "maximize", "maximise", "moon", "long term",
        "long-term", "bold", "risky", "fast", "yolo"]


AGE = re.compile(r"\b(?:i'?m|i am|age|aged)\s+(1[89]|[2-8]\d)\b|\b(1[89]|[2-8]\d)\s*(?:yo|y/o|years? old)\b")


def risk_level(goal: str) -> int:
    """1 (most cautious) to 5 (most aggressive). Caution counts double: losses hurt beginners most."""
    g = goal.lower().replace("’", "'")
    level = 3 - min(2, sum(w in g for w in CAUTIOUS)) + min(1, sum(w in g for w in BOLD))
    if match := AGE.search(g):
        age = int(match.group(1) or match.group(2))
        level += 1 if age < 30 else -1 if age >= 55 else 0
    return max(1, min(5, level))


def _nearest(templates: dict, level: int):
    return templates[min(templates, key=lambda k: abs(k - level))]


def fallback_build(goal: str, stocks_available: bool) -> tuple[str, str, dict[str, float]]:
    """Template mix for the goal: (name, summary, {symbol: weight percent})."""
    level = risk_level(goal)
    wants_crypto = "crypto" in goal.lower() or "bitcoin" in goal.lower()
    if not stocks_available:
        name, mix = _nearest(CRYPTO_ONLY, level)
        summary = ("Stocks and bonds need Alpaca stock keys on the backend, so this example uses crypto only. "
                   "Every crypto mix can swing sharply; spreading across coins helps less than you might expect.")
        return name, summary, mix
    name, mix = _nearest(CRYPTO_TILT, level) if wants_crypto else STOCK_TEMPLATES[level]
    tone = {
        1: "Your goal sounds cautious, so most of this mix is in bonds and Treasuries that usually move less than stocks.",
        2: "You want some growth with a smoother ride, so bonds make up a large share to soften drops.",
        3: "You want growth without big drops, so this balances a broad stock core with a solid bond cushion and only a small crypto slice.",
        4: "You are aiming for growth and can accept bumps, so stocks lead, with bonds as a smaller cushion.",
        5: "You are chasing growth and can stomach big swings, so this leans on stocks, single companies, and crypto.",
    }[level]
    return name, tone + " Check its largest decline below to see if you could live with it.", mix


ADVICE_WORDS = re.compile(r"\b(?:suitable|ideal|recommended|perfect)\s+for\b", re.I)


def soften(text: str) -> str:
    """Keep the example from reading like personal advice, whatever the model wrote."""
    return ADVICE_WORDS.sub(lambda m: "Aimed at" if m.group(0)[0].isupper() else "aimed at", text)


def tested_payload(result: WhatIfResult) -> dict:
    return {
        "holdings": ", ".join(f"{h.symbol} {pct(h.weight)}" for h in result.holdings),
        "return": pct(result.total_return, True), "volatility": pct(result.annualized_volatility),
        "largest_decline": pct(result.max_drawdown), "diversification_score": result.diversification_score,
    }


class BedrockPortfolioBuilder:
    def __init__(self, client, model: str):
        self.client = client
        self.model = model

    def build(self, goal: str, assets: list[MarketAsset], amount: float, days: int,
              run_mix: Callable[[list[dict]], WhatIfResult]) -> tuple[dict, WhatIfResult, list[WhatIfResult]]:
        """Returns (proposal {name, summary, holdings[{symbol, weight, reason}]}, backtest, tested candidates)."""
        catalog = "\n".join(f"- {a.symbol}: {a.name} ({a.asset_class}, {a.category})" for a in assets)
        system = BUILD_SYSTEM_PROMPT.format(what_if=WHAT_IF_TOOL, propose=PROPOSE_TOOL, catalog=catalog, amount=amount, days=days)
        convo: list[dict] = [{"role": "user", "content": [{"text": f"My goal: {goal}"}]}]
        tested: list[WhatIfResult] = []
        for round_ in range(MAX_ROUNDS):
            config: dict = {"tools": [WHAT_IF_SPEC, PROPOSE_SPEC]}
            if round_ >= MAX_ROUNDS - 2:
                config["toolChoice"] = {"tool": {"name": PROPOSE_TOOL}}
            response = self.client.converse(
                modelId=self.model, system=[{"text": system}], messages=convo,
                inferenceConfig={"maxTokens": 900, "temperature": 0.2}, toolConfig=config,
            )
            message = response["output"]["message"]
            convo.append(message)
            if response.get("stopReason") != "tool_use":
                convo.append({"role": "user", "content": [{"text": f"Now call {PROPOSE_TOOL} with your final mix."}]})
                continue
            results = []
            for block in message["content"]:
                tool = block.get("toolUse")
                if not tool:
                    continue
                args = tool.get("input") or {}
                try:
                    holdings = args.get("holdings")
                    if not isinstance(holdings, list) or not holdings:
                        raise ValueError("holdings must be a non-empty list of {symbol, weight}.")
                    if tool.get("name") == PROPOSE_TOOL:
                        if not 2 <= len(holdings) <= 6:
                            raise ValueError("Propose 2 to 6 holdings.")
                        result = run_mix(holdings)
                        name, summary = clean(str(args.get("name", ""))), soften(clean(str(args.get("summary", ""))))
                        if not name or not summary:
                            raise ValueError("name and summary are required.")
                        reasons = {str(h.get("symbol", "")).strip().upper(): clean(str(h.get("reason", ""))) for h in holdings}
                        proposal = {"name": name[:40], "summary": summary, "holdings": [
                            {"symbol": h.symbol, "weight": h.weight,
                             "reason": reasons.get(h.symbol) or REASONS.get(h.symbol, "Adds variety to the mix")}
                            for h in result.holdings
                        ]}
                        return proposal, result, tested
                    if tool.get("name") != WHAT_IF_TOOL:
                        raise ValueError("Unknown tool.")
                    if len(tested) >= MAX_TESTS:
                        raise ValueError(f"You already tested {MAX_TESTS} mixes. Call {PROPOSE_TOOL} now.")
                    result = run_mix(holdings)
                    tested.append(result)
                    content, status = tested_payload(result), "success"
                except ValueError as error:
                    content, status = {"error": str(error)}, "error"
                results.append({"toolResult": {"toolUseId": tool["toolUseId"], "content": [{"json": content}], "status": status}})
            convo.append({"role": "user", "content": results})
        raise ValueError("Bedrock did not propose a portfolio.")
