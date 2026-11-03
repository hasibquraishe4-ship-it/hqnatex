from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[UUID] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class PasswordSetup(BaseModel):
    token: str
    new_password: str
