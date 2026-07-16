from datetime import datetime

from pydantic import BaseModel, Field


class SoarCaseCreate(BaseModel):
    case_id: str
    title: str
    severity: str = "Medium"
    status: str = "New"
    control: str | None = None
    framework: str | None = None
    affected_asset: str | None = None
    department: str | None = None
    assigned_to: str | None = None
    owner: str | None = None
    specialization: str | None = None
    sla_state: str | None = None
    payload_json: str | None = None


class SoarCaseUpdate(BaseModel):
    title: str | None = None
    severity: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    owner: str | None = None
    sla_state: str | None = None
    archived: bool | None = None
    payload_json: str | None = None


class SoarCaseOut(BaseModel):
    id: str
    case_id: str
    title: str
    source: str
    severity: str
    status: str
    control: str | None
    framework: str | None
    affected_asset: str | None
    department: str | None
    assigned_to: str | None
    owner: str | None
    specialization: str | None
    sla_state: str | None
    archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SoarIntakeRequest(BaseModel):
    """Inbound webhook-style payload from local SOAR connector."""

    external_alert_id: str
    title: str
    severity: str = "High"
    framework: str | None = None
    control: str | None = None
    affected_asset: str | None = None
    department: str | None = None
    specialization: str = "General"
    description: str | None = None


class AiChatMessage(BaseModel):
    role: str = Field(min_length=1, max_length=32)
    content: str = Field(min_length=0, max_length=16000)


class AiChatRequest(BaseModel):
    messages: list[AiChatMessage] = Field(min_length=1, max_length=40)
    page_context: dict[str, str | None] = Field(default_factory=dict)
    conversation_id: str | None = Field(default=None, max_length=128)


class AiChatResponse(BaseModel):
    reply: str
    provider: str
    prototype: bool = True


class AdvisorSource(BaseModel):
    id: str
    title: str = ""


class AdvisorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[AiChatMessage] = Field(default_factory=list, max_length=24)
    module: str | None = Field(default=None, max_length=128)
    lang: str = "auto"
    page_context: dict[str, str | None] = Field(default_factory=dict)


class AdvisorChatResponse(BaseModel):
    reply: str
    sources: list[AdvisorSource] = Field(default_factory=list)
    grounded: bool = False
    refused: bool = False
    model: str | None = None
    provider: str = "imtithal"
    prototype: bool = False
