from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from uuid import UUID

from backend.database import get_db
from backend.models import User, EstateMember
from backend.auth.utils import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_estate_membership(estate_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(EstateMember).filter(
        EstateMember.estate_id == estate_id,
        EstateMember.user_id == current_user.id,
        EstateMember.access_revoked_at == None
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Estate not found or you do not have access."
        )
    return membership

class RequireRole:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, estate_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        membership = get_estate_membership(estate_id=estate_id, current_user=current_user, db=db)
        if membership.role not in self.allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return membership

# Convenience dependencies for other services
require_owner = RequireRole(["owner"])
require_estate_access = RequireRole(["owner", "executor", "lawyer", "accountant", "viewer"])
