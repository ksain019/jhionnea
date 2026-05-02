import io

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.teaching import Assignment, AttendanceRecord, Curriculum, DemoLesson, Student
from app.models.user import User
from app.schemas.teaching import (
    AssignmentCreate,
    AssignmentResponse,
    AttendanceCreate,
    AttendanceResponse,
    CurriculumCreate,
    CurriculumResponse,
    DemoLessonCreate,
    DemoLessonResponse,
    GradeAssignment,
    StudentAnalysis,
    StudentCreate,
    StudentResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/teaching", tags=["teaching"])


# ── Curricula ──────────────────────────────────────────────────────────────────

@router.get("/curricula", response_model=list[CurriculumResponse])
async def list_curricula(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Curriculum).order_by(Curriculum.created_at.desc()))
    return result.scalars().all()


@router.post("/curricula", response_model=CurriculumResponse, status_code=201)
async def create_curriculum(
    data: CurriculumCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    curriculum = Curriculum(**data.model_dump(), created_by=current_user.id)
    db.add(curriculum)
    await db.commit()
    await db.refresh(curriculum)
    return curriculum


@router.get("/curricula/{curriculum_id}", response_model=CurriculumResponse)
async def get_curriculum(
    curriculum_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curriculum


# ── Students ───────────────────────────────────────────────────────────────────

@router.get("/students", response_model=list[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).order_by(Student.name))
    return result.scalars().all()


@router.post("/students", response_model=StudentResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = Student(**data.model_dump(), created_by=current_user.id)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


# ── Assignments & Grading ──────────────────────────────────────────────────────

@router.get("/assignments", response_model=list[AssignmentResponse])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Assignment).order_by(Assignment.created_at.desc()))
    return result.scalars().all()


@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    data: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = Assignment(**data.model_dump(), created_by=current_user.id)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.post("/assignments/upload", response_model=AssignmentResponse, status_code=201)
async def upload_assignment(
    file: UploadFile,
    title: str = Form(""),
    student_id: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename.lower()
    content_bytes = await file.read()

    if filename.endswith(".pdf"):
        text = _extract_pdf_text(content_bytes)
    elif filename.endswith(".docx"):
        text = _extract_docx_text(content_bytes)
    elif filename.endswith(".txt"):
        text = content_bytes.decode("utf-8", errors="replace")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF, DOCX, or TXT.",
        )

    assignment_title = title or file.filename.rsplit(".", 1)[0]
    assignment = Assignment(
        title=assignment_title,
        content=text,
        student_id=student_id,
        created_by=current_user.id,
        file_name=file.filename,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


def _extract_pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def _extract_docx_text(data: bytes) -> str:
    import docx

    doc = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs).strip()


@router.put("/assignments/{assignment_id}/grade", response_model=AssignmentResponse)
async def grade_assignment(
    assignment_id: int,
    data: GradeAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.grade = data.grade
    assignment.score = data.score
    assignment.feedback = data.feedback
    assignment.status = "graded"
    await db.commit()
    await db.refresh(assignment)
    return assignment


# ── Attendance ─────────────────────────────────────────────────────────────────

@router.get("/attendance", response_model=list[AttendanceResponse])
async def list_attendance(
    date: str | None = None,
    student_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(AttendanceRecord).order_by(AttendanceRecord.date.desc())
    if date:
        query = query.where(AttendanceRecord.date == date)
    if student_id:
        query = query.where(AttendanceRecord.student_id == student_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/attendance", response_model=AttendanceResponse, status_code=201)
async def record_attendance(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = AttendanceRecord(**data.model_dump(), recorded_by=current_user.id)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.post("/attendance/bulk", response_model=list[AttendanceResponse], status_code=201)
async def record_bulk_attendance(
    records: list[AttendanceCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    for data in records:
        record = AttendanceRecord(**data.model_dump(), recorded_by=current_user.id)
        db.add(record)
        results.append(record)
    await db.commit()
    for r in results:
        await db.refresh(r)
    return results


# ── Demo Lessons (Sick Day Mode) ───────────────────────────────────────────────

@router.get("/demo-lessons", response_model=list[DemoLessonResponse])
async def list_demo_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DemoLesson).order_by(DemoLesson.created_at.desc())
    )
    return result.scalars().all()


@router.post("/demo-lessons", response_model=DemoLessonResponse, status_code=201)
async def create_demo_lesson(
    data: DemoLessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson_plan = _generate_lesson_plan(
        data.subject, data.grade_level, data.title, data.duration_minutes
    )
    student_instructions = _generate_student_instructions(data.subject, data.title)
    materials = _generate_materials_list(data.subject, data.grade_level)

    lesson = DemoLesson(
        **data.model_dump(),
        lesson_plan=lesson_plan,
        student_instructions=student_instructions,
        materials=materials,
        status="ready",
        created_by=current_user.id,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/demo-lessons/{lesson_id}", response_model=DemoLessonResponse)
async def get_demo_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(DemoLesson).where(DemoLesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Demo lesson not found")
    return lesson


# ── Student Analysis ───────────────────────────────────────────────────────────

@router.get("/students/{student_id}/analysis", response_model=StudentAnalysis)
async def analyze_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    assignments_result = await db.execute(
        select(Assignment).where(Assignment.student_id == student_id)
    )
    assignments = assignments_result.scalars().all()

    graded = [a for a in assignments if a.status == "graded"]
    scores = [a.score for a in graded if a.score is not None]
    grades = [a.grade for a in graded if a.grade]

    attendance_result = await db.execute(
        select(sa_func.count(AttendanceRecord.id)).where(
            AttendanceRecord.student_id == student_id
        )
    )
    total_attendance = attendance_result.scalar() or 0

    present_result = await db.execute(
        select(sa_func.count(AttendanceRecord.id)).where(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.status.in_(["present", "late"]),
        )
    )
    present_count = present_result.scalar() or 0

    avg_score = sum(scores) / len(scores) if scores else None
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else None

    strengths = "Consistent submission" if len(assignments) > 0 else "No data yet"
    if avg_score and avg_score >= 85:
        strengths = "Strong academic performance with high scores"
    elif avg_score and avg_score >= 70:
        strengths = "Solid understanding of core concepts"

    improvements = "No data yet"
    if avg_score and avg_score < 70:
        improvements = "Needs additional support in core concepts"
    elif avg_score and avg_score < 85:
        improvements = "Could benefit from more practice on challenging topics"
    elif avg_score:
        improvements = "Continue pursuing advanced topics"

    return StudentAnalysis(
        student_id=student.id,
        student_name=student.name,
        total_assignments=len(assignments),
        graded_assignments=len(graded),
        average_score=avg_score,
        grades=grades,
        attendance_rate=attendance_rate,
        strengths=strengths,
        areas_for_improvement=improvements,
    )


# ── Helper functions for demo lesson generation ────────────────────────────────

def _generate_lesson_plan(subject: str, grade: str, title: str, duration: int) -> str:
    return f"""# Demo Lesson Plan: {title}
**Subject:** {subject} | **Grade Level:** {grade} | **Duration:** {duration} minutes

## Learning Objectives
- Students will understand the key concepts of {title.lower()}
- Students will be able to apply learned concepts independently
- Students will demonstrate comprehension through guided practice

## Lesson Structure

### Opening (5 minutes)
- Welcome students and introduce the topic
- Quick review of prior knowledge
- State today's learning objectives

### Direct Instruction ({duration // 3} minutes)
- Present key concepts with examples
- Use visual aids and demonstrations
- Check for understanding with quick questions

### Guided Practice ({duration // 3} minutes)
- Work through problems/activities together
- Provide scaffolded support
- Address misconceptions in real-time

### Independent Practice ({duration // 4} minutes)
- Students work on assigned problems/tasks independently
- Teacher circulates to provide individual support

### Closing (5 minutes)
- Summarize key takeaways
- Preview next lesson
- Assign any homework or follow-up work

## Assessment
- Informal: Observation during guided/independent practice
- Formal: Completed practice worksheet or exit ticket
"""


def _generate_student_instructions(subject: str, title: str) -> str:
    return f"""# Student Instructions: {title}

Hello students! Your teacher is out today, but we have an exciting lesson prepared for you.

## What You'll Learn
Today we're working on **{title}** in {subject}.

## What To Do
1. Read through the materials provided below
2. Complete the practice problems or activities
3. If you get stuck, review the examples first
4. Write down any questions you have for your teacher

## Rules
- Stay on task and work quietly
- Help your classmates if they're stuck (but don't give answers!)
- Raise your hand if you need the substitute's help
- Submit your completed work before the end of class

## Remember
Your teacher will review your work when they return. Do your best!
"""


def _generate_materials_list(subject: str, grade: str) -> str:
    return f"""# Materials Needed

## For the Teacher/Substitute
- This lesson plan document
- Student instruction handout
- Answer key (see attached)
- Whiteboard/projector access

## For Students
- Notebook or lined paper
- Pencil/pen
- {subject} textbook (if applicable)
- Calculator (if applicable for {grade})
- Any handouts provided

## Digital Resources
- Classroom presentation slides
- Online practice links (if applicable)
- Student portal access for submissions
"""
