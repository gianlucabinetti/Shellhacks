"""
Portfolio X-Ray — FastAPI backend entrypoint.

Wires together the risk, portfolio, ai, and dashboard routers, and
configures CORS for the frontend dev origin. Run with:

    uvicorn backend.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import ai, dashboard, education, portfolio, risk, market

app = FastAPI(
    title=settings.app_name,
    description="Educational portfolio analysis platform — backend API.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk.router, prefix="/api/risk", tags=["risk"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(education.router, prefix="/api/education", tags=["education"])
app.include_router(market.router, prefix="/api/market", tags=["market data"])


@app.get("/api/health", tags=["health"])
def health_check() -> dict:
    """Liveness check the frontend can poll before wiring real calls."""
    return {"status": "ok", "service": settings.app_name}

