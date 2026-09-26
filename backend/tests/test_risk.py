def test_assess_returns_valid_contract_shape(client):
    payload = {
        "experience": "beginner",
        "investment_horizon_years": 10,
        "loss_tolerance": "medium",
        "goal": "growth",
    }
    response = client.post("/api/risk/assess", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["risk_profile"] in {"conservative", "moderate", "aggressive"}
    assert "explanation" in body and isinstance(body["explanation"], str)
    allocation = body["allocation"]
    total = allocation["stocks"] + allocation["bonds"] + allocation["cash"]
    assert round(total, 6) == 1.0


def test_assess_is_deterministic(client):
    payload = {
        "experience": "experienced",
        "investment_horizon_years": 20,
        "loss_tolerance": "high",
        "goal": "growth",
    }
    first = client.post("/api/risk/assess", json=payload).json()
    second = client.post("/api/risk/assess", json=payload).json()
    assert first == second


def test_high_tolerance_long_horizon_growth_is_aggressive(client):
    payload = {
        "experience": "beginner",
        "investment_horizon_years": 25,
        "loss_tolerance": "high",
        "goal": "growth",
    }
    response = client.post("/api/risk/assess", json=payload)
    assert response.json()["risk_profile"] == "aggressive"


def test_low_tolerance_short_horizon_preservation_is_conservative(client):
    payload = {
        "experience": "beginner",
        "investment_horizon_years": 2,
        "loss_tolerance": "low",
        "goal": "preservation",
    }
    response = client.post("/api/risk/assess", json=payload)
    assert response.json()["risk_profile"] == "conservative"


def test_experience_alone_does_not_change_profile(client):
    # Same financial answers, different experience — profile must match.
    base = {
        "investment_horizon_years": 10,
        "loss_tolerance": "medium",
        "goal": "growth",
    }
    beginner = client.post("/api/risk/assess", json={**base, "experience": "beginner"}).json()
    experienced = client.post(
        "/api/risk/assess", json={**base, "experience": "experienced"}
    ).json()
    assert beginner["risk_profile"] == experienced["risk_profile"]
    assert beginner["allocation"] == experienced["allocation"]


def test_malformed_request_returns_422(client):
    response = client.post("/api/risk/assess", json={"experience": "beginner"})
    assert response.status_code == 422


def test_invalid_enum_value_returns_422(client):
    payload = {
        "experience": "expert",  # not a valid ExperienceLevel
        "investment_horizon_years": 10,
        "loss_tolerance": "medium",
        "goal": "growth",
    }
    response = client.post("/api/risk/assess", json=payload)
    assert response.status_code == 422

