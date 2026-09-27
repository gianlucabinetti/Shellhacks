"""Grounded Q&A about one analyzed portfolio.

Bedrock answers from the calculated facts and can run what-if portfolios
through a tool, so any new numbers it quotes come from real price data,
not from the model. Without Bedrock, a deterministic responder answers
common questions from the same facts.
"""
import re
from collections.abc import Callable

from backend.analytics.insights import drawdown_window, price_change_between
from backend.models.market import ChatMessage, MarketInsights, MarketPortfolio, WhatIfResult

WHAT_IF_TOOL = "analyze_what_if"
MAX_WHAT_IFS = 3
MAX_TOOL_ROUNDS = 4

WHAT_IF_SPEC = {"toolSpec": {
    "name": WHAT_IF_TOOL,
    "description": ("Recalculate a DIFFERENT portfolio over the same period and starting "
                    "amount using actual historical prices. Pass the complete new mix; weights "
                    "are fractions that sum to 1."),
    "inputSchema": {"json": {
        "type": "object",
        "properties": {"holdings": {"type": "array", "items": {
            "type": "object",
            "properties": {"symbol": {"type": "string"}, "weight": {"type": "number"}},
            "required": ["symbol", "weight"],
        }}},
        "required": ["holdings"],
    }},
}}

CHAT_SYSTEM_PROMPT = """You are Portfolio X-Ray's educational assistant. You help a beginner
understand ONE hypothetical portfolio that was analyzed with actual historical prices.

Rules:
- Use only the facts below and results returned by the {tool} tool. Never invent prices,
  returns, dates, or statistics. If something is not in the facts, say it is not available.
- For any "what if" question about different holdings or weights, call {tool} once with
  the complete new mix and base your answer on its result. Never call it for the current
  portfolio or for questions that are not what-ifs. Only use symbols from the supported list.
- "Move X% into Y" means Y gets weight X and every other holding is scaled down
  proportionally so all weights sum to 1. Example: 50/30/20 with 30% moved to BND becomes
  0.35/0.21/0.14 plus BND 0.30.
- Past results do not predict future results. Never promise returns.
- Explain concepts in plain language; define jargon briefly the first time you use it.
- Do not tell the user to buy or sell anything. Compare and explain instead.
- Answer in at most 120 words of plain text. No markdown headings or tables.

Supported symbols: {symbols}

FACTS
{facts}"""


def pct(value: float | None, signed: bool = False) -> str:
    if value is None:
        return "not available"
    return f"{value * 100:+.1f}%" if signed else f"{value * 100:.1f}%"


def money(value: float) -> str:
    return f"${value:,.2f}"


def build_facts(portfolio: MarketPortfolio, insights: MarketInsights, history: dict) -> dict:
    window = drawdown_window([(p.date, p.value) for p in portfolio.performance])
    if window:
        window["moves"] = {
            p.symbol: price_change_between(history["series"][p.symbol], window["peak_date"], window["trough_date"])
            for p in portfolio.positions
        }
    contributions = {c.symbol: c for c in insights.contributions}
    d = insights.diversification
    b = insights.benchmark
    e = insights.exposure
    return {
        "start": str(portfolio.start_date), "end": str(portfolio.end_date),
        "initial_value": portfolio.initial_value, "final_value": portfolio.final_value,
        "total_return": portfolio.total_return, "volatility": portfolio.annualized_volatility,
        "max_drawdown": portfolio.max_drawdown,
        "drawdown_window": window and {**window, "peak_date": str(window["peak_date"]), "trough_date": str(window["trough_date"])},
        "holdings": [{
            "symbol": p.symbol, "name": p.name, "asset_class": p.asset_class, "weight": p.weight,
            "period_return": p.period_return, "contribution": contributions[p.symbol].dollars,
        } for p in portfolio.positions],
        "diversification": {
            "score": d.score, "label": d.label, "effective_bets": d.effective_bets,
            "average_correlation": d.average_correlation, "message": d.message,
            "most_correlated": d.most_correlated and d.most_correlated.model_dump(),
            "least_correlated": d.least_correlated and d.least_correlated.model_dump(),
        },
        "benchmark": b and b.available and {
            "name": b.name, "total_return": b.total_return, "volatility": b.annualized_volatility,
            "max_drawdown": b.max_drawdown, "excess_return": b.excess_return,
        } or None,
        "exposure": e and {
            "by_type": [(s.label, s.weight) for s in e.by_type],
            "by_sector": [(s.label, s.weight) for s in e.by_sector],
            "outside": [(s.label, s.weight) for s in e.outside_companies],
            "message": e.message, "as_of": e.as_of and str(e.as_of),
        },
    }


