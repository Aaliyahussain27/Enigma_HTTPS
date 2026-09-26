import uuid
from sqlalchemy import Column, String, BigInteger, Boolean, ForeignKey, Numeric, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True))

class Estate(Base):
    __tablename__ = 'estates'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    deceased_name = Column(String)
    pathway_used = Column(String)
    status = Column(String, default='active')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EstateMember(Base):
    __tablename__ = 'estate_members'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(UUID(as_uuid=True), ForeignKey('estates.id', ondelete='CASCADE'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    role = Column(String)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    access_revoked_at = Column(DateTime(timezone=True))

class Asset(Base):
    __tablename__ = 'assets'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(UUID(as_uuid=True), ForeignKey('estates.id', ondelete='CASCADE'))
    category = Column(String, nullable=False)
    institution_name = Column(String)
    reference_number = Column(String)
    estimated_value = Column(Numeric)
    urgency = Column(String)
    claim_deadline = Column(Date)
    status = Column(String, default='discovered')
    next_step_text = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Document(Base):
    __tablename__ = 'documents'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(UUID(as_uuid=True), ForeignKey('estates.id', ondelete='CASCADE'))
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id', ondelete='SET NULL'))
    uploaded_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    doc_type = Column(String)
    s3_key = Column(String, nullable=False)
    file_name_original = Column(String)
    mime_type = Column(String)
    size_bytes = Column(BigInteger)
    ocr_extracted_json = Column(JSONB)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class RequiredDocument(Base):
    __tablename__ = 'required_documents'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id', ondelete='CASCADE'))
    doc_type = Column(String, nullable=False)
    is_satisfied = Column(Boolean, default=False)
    satisfied_by_document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'))

class AuditLog(Base):
    __tablename__ = 'audit_log'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    estate_id = Column(UUID(as_uuid=True))
    actor_user_id = Column(UUID(as_uuid=True))
    action = Column(String, nullable=False)
    metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
