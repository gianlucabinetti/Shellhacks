from .models import EducationTile


EDUCATION_TILES = [
    EducationTile(
        id="stocks",
        title="Stocks",
        difficulty="beginner",
        short_description="Owning a small piece of a company.",
        explanation=(
            "A stock represents partial ownership in a company. "
            "Its value can rise or fall based on company performance, "
            "economic conditions, expectations, and market sentiment."
        ),
        risk_note=(
            "Stocks can experience significant short-term price changes."
        ),
    ),
    EducationTile(
        id="bonds",
        title="Bonds",
        difficulty="beginner",
        short_description=(
            "Loans made to governments or organizations."
        ),
        explanation=(
            "When you buy a bond, you are generally lending money "
            "to a government or organization in exchange for interest "
            "payments and the return of principal under the bond's terms."
        ),
        risk_note=(
            "Bond values can change because of interest rates, "
            "credit risk, and other market conditions."
        ),
    ),
    EducationTile(
        id="etfs",
        title="ETFs",
        difficulty="beginner",
        short_description=(
            "Funds that can hold many investments at once."
        ),
        explanation=(
            "An exchange-traded fund can contain stocks, bonds, "
            "or other assets. ETFs can make diversification easier "
            "because one fund may hold many securities."
        ),
        risk_note=(
            "ETFs still carry the risks of the investments they contain."
        ),
    ),
    EducationTile(
        id="options",
        title="Options",
        difficulty="advanced",
        short_description=(
            "Contracts tied to the price of another asset."
        ),
        explanation=(
            "Options give their holder certain rights related to buying "
            "or selling an underlying asset under specified terms."
        ),
        risk_note=(
            "Options can be complex and some strategies can result "
            "in substantial losses."
        ),
    ),
]


def get_tiles_for_experience(
    experience: str,
) -> list[EducationTile]:
    experience = experience.lower()

    if experience == "beginner":
        return [
            tile
            for tile in EDUCATION_TILES
            if tile.difficulty == "beginner"
        ]

    return EDUCATION_TILES