def facts_text(f: dict) -> str:
    lines = [
        f"Period: {f['start']} to {f['end']} (buy and hold, no rebalancing, fees, or taxes).",
        f"Fictional starting value {money(f['initial_value'])}, ending value {money(f['final_value'])}, "
        f"return {pct(f['total_return'], True)}.",
        f"Annualized volatility {pct(f['volatility'])}. Largest decline {pct(f['max_drawdown'])}"
        + (f" (peak {f['drawdown_window']['peak_date']} to low {f['drawdown_window']['trough_date']})."
           if f["drawdown_window"] else "."),
    ]
    if f["drawdown_window"]:
        moves = f["drawdown_window"]["moves"]
        lines.append("Price changes during that largest decline: " + ", ".join(
            f"{s} {pct(m, True)}" for s, m in sorted(moves.items(), key=lambda kv: kv[1] if kv[1] is not None else 0)
        ) + ".")
    lines.append("Holdings:")
    for h in f["holdings"]:
        lines.append(f"- {h['symbol']} ({h['name']}, {h['asset_class']}): weight {pct(h['weight'])}, "
                     f"price change {pct(h['period_return'], True)}, gain/loss contribution {h['contribution']:+,.2f} USD")
    d = f["diversification"]
    lines.append(f"Diversification score {d['score']}/100 ({d['label']}); about {d['effective_bets']:.1f} "
                 f"independent bets; weighted average correlation {d['average_correlation']:.2f}."
                 if d["average_correlation"] is not None else
                 f"Diversification score {d['score']}/100 ({d['label']}).")
    lines.append(d["message"])
    if f.get("exposure"):
        e = f["exposure"]
        lines.append("Mix by type (ending values): " + ", ".join(f"{label} {pct(w)}" for label, w in e["by_type"]) + ".")
        if e["by_sector"]:
            lines.append("Sectors, with funds split by the companies they hold"
                         + (f" (fund data as of {e['as_of']})" if e["as_of"] else "") + ": "
                         + ", ".join(f"{label} {pct(w)}" for label, w in e["by_sector"]) + ".")
        if e["outside"]:
            lines.append("Not in companies (no sector): " + ", ".join(f"{label} {pct(w)}" for label, w in e["outside"]) + ".")
        lines.append(e["message"])
    if f["benchmark"]:
        b = f["benchmark"]
        lines.append(f"Benchmark {b['name']}: return {pct(b['total_return'], True)}, volatility {pct(b['volatility'])}, "
                     f"largest decline {pct(b['max_drawdown'])}. Portfolio minus benchmark: {pct(b['excess_return'], True)}.")
    return "\n".join(lines)


def suggestions(f: dict) -> list[str]:
    out = []
    if f["max_drawdown"] < -0.02:
        out.append(f"Why did it fall {pct(abs(f['max_drawdown']))} at its worst?")
    if len(f["holdings"]) > 1:
        out.append("Which holding drove most of my result?")
    d = f["diversification"]
    if len(f["holdings"]) > 1 and d["score"] < 35:
        out.append(f"Why is my diversification score only {d['score']}?")
    if f["benchmark"]:
        out.append(f"How did I do against the {f['benchmark']['name']}?")
    symbols = {h["symbol"] for h in f["holdings"]}
    out.append("What if I held only Bitcoin instead?" if "BND" in symbols else "What if I moved 30% into bonds (BND)?")
    out.append("What does volatility actually mean?")
    return out[:4]


