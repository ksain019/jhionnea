from datetime import datetime

from pydantic import BaseModel


class CurriculumCreate(BaseModel):
    title: str
    subject: str
    grade_level: str
    content: str | None = None


class CurriculumResponse(BaseModel):
    id: int
    title: str
    subject: str
    grade_level: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    curriculum_id: int | None = None
    title: str


class AssignmentResponse(BaseModel):
    id: int
    curriculum_id: int | None
    title: str
    feedback: str | None
    grade: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
