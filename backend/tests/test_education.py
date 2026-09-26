from backend.education.content import get_tiles_for_experience


def test_beginner_does_not_receive_advanced_tiles():
    tiles = get_tiles_for_experience("beginner")

    assert len(tiles) > 0
    assert all(tile.difficulty == "beginner" for tile in tiles)


def test_advanced_user_can_receive_options():
    tiles = get_tiles_for_experience("advanced")

    ids = [tile.id for tile in tiles]

    assert "options" in ids
