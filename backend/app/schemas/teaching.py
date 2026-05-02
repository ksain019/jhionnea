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
    student_id: int | None = None
    title: str
    content: str | None = None


class GradeAssignment(BaseModel):
    grade: str
    score: float | None = None
    feedback: str


class AssignmentResponse(BaseModel):
    id: int
    curriculum_id: int | None
    student_id: int | None = None
    title: str
    content: str | None = None
    feedback: str | None
    grade: str | None
    score: float | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    name: str
    email: str | None = None
    grade_level: str | None = None
    notes: str | None = None


class StudentResponse(BaseModel):
    id: int
    name: str
    email: str | None
    grade_level: str | None
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceCreate(BaseModel):
    student_id: int
    curriculum_id: int | None = None
    date: str
    status: str  # present, absent, late, excused
    notes: str | None = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    curriculum_id: int | None
    date: str
    status: str
    notes: str | None
    recorded_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DemoLessonCreate(BaseModel):
    curriculum_id: int | None = None
    title: str
    subject: str
    grade_level: str
    duration_minutes: int = 45


class DemoLessonResponse(BaseModel):
    id: int
    curriculum_id: int | None
    title: str
    subject: str
    grade_level: str
    duration_minutes: int
    lesson_plan: str | None
    student_instructions: str | None
    materials: str | None
    status: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentAnalysis(BaseModel):
    student_id: int
    student_name: str
    total_assignments: int
    graded_assignments: int
    average_score: float | None
    grades: list[str]
    attendance_rate: float | None
    strengths: str
    areas_for_improvement: str
