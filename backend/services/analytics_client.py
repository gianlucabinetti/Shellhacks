"""
Wraps the analytics teammate's `analyze_portfolio()` behind one
function so routes never care whether they're talking to the mock
fixtures or the real analytics package.

Switch with USE_MOCK_ANALYTICS=false once `portfolio_xray/analytics`
is importable (see README "Integrating the real analytics engine").
"""
import json
from pathlib import Path

from backend.config import settings

_FIXTURES_DIR = Path(__file__).parent / "fixtures"
_SUPPORTED_PROFILES = {"conservative", "moderate", "aggressive"}


class UnsupportedProfileError(ValueError):
    """Raised for any profile outside the three supported ones."""


def _load_fixture(profile: str) -> dict:
    path = _FIXTURES_DIR / f"portfolio_{profile}.json"
    with path.open() as f:
        return json.load(f)


def get_portfolio_analysis(profile: str) -> dict:
    """Return the portfolio contract dict for `profile`.

    Raises UnsupportedProfileError for anything outside the three
    supported profiles, in both mock and real mode, so the router can
    turn that into a consistent 404 regardless of which mode is active.
    """
    if profile not in _SUPPORTED_PROFILES:
        raise UnsupportedProfileError(profile)

    if settings.use_mock_analytics:
        return _load_fixture(profile)

    # Real path: import lazily so the app still boots in mock mode even
    # before the analytics package is on PYTHONPATH.
    from analytics.engine import analyze_portfolio  # type: ignore

    return analyze_portfolio(profile)

