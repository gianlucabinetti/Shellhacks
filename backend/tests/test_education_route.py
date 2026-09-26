def test_education_tiles_default_is_beginner_only(client):
    response = client.get("/api/education/tiles")
    assert response.status_code == 200
    tiles = response.json()
    assert len(tiles) > 0
    assert all(tile["difficulty"] == "beginner" for tile in tiles)


def test_education_tiles_experienced_includes_advanced(client):
    response = client.get("/api/education/tiles?experience=experienced")
    difficulties = {tile["difficulty"] for tile in response.json()}
    assert "advanced" in difficulties


def test_education_tile_shape(client):
    response = client.get("/api/education/tiles")
    tile = response.json()[0]
    for key in ("id", "title", "difficulty", "short_description", "explanation", "risk_note"):
        assert key in tile

