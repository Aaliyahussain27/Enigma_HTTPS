"""
EstateClear — Closure & Legacy Service

SQLAlchemy ORM models for the three tables this module owns:
  - closure_schedules
  - estate_exports
  - tombstones

Also includes read-only model references for tables owned by other services
(estates, estate_members, assets, documents, users, audit_log) so this
module can query them without modifying their schema.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


# ═══════════════════════════════════════════════════════════════════════════════
# TABLES OWNED BY THIS MODULE
# ═══════════════════════════════════════════════════════════════════════════════


class ClosureSchedule(Base):
    """
    Tracks the deletion schedule for an estate. At most one row per estate.
    The status column advances through reminder stages before reaching 'executed'.
    """

    __tablename__ = "closure_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(
        UUID(as_uuid=True),
        ForeignKey("estates.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    scheduled_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    retention_choice = Column(
        String,
        CheckConstraint(
            "retention_choice IN ('7_days','30_days','90_days','180_days','custom')"
        ),
        nullable=False,
    )
    deletion_scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        String,
        CheckConstraint(
            "status IN ('scheduled','reminder_sent_7d','reminder_sent_1d',"
            "'reminder_sent_1h','cancelled','executed','failed')"
        ),
        nullable=False,
        default="scheduled",
    )
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships (read-only references to other services' tables)
    estate = relationship("Estate", back_populates="closure_schedule", uselist=False)

    __table_args__ = (
        Index(
            "idx_closure_schedules_active_deletion",
            "deletion_scheduled_at",
            postgresql_where="status NOT IN ('cancelled', 'executed', 'failed')",
        ),
        Index(
            "idx_closure_schedules_due_for_deletion",
            "deletion_scheduled_at",
            postgresql_where=(
                "status IN ('scheduled', 'reminder_sent_7d', "
                "'reminder_sent_1d', 'reminder_sent_1h')"
            ),
        ),
    )


class EstateExport(Base):
    """
    Metadata for every PDF export of an estate map.
    The PDF file itself lives in S3 (estateclear-closure-exports bucket)
    and expires after 30 days.
    """

    __tablename__ = "estate_exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(
        UUID(as_uuid=True),
        ForeignKey("estates.id", ondelete="CASCADE"),
        nullable=False,
    )
    requested_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    export_s3_key = Column(Text, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    include_appendix = Column(Boolean, nullable=False, default=False)
    emailed_to = Column(JSONB, nullable=True)
    download_expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    estate = relationship("Estate", back_populates="exports")

    __table_args__ = (
        Index(
            "idx_estate_exports_by_estate",
            "estate_id",
            "created_at",
        ),
    )


class Tombstone(Base):
    """
    Permanent, PII-free record proving an estate's data was deleted.
    Contains only aggregate counts and a hashed owner reference.
    original_estate_id is NOT a foreign key — the estate row is gone.
    """

    __tablename__ = "tombstones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_estate_id = Column(UUID(as_uuid=True), nullable=False)
    owner_user_id_hash = Column(Text, nullable=False)
    assets_count_at_deletion = Column(Integer, nullable=False, default=0)
    documents_count_at_deletion = Column(Integer, nullable=False, default=0)
    members_count_at_deletion = Column(Integer, nullable=False, default=0)
    pdf_was_exported = Column(Boolean, nullable=False, default=False)
    deletion_reason = Column(
        String,
        CheckConstraint(
            "deletion_reason IN ('scheduled_auto','user_initiated_early',"
            "'admin_compliance_request')"
        ),
        nullable=False,
    )
    deleted_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deletion_job_id = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_tombstones_by_estate", "original_estate_id"),
        Index("idx_tombstones_by_deleted_at", "deleted_at"),
    )


class SystemAuditLog(Base):
    """Estate-agnostic system audit stream. Survives estate deletion."""

    __tablename__ = "system_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


# ═══════════════════════════════════════════════════════════════════════════════
# READ-ONLY REFERENCES TO OTHER SERVICES' TABLES
# These models mirror the core schema so this module can read/join against
# them. This module NEVER creates or migrates these tables.
# ═══════════════════════════════════════════════════════════════════════════════


class User(Base):
    """Read-only reference to the users table (owned by Auth Service)."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    phone = Column(Text, nullable=True)
    full_name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = {"extend_existing": True}


class Estate(Base):
    """Read-only reference to the estates table (owned by Claim/Estate Service)."""

    __tablename__ = "estates"

    id = Column(UUID(as_uuid=True), primary_key=True)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    deceased_name = Column(Text, nullable=True)
    pathway_used = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships used by closure module
    closure_schedule = relationship(
        "ClosureSchedule", back_populates="estate", uselist=False
    )
    exports = relationship("EstateExport", back_populates="estate")
    members = relationship("EstateMember", back_populates="estate")
    assets = relationship("Asset", back_populates="estate")
    documents = relationship("Document", back_populates="estate")
    owner = relationship("User", foreign_keys=[owner_user_id])

    __table_args__ = {"extend_existing": True}


class EstateMember(Base):
    """Read-only reference to estate_members (owned by Auth Service)."""

    __tablename__ = "estate_members"

    id = Column(UUID(as_uuid=True), primary_key=True)
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    role = Column(String, nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    access_revoked_at = Column(DateTime(timezone=True), nullable=True)

    estate = relationship("Estate", back_populates="members")
    user = relationship("User")

    __table_args__ = {"extend_existing": True}


class Asset(Base):
    """Read-only reference to assets table (owned by Claim/Estate Service)."""

    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True)
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id"))
    category = Column(Text, nullable=False)
    institution_name = Column(Text, nullable=True)
    reference_number = Column(Text, nullable=True)
    estimated_value = Column(Numeric, nullable=True)
    urgency = Column(String, nullable=True)
    claim_deadline = Column(Date, nullable=True)
    status = Column(String, default="discovered")
    next_step_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    estate = relationship("Estate", back_populates="assets")
    required_documents = relationship("RequiredDocument", back_populates="asset")

    __table_args__ = {"extend_existing": True}


class Document(Base):
    """Read-only reference to documents table (owned by Document Service)."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id"))
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    doc_type = Column(Text, nullable=True)
    s3_key = Column(Text, nullable=False)
    file_name_original = Column(Text, nullable=True)
    mime_type = Column(Text, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    ocr_extracted_json = Column(JSONB, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    estate = relationship("Estate", back_populates="documents")

    __table_args__ = {"extend_existing": True}


class RequiredDocument(Base):
    """Read-only reference to required_documents (owned by Claim/Estate Service)."""

    __tablename__ = "required_documents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"))
    doc_type = Column(Text, nullable=False)
    is_satisfied = Column(Boolean, default=False)
    satisfied_by_document_id = Column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True
    )

    asset = relationship("Asset", back_populates="required_documents")

    __table_args__ = {"extend_existing": True}


class AuditLog(Base):
    """Read-only reference to audit_log (shared across services)."""

    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True)
    estate_id = Column(UUID(as_uuid=True), nullable=True)
    actor_user_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = {"extend_existing": True}
