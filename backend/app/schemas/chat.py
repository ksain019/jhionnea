from datetime import datetime

from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatReply(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
