import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.config import settings


@pytest.fixture(autouse=True)
def offline_ai(monkeypatch):
    # Tests never spend credits or inherit a developer's live AWS configuration.
    # Bedrock tests explicitly opt in and substitute an SDK stub.
    monkeypatch.setenv("AI_PROVIDER", "fallback")
    monkeypatch.setattr(settings, "use_mock_analytics", True)


@pytest.fixture
def client():
    return TestClient(app)

