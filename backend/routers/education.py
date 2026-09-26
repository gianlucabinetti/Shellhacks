"""
GET /api/education/tiles — investment-fundamentals content cards.

Not part of the original three-endpoint contract, but `backend.education`
ships a working, tested `get_tiles_for_experience()` with no API surface
to reach it — this route is that surface. Reuses `backend.education`'s
own `EducationTile` model directly as the response shape rather than
redeclaring it in `models/schemas.py`, since it's already a clean,
independent Pydantic model with no overlap with the portfolio/risk/ai
contracts.

Note on `experience`: `get_tiles_for_experience()` only special-cases
"beginner" (returns beginner-difficulty tiles only); any other value,
including "intermediate" or "experienced", returns the full set
(including "advanced"-difficulty tiles). That's a two-tier gate by
design, not a bug — flagging here so it isn't mistaken for one.
"""
from fastapi import APIRouter, Query

from backend.education.content import get_tiles_for_experience
from backend.education.models import EducationTile
from backend.models.schemas import ExperienceLevel

router = APIRouter()


@router.get("/tiles", response_model=list[EducationTile])
def get_tiles(
    experience: ExperienceLevel = Query(
        default=ExperienceLevel.beginner,
        description="beginner sees beginner-only tiles; anything else sees all tiles.",
    ),
) -> list[EducationTile]:
    return get_tiles_for_experience(experience.value)

