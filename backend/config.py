"""
App settings, read from environment variables with sane defaults so the
app boots with zero configuration for local/demo use.

Deliberately avoids pydantic-settings to keep the dependency list
minimal for a hackathon — plain os.getenv is enough for the handful of
knobs this app needs.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from dataclasses import dataclass, field


load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def _split_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass
class Settings:
    app_name: str = "Portfolio X-Ray API"
    cors_origins: list[str] = field(
        default_factory=lambda: _split_origins(
            os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
        )
    )
    # Flip to "false" once the real analytics package is on PYTHONPATH —
    # see README "Integrating the real analytics engine". Defaults to
    # mock so the app always boots standalone.
    use_mock_analytics: bool = os.getenv("USE_MOCK_ANALYTICS", "true").lower() == "true"
    # AI_PROVIDER=bedrock enables Amazon Nova; fallback keeps the app offline.
    # AWS credentials are resolved server-side by boto3; see AWS_SETUP.md.


settings = Settings()

