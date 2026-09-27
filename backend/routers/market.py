"""Real market data, calculated demo portfolios, and their explanations."""
import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Literal

from backend.ai.models import Allocation, PortfolioAnalytics, PortfolioExplanation
from backend.ai.explanations import create_fallback_explanation
from backend.ai.chat import BedrockPortfolioChat, build_facts, fallback_reply, suggestions
from backend.ai.provider import BedrockExplanationProvider, error_code
from backend.models.market import (
    ChatRequest, ChatResponse, InsightsRequest, MarketInsights, MarketPortfolio, MarketRequest, MarketTicker,
)
from backend.services import ai_client
from backend.services.market_data import assets, stock_credentials_configured, MarketDataError
from backend.services.market_live import get_ticker
from backend.services.market_insights import build_insights, insights_for, run_what_if
from backend.services.market_portfolio import analyze_market_portfolio, load_market_portfolio

router = APIRouter()
logger = logging.getLogger(__name__)


class MarketExplanation(BaseModel):
    data_id: str
    source: Literal["bedrock", "fallback"]
    explanation: PortfolioExplanation


@router.get("/assets")
def list_assets():
    return {
        "assets": assets(),
        "stocks_configured": stock_credentials_configured(),
        "crypto_requires_keys": False,
    }


def _market_error(error):
    return JSONResponse(
        status_code=error.status,
        content={"error": {"code": error.code, "message": error.message}},
    )


@router.get("/ticker", response_model=MarketTicker)
def ticker():
    try:
        return get_ticker()
    except MarketDataError as error:
        return _market_error(error)


@router.post("/portfolio", response_model=MarketPortfolio)
def portfolio(request: MarketRequest):
    try:
        return analyze_market_portfolio(request)
    except MarketDataError as error:
        return _market_error(error)


@router.post("/explain", response_model=MarketExplanation)
def explain(request: MarketRequest):
    try:
        portfolio = analyze_market_portfolio(request)
    except MarketDataError as error:
        return _market_error(error)
    weights = {"stocks": 0.0, "bonds": 0.0, "cash": 0.0, "crypto": 0.0}
    for position in portfolio.positions:
        kind = {"stock": "stocks", "bond": "bonds", "crypto": "crypto"}[position.asset_class]
        weights[kind] += position.weight
    analytics = PortfolioAnalytics(
        risk_profile="custom", portfolio_value=portfolio.initial_value,
        allocation=Allocation(**weights),
        annual_return=portfolio.annualized_return,
        annual_volatility=portfolio.annualized_volatility,
        max_drawdown=portfolio.max_drawdown, is_simulated=True,
        period_return=portfolio.total_return,
        period_start=str(portfolio.start_date), period_end=str(portfolio.end_date),
        data_source="Actual historical Alpaca prices; fictional buy-and-hold portfolio. " + " ".join(portfolio.notes),
        asset_symbols=[p.symbol for p in portfolio.positions],
    )
    try:
        provider = ai_client._get_provider()
        if isinstance(provider, BedrockExplanationProvider):
            return MarketExplanation(
                data_id=portfolio.data_id, source="bedrock", explanation=provider.generate(analytics)
            )
    except (BotoCoreError, ClientError, ValueError, KeyError, TypeError) as error:
        logger.warning("Market explanation used fallback (%s).", error_code(error))
    return MarketExplanation(
        data_id=portfolio.data_id, source="fallback", explanation=create_fallback_explanation(analytics)
    )


@router.post("/insights", response_model=MarketInsights)
def insights(request: InsightsRequest):
    try:
        return build_insights(request.portfolio, request.benchmark)
    except MarketDataError as error:
        return _market_error(error)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        portfolio, history = load_market_portfolio(request.portfolio)
        facts = build_facts(portfolio, insights_for(portfolio, history, request.benchmark), history)
    except MarketDataError as error:
        return _market_error(error)
    hints = suggestions(facts)
    try:
        provider = ai_client._get_provider()
        if isinstance(provider, BedrockExplanationProvider):
            reply, what_ifs = BedrockPortfolioChat(provider.client, provider.model).reply(
                request.messages, facts, [a.symbol for a in assets()],
                lambda holdings: run_what_if(request.portfolio, holdings),
            )
            return ChatResponse(data_id=portfolio.data_id, source="bedrock", reply=reply,
                                what_ifs=what_ifs, suggestions=hints)
    except (BotoCoreError, ClientError, ValueError, KeyError, TypeError) as error:
        logger.warning("Portfolio chat used fallback (%s).", error_code(error))
    return ChatResponse(data_id=portfolio.data_id, source="fallback",
                        reply=fallback_reply(request.messages[-1].content, facts), suggestions=hints)
