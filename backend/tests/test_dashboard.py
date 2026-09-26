def test_dashboard_returns_portfolio_and_explanation(client):
    response = client.get("/api/dashboard/moderate?experience=beginner")
    assert response.status_code == 200
    body = response.json()
    assert body["portfolio"]["profile"] == "moderate"
    assert body["explanation"] is not None
    assert "disclaimer" in body["explanation"]


def test_dashboard_can_skip_explanation(client):
    response = client.get("/api/dashboard/moderate?include_explanation=false")
    assert response.status_code == 200
    assert response.json()["explanation"] is None


def test_dashboard_unknown_profile_returns_404(client):
    response = client.get("/api/dashboard/yolo")
    assert response.status_code == 404

