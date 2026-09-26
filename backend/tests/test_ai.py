def test_explain_returns_full_contract_shape(client):
    response = client.post(
        "/api/ai/explain", json={"profile": "moderate", "experience": "beginner"}
    )
    assert response.status_code == 200
    body = response.json()
    for key in ("summary", "risk_explanation", "educational_tip", "disclaimer"):
        assert key in body
        assert isinstance(body[key], str) and body[key]


def test_explain_summary_reflects_profile(client):
    response = client.post(
        "/api/ai/explain", json={"profile": "aggressive", "experience": "beginner"}
    )
    assert "aggressive" in response.json()["summary"].lower()


def test_explain_rejects_unknown_profile_at_the_body_level(client):
    # profile is a RiskProfile enum in the request body, so pydantic
    # rejects an unknown value before the route body ever runs.
    response = client.post(
        "/api/ai/explain", json={"profile": "yolo", "experience": "beginner"}
    )
    assert response.status_code == 422


def test_explain_disclaimer_always_present(client):
    for profile in ("conservative", "moderate", "aggressive"):
        response = client.post(
            "/api/ai/explain", json={"profile": profile, "experience": "experienced"}
        )
        assert "disclaimer" in response.json()


def test_explain_is_deterministic_in_fallback_mode(client, monkeypatch):
    # Explicit offline mode never needs credentials or a network call.
    monkeypatch.setenv("AI_PROVIDER", "fallback")
    payload = {"profile": "moderate", "experience": "beginner"}
    first = client.post("/api/ai/explain", json=payload).json()
    second = client.post("/api/ai/explain", json=payload).json()
    assert first == second

