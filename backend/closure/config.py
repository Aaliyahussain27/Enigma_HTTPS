from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Closure service configuration. All values overridable via env vars."""

    service_name: str = "closure-service"
    service_port: int = 8006
    debug: bool = False
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/estateclear",
        description="Async PostgreSQL connection string",
    )

    # ── Redis ─────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    lock_timeout_seconds: int = 300  # 5 minutes for deletion lock
    lock_retry_count: int = 3
    lock_retry_delay_seconds: float = 1.0

    # ── AWS S3 ────────────────────────────────────────────────────────────
    aws_region: str = "ap-south-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    s3_vault_bucket: str = "estateclear-vault"
    s3_exports_bucket: str = "estateclear-closure-exports"
    s3_signed_url_expiry_seconds: int = 900  # 15 minutes

    # ── AWS KMS ───────────────────────────────────────────────────────────
    kms_master_key_id: Optional[str] = None

    # ── Internal service URLs (other team's services) ─────────────────────
    estate_service_url: str = "http://localhost:8003"
    auth_service_url: str = "http://localhost:8001"
    notification_service_url: str = "http://localhost:8005"
    document_service_url: str = "http://localhost:8002"

    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"

    pdf_export_expiry_days: int = 30

    deletion_max_retries: int = 5
    deletion_retry_base_delay_seconds: float = 2.0

    elasticsearch_url: str = "http://localhost:9200"
    elasticsearch_estate_index: str = "estate_documents"

    model_config = {
        "env_prefix": "CLOSURE_",
        "env_file": ".env",
        "case_sensitive": False,
    }


settings = Settings()
