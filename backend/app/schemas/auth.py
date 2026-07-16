from pydantic import BaseModel, Field


class TokenPair(BaseModel):
    # Login/refresh set HttpOnly cookies; SPA receives empty strings in the body.
    access_token: str = ""
    refresh_token: str = ""
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    department: str | None = None
    is_active: bool
    is_manager: bool
    roles: list[str] = []
    permissions: list[str] = []

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class MessageOut(BaseModel):
    ok: bool = True
    detail: str | None = None
