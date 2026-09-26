import pytest


@pytest.mark.parametrize("profile", ["conservative", "moderate", "aggressive"])
def test_get_portfolio_returns_full_contract_shape(client, profile):
    response = client.get(f"/api/portfolio/{profile}")
    assert response.status_code == 200
    body = response.json()
    for key in (
        "profile",
        "initial_investment",
        "currency",
        "allocation",
        "metrics",
        "performance",
        "data_source",
        "is_simulated",
    ):
        assert key in body
    assert body["profile"] == profile
    assert len(body["performance"]) > 0


def test_unknown_profile_returns_404_not_422(client):
    response = client.get("/api/portfolio/yolo")
    assert response.status_code == 404
    assert "yolo" in response.json()["detail"]


def test_metrics_are_numeric(client):
    response = client.get("/api/portfolio/moderate")
    metrics = response.json()["metrics"]
    assert isinstance(metrics["annualized_return"], float)
    assert isinstance(metrics["annualized_volatility"], float)
    assert isinstance(metrics["max_drawdown"], float)


def test_performance_is_chronological(client):
    response = client.get("/api/portfolio/aggressive")
    dates = [point["date"] for point in response.json()["performance"]]
    assert dates == sorted(dates)

