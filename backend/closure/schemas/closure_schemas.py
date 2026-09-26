"""
EstateClear — Closure & Legacy Service

Pydantic schemas for request/response validation across all closure endpoints.
"""

from datetime import datetime, date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════════════════════
# PDF EXPORT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════


class ExportPdfRequest(BaseModel):
    """Request body for POST /estates/{estate_id}/export-pdf."""

    include_documents_appendix: bool = Field(
        default=False,
        description=(
            "If true, includes a documents appendix listing uploaded file "
            "metadata. Does NOT embed original files by default."
        ),
    )
    email_to_all_members: bool = Field(
        default=False,
        description="If true, emails a download link to all estate members.",
    )


class ExportPdfResponse(BaseModel):
    """Response for POST /estates/{estate_id}/export-pdf (202 Accepted)."""

    export_job_id: str


class ExportJobStatusResponse(BaseModel):
    """Response for GET /estates/{estate_id}/export-pdf/{job_id}/status."""

    status: str = Field(description="One of: processing, ready, failed")
    download_url: Optional[str] = Field(
        default=None,
        description="Signed S3 URL, 15-minute expiry. Present only when status='ready'.",
    )


class ExportRecord(BaseModel):
    """A past PDF export, returned by GET /estates/{estate_id}/exports."""

    id: UUID
    estate_id: UUID
    file_size_bytes: Optional[int] = None
    include_appendix: bool = False
    download_expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ExportListResponse(BaseModel):
    """Response for GET /estates/{estate_id}/exports."""

    exports: List[ExportRecord]


# ═══════════════════════════════════════════════════════════════════════════════
# DELETION SCHEDULING SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════


class ScheduleCreateRequest(BaseModel):
    """
    Request body for POST /estates/{estate_id}/closure/schedule.

    The confirm_text field must be exactly "DELETE" (case-sensitive).
    This is deliberately friction-heavy — irreversibility must be loud.
    """

    retention_choice: str = Field(
        description="One of: 7_days, 30_days, 90_days, 180_days, custom"
    )
    custom_date: Optional[date] = Field(
        default=None,
        description=(
            "Required when retention_choice is 'custom'. "
            "Must be >= tomorrow and <= 2 years from now."
        ),
    )
    confirm_text: str = Field(
        description='Must be exactly "DELETE" (case-sensitive).'
    )

    @field_validator("retention_choice")
    @classmethod
    def validate_retention_choice(cls, v: str) -> str:
        valid = {"7_days", "30_days", "90_days", "180_days", "custom"}
        if v not in valid:
            raise ValueError(
                f"retention_choice must be one of {valid}, got '{v}'"
            )
        return v

    @field_validator("confirm_text")
    @classmethod
    def validate_confirm_text(cls, v: str) -> str:
        if v != "DELETE":
            raise ValueError(
                'confirm_text must be exactly "DELETE" (case-sensitive). '
                "This confirmation is required to schedule permanent deletion."
            )
        return v


class ScheduleRescheduleRequest(BaseModel):
    """Request body for PATCH /estates/{estate_id}/closure/schedule."""

    retention_choice: str
    custom_date: Optional[date] = None

    @field_validator("retention_choice")
    @classmethod
    def validate_retention_choice(cls, v: str) -> str:
        valid = {"7_days", "30_days", "90_days", "180_days", "custom"}
        if v not in valid:
            raise ValueError(
                f"retention_choice must be one of {valid}, got '{v}'"
            )
        return v


class ScheduleResponse(BaseModel):
    """Response for schedule create/update operations."""

    id: UUID
    estate_id: UUID
    retention_choice: str
    deletion_scheduled_at: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeleteNowRequest(BaseModel):
    """
    Request body for POST /estates/{estate_id}/closure/delete-now.
    Same strict confirmation as scheduling.
    """

    confirm_text: str

    @field_validator("confirm_text")
    @classmethod
    def validate_confirm_text(cls, v: str) -> str:
        if v != "DELETE":
            raise ValueError(
                'confirm_text must be exactly "DELETE" (case-sensitive). '
                "This confirmation is required for immediate, permanent deletion."
            )
        return v


class DeleteNowResponse(BaseModel):
    """Response for POST /estates/{estate_id}/closure/delete-now (202 Accepted)."""

    deletion_job_id: str
    message: str = (
        "Deletion has been initiated. You will receive a confirmation "
        "once all data has been permanently cleared."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TOMBSTONE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════


class TombstoneResponse(BaseModel):
    """
    Returned when a user navigates to a deleted estate.
    Contains NO PII — only the deletion timestamp and reason.
    """

    original_estate_id: UUID
    deleted_at: datetime
    deletion_reason: str
    message: str = (
        "This estate's data was cleared as requested. "
        "If you need anything from it, check your downloaded PDF "
        "or your email confirmation."
    )

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# SHARED / AUTH SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════


class CurrentUser(BaseModel):
    """Decoded JWT payload representing the authenticated user."""

    user_id: UUID
    email: str
    full_name: str


class EstateMembership(BaseModel):
    """The current user's role within an estate."""

    user_id: UUID
    estate_id: UUID
    role: str  # owner | executor | lawyer | accountant | viewer


class ErrorResponse(BaseModel):
    """Standard error response body."""

    detail: str


class MessageResponse(BaseModel):
    """Simple success message response."""

    message: str
