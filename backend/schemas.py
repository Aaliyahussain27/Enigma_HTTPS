from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    jwt: str
    refresh_token: str

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    phone: Optional[str]
    full_name: str
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Estate Schemas ---
class EstateCreate(BaseModel):
    deceased_name: str
    pathway_used: str

class EstateResponse(BaseModel):
    id: UUID
    owner_user_id: UUID
    deceased_name: Optional[str]
    pathway_used: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    role: Optional[str] = None # Added via logic in endpoint

    class Config:
        from_attributes = True

# --- Member Schemas ---
class EstateMemberCreate(BaseModel):
    email: EmailStr
    role: str

class EstateMemberResponse(BaseModel):
    id: UUID
    estate_id: UUID
    user_id: UUID
    role: str
    invited_at: datetime
    access_revoked_at: Optional[datetime]

    class Config:
        from_attributes = True
