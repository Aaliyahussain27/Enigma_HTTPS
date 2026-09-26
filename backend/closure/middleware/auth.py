"""
EstateClear — Closure & Legacy Service

Authentication and authorization middleware.

This module enforces the permission matrix from the spec (Section 15.11):

| Action                          | Owner | Executor | Lawyer | Accountant | Viewer |
|---------------------------------|-------|----------|--------|------------|--------|
| Export PDF                      |  ✅   |   ✅     |  ✅    |    ✅      |  ✅    |
| View deletion schedule          |  ✅   |   ✅     |  ✅    |    ✅      |  ✅    |
| Create/modify/cancel schedule   |  ✅   |   ❌     |  ❌    |    ❌      |  ❌    |
| Trigger immediate deletion      |  ✅   |   ❌     |  ❌    |    ❌      |  ❌    |

All permission checks are enforced SERVER-SIDE — never rely on frontend
hiding buttons alone.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models.db_models import Estate, EstateMember
from ..schemas.closure_schemas import CurrentUser, EstateMembership

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """
    Decode and validate the JWT token from the Authorization header.
    Returns the authenticated user's identity.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        full_name = payload.get("full_name", "")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )

        return CurrentUser(
            user_id=UUID(user_id),
            email=email,
            full_name=full_name,
        )
    except JWTError as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
        )


async def get_estate_membership(
    estate_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EstateMembership:
    """
    Verify the current user is a member of the specified estate
    and return their role. Raises 403 if not a member or access revoked.
    """
    result = await db.execute(
        select(EstateMember).where(
            EstateMember.estate_id == estate_id,
            EstateMember.user_id == current_user.user_id,
            EstateMember.access_revoked_at.is_(None),
        )
    )
    member = result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this estate.",
        )

    return EstateMembership(
        user_id=current_user.user_id,
        estate_id=estate_id,
        role=member.role,
    )


def require_owner(membership: EstateMembership = Depends(get_estate_membership)):
    """
    Dependency that enforces OWNER-ONLY access.
    Used for: create/modify/cancel deletion schedule, trigger immediate deletion.
    """
    if membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the estate owner can perform this action. "
                "Your current role is: " + membership.role
            ),
        )
    return membership


def require_any_member(membership: EstateMembership = Depends(get_estate_membership)):
    """
    Dependency that allows any estate member (any role).
    Used for: export PDF, view deletion schedule status, list exports.
    """
    return membership


async def get_estate_or_404(
    estate_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Estate:
    """Fetch the estate or raise 404. Also checks for tombstone (deleted estate)."""
    result = await db.execute(select(Estate).where(Estate.id == estate_id))
    estate = result.scalar_one_or_none()

    if estate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This estate was not found. It may have been cleared.",
        )

    return estate


async def get_active_estate_or_error(
    estate_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Estate:
    """
    Fetch the estate and verify it hasn't already been closed/deleted.
    Raises 409 Conflict if estate status is 'closed'.
    """
    estate = await get_estate_or_404(estate_id, db)

    if estate.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This estate has already been closed and its data cleared. "
                "This action cannot be performed."
            ),
        )

    return estate
