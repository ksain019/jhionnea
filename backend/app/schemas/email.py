from datetime import datetime

from pydantic import BaseModel


class EmailRuleCreate(BaseModel):
    name: str
    rule_type: str  # keep, delete, archive, label
    condition_field: str  # from, subject, body, label
    condition_value: str


class EmailRuleResponse(BaseModel):
    id: int
    name: str
    rule_type: str
    condition_field: str
    condition_value: str
    is_active: bool
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EmailLogResponse(BaseModel):
    id: int
    email_from: str
    email_subject: str
    action_taken: str
    rule_id: int | None
    reason: str | None
    processed_at: datetime
    created_by: int

    model_config = {"from_attributes": True}


class EmailAnalyzeRequest(BaseModel):
    emails: list[dict]  # list of {from, subject, body, labels}
