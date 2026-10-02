import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class Estate(Base):
    __tablename__ = "estates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    deceased_name = Column(String, nullable=True)
    pathway_used = Column(String, nullable=True) # 'asset_guide','asset_map','mixed'
    status = Column(String, default="active") # 'active','closing','closed'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class EstateMember(Base):
    __tablename__ = "estate_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String, nullable=False) # 'owner','executor','lawyer','accountant','viewer'
    invited_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    access_revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_active_member", "estate_id", "user_id", postgresql_where=text("access_revoked_at IS NULL")),
    )

class Asset(Base):
    __tablename__ = "assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id", ondelete="CASCADE"))
    category = Column(String, nullable=False)
    institution_name = Column(String, nullable=True)
    reference_number = Column(String, nullable=True)
    estimated_value = Column(String, nullable=True) # or Numeric. Kept as string to avoid schema issues, will parse in python
    urgency = Column(String, nullable=True)
    claim_deadline = Column(String, nullable=True)
    status = Column(String, default="discovered")
    next_step_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id", ondelete="CASCADE"))
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    doc_type = Column(String, nullable=True)
    s3_key = Column(String, nullable=False)
    file_name_original = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(String, nullable=True)
    ocr_extracted_json = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class RequiredDocument(Base):
    __tablename__ = "required_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"))
    doc_type = Column(String, nullable=False)
    is_satisfied = Column(String, default="false")
    satisfied_by_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)


class ClosureSchedule(Base):
    __tablename__ = "closure_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    estate_id = Column(UUID(as_uuid=True), ForeignKey("estates.id", ondelete="CASCADE"), unique=True, nullable=False)
    requested_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="scheduled", nullable=False)
    deletion_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)


class Tombstone(Base):
    __tablename__ = "tombstones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    estate_id_hash = Column(String, nullable=False, index=True)
    deletion_job_id = Column(String, nullable=False, unique=True)
    deletion_reason = Column(String, nullable=True)
    documents_deleted = Column(String, default="0")
    required_documents_deleted = Column(String, default="0")
    assets_deleted = Column(String, default="0")
    members_deleted = Column(String, default="0")
    deleted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

