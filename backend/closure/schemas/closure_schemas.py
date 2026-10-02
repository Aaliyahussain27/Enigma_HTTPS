from pydantic import BaseModel, EmailStr
from uuid import UUID

class CurrentUser(BaseModel):
    user_id: UUID
    email: EmailStr
    full_name: str

class EstateMembership(BaseModel):
    user_id: UUID
    estate_id: UUID
    role: str
