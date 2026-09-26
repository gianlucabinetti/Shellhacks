from pydantic import BaseModel


class EducationTile(BaseModel):
    id: str
    title: str
    difficulty: str
    short_description: str
    explanation: str
    risk_note: str