def sanitize(messages: list[ChatMessage]) -> list[dict]:
    """Bedrock needs alternating roles starting with the user."""
    convo: list[dict] = []
    for m in messages:
        if not convo and m.role == "assistant":
            continue
        if convo and convo[-1]["role"] == m.role:
            convo[-1]["content"][0]["text"] += "\n\n" + m.content
        else:
            convo.append({"role": m.role, "content": [{"text": m.content}]})
    return convo[-12:] if convo[-12:][0]["role"] == "user" else convo[-11:]


def clean(text: str) -> str:
    text = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.S)
    text = re.sub(r"</?thinking>", "", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    return text.strip()


def what_if_payload(result: WhatIfResult, f: dict) -> dict:
    """Tool result for the model: formatted like the facts, with the original for contrast."""
    return {
        "holdings": ", ".join(f"{h.symbol} {pct(h.weight)}" for h in result.holdings),
        "return": pct(result.total_return, True), "original_return": pct(f["total_return"], True),
        "volatility": pct(result.annualized_volatility), "original_volatility": pct(f["volatility"]),
        "largest_decline": pct(result.max_drawdown), "original_largest_decline": pct(f["max_drawdown"]),
        "ending_value": money(result.final_value),
        "diversification_score": result.diversification_score,
        "original_diversification_score": f["diversification"]["score"],
        "note": "Same period and starting amount, actual historical prices.",
    }


def _weights(holdings) -> dict[str, float]:
    return {h.symbol: round(h.weight, 4) for h in holdings}


class BedrockPortfolioChat:
    def __init__(self, client, model: str):
        self.client = client
        self.model = model

    def reply(self, messages: list[ChatMessage], facts: dict, symbols: list[str],
              run_what_if: Callable[[list[dict]], WhatIfResult]) -> tuple[str, list[WhatIfResult]]:
        system = CHAT_SYSTEM_PROMPT.format(tool=WHAT_IF_TOOL, symbols=", ".join(symbols), facts=facts_text(facts))
        convo = sanitize(messages)
        what_ifs: list[WhatIfResult] = []
        current = {h["symbol"]: round(h["weight"], 4) for h in facts["holdings"]}
        for _ in range(MAX_TOOL_ROUNDS):
            response = self.client.converse(
                modelId=self.model, system=[{"text": system}], messages=convo,
                inferenceConfig={"maxTokens": 700, "temperature": 0.1},
                toolConfig={"tools": [WHAT_IF_SPEC]},
            )
            message = response["output"]["message"]
            if response.get("stopReason") != "tool_use":
                text = clean("".join(block.get("text", "") for block in message["content"]))
                if not text:
                    raise ValueError("Bedrock returned an empty chat reply.")
                return text, what_ifs
            convo.append(message)
            results = []
            for block in message["content"]:
                tool = block.get("toolUse")
                if not tool:
                    continue
                try:
                    if tool.get("name") != WHAT_IF_TOOL:
                        raise ValueError("Unknown tool.")
                    if len(what_ifs) >= MAX_WHAT_IFS:
                        raise ValueError(f"Only {MAX_WHAT_IFS} what-if calculations are allowed per question.")
                    holdings = tool.get("input", {}).get("holdings")
                    if not isinstance(holdings, list):
                        raise ValueError("holdings must be a list of {symbol, weight}.")
                    result = run_what_if(holdings)
                    if _weights(result.holdings) != current and _weights(result.holdings) not in (
                            _weights(w.holdings) for w in what_ifs):
                        what_ifs.append(result)
                    content, status = what_if_payload(result, facts), "success"
                except ValueError as error:
                    content, status = {"error": str(error)}, "error"
                results.append({"toolResult": {"toolUseId": tool["toolUseId"], "content": [{"json": content}], "status": status}})
            convo.append({"role": "user", "content": results})
        raise ValueError("Bedrock did not finish answering after several tool calls.")


def fallback_reply(question: str, f: dict) -> str:
    """Deterministic answers from the same facts, for offline or failed AI."""
    q = question.lower()
    holdings = f["holdings"]
    ranked = sorted(holdings, key=lambda h: h["contribution"], reverse=True)
    d = f["diversification"]

    def has(*words: str) -> bool:
        return any(w in q for w in words)

    if has("what if", "instead", "swap", "replace", "moved", "move ", "add "):
        return ("What-if questions need the AI assistant, which recalculates a new mix with real prices. "
                "It is not available right now, but you can test the idea yourself: change the holdings or "
                "weights above and select Analyze portfolio to compare.")
    if has("drawdown", "decline", "fall", "fell", "drop", "lose", "loss", "lost", "crash"):
        w = f["drawdown_window"]
        if not w:
            return "This portfolio never fell below a previous high during the period, so there was no drawdown."
        moves = {s: m for s, m in w["moves"].items() if m is not None}
        text = (f"The largest decline was {pct(abs(w['decline']))}, from a high on {w['peak_date']} to a low on "
                f"{w['trough_date']}. A drawdown measures a drop from a previous peak.")
        if moves:
            worst = min(moves, key=moves.get)
            text += f" During that stretch, {worst} moved the most ({pct(moves[worst], True)})."
            if len(moves) > 1 and all(m < 0 for m in moves.values()):
                text += " Every holding fell at the same time, which is what high correlation looks like in practice."
        return text + " The price data shows when values fell, not the news behind it."
    if has("sector", "industr", "exposure", "concentrat", "tech", "health", "medical", "types of", "what do i own", "made of"):
        e = f.get("exposure")
        if not e:
            return "The sector breakdown is not available for this portfolio right now."
        text = f"By type, this portfolio is {', '.join(f'{label} {pct(w)}' for label, w in e['by_type'])}. {e['message']}"
        if e["as_of"]:
            text += f" Funds are split into sectors using their holdings as of {e['as_of']}."
        return text
    if has("diversif", "correlat", "together", "spread", "score"):
        return (f"Your diversification score is {d['score']}/100 ({d['label'].lower()}). {d['message']} "
                "Correlation runs from -1 to 1; assets near 1 tend to rise and fall on the same days, "
                "so owning several of them spreads risk less than it seems.")
    if has("benchmark", "s&p", "spy", "compare", "beat", "market", "60/40", "bitcoin only"):
        b = f["benchmark"]
        if not b:
            return "Choose a benchmark above the chart to compare this portfolio against a common reference."
        verb = "ahead of" if b["excess_return"] >= 0 else "behind"
        return (f"Over the same days, your portfolio returned {pct(f['total_return'], True)} and the {b['name']} "
                f"returned {pct(b['total_return'], True)}, so you finished {pct(abs(b['excess_return']))} {verb} it. "
                f"Your volatility was {pct(f['volatility'])} versus {pct(b['volatility'])} for the benchmark. "
                "A short period can favor either; it does not predict the next one.")
    if has("volatil", "risk", "swing", "risky"):
        return (f"Annualized volatility was {pct(f['volatility'])}. Volatility measures how much the value "
                "swung from day to day, scaled to a year. Higher volatility means bigger ups and downs, "
                f"and a larger chance of deep drops like the {pct(abs(f['max_drawdown']))} decline seen here.")
    if has("best", "worst", "drove", "driver", "contribut", "which", "biggest", "most"):
        top, bottom = ranked[0], ranked[-1]
        text = (f"{top['symbol']} contributed the most: {top['contribution']:+,.2f} USD, from a "
                f"{pct(top['period_return'], True)} price change on a {pct(top['weight'])} weight.")
        if bottom is not top:
            text += (f" {bottom['symbol']} contributed the least: {bottom['contribution']:+,.2f} USD. "
                     "A holding's impact depends on both its price change and how much of the portfolio it is.")
        return text
    return (f"From {f['start']} to {f['end']}, this fictional {money(f['initial_value'])} portfolio became "
            f"{money(f['final_value'])} ({pct(f['total_return'], True)}), with {pct(f['volatility'])} annualized "
            f"volatility and a largest decline of {pct(abs(f['max_drawdown']))}. Ask about its drawdown, "
            "diversification, sectors, biggest contributor, or benchmark comparison.")
