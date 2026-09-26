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
