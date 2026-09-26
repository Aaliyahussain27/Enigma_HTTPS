"""
EstateClear — Closure & Legacy Service

S3 operations for the document vault and closure exports buckets.

Two buckets:
  - estateclear-vault: Primary encrypted document storage (owned by Document Service,
    but this module deletes from it during estate closure).
  - estateclear-closure-exports: Generated PDF exports (owned by this module).
    Has a 30-day S3 Lifecycle Rule for defense-in-depth auto-expiry.

Storage conventions:
  - Vault:   s3://estateclear-vault/{estate_id}/{document_id}/{filename}
  - Exports: s3://estateclear-closure-exports/{estate_id}/{export_id}.pdf
"""

import logging
from typing import List, Optional
from uuid import UUID

import aioboto3

from ..config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Async S3 operations for vault and exports buckets."""

    def __init__(self):
        self._session = aioboto3.Session(
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

    # ── Upload ────────────────────────────────────────────────────────────

    async def upload_pdf(
        self,
        estate_id: UUID,
        export_id: UUID,
        pdf_bytes: bytes,
    ) -> str:
        """
        Upload a generated PDF to the closure-exports bucket.
        Returns the S3 key.
        """
        s3_key = f"{estate_id}/{export_id}.pdf"
        async with self._session.client("s3") as s3:
            await s3.put_object(
                Bucket=settings.s3_exports_bucket,
                Key=s3_key,
                Body=pdf_bytes,
                ContentType="application/pdf",
                ServerSideEncryption="aws:kms",
            )
        logger.info("Uploaded PDF export: s3://%s/%s", settings.s3_exports_bucket, s3_key)
        return s3_key

    # ── Download URL ──────────────────────────────────────────────────────

    async def generate_signed_download_url(
        self,
        s3_key: str,
        bucket: Optional[str] = None,
        expiry_seconds: Optional[int] = None,
    ) -> str:
        """Generate a pre-signed download URL for a file in S3."""
        bucket = bucket or settings.s3_exports_bucket
        expiry = expiry_seconds or settings.s3_signed_url_expiry_seconds

        async with self._session.client("s3") as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": s3_key},
                ExpiresIn=expiry,
            )
        return url

    # ── Bulk delete (used by deletion pipeline) ──────────────────────────

    async def delete_estate_vault_files(self, estate_id: UUID) -> int:
        """
        Delete ALL files for an estate from the primary vault bucket.
        Uses the estate_id prefix for a clean bulk delete.

        Returns the number of objects deleted.
        Idempotent: does not error if objects are already gone.
        """
        return await self._delete_prefix(
            bucket=settings.s3_vault_bucket,
            prefix=f"{estate_id}/",
            label="vault",
        )

    async def delete_estate_export_files(self, estate_id: UUID) -> int:
        """
        Delete ALL PDF exports for an estate from the closure-exports bucket.

        Returns the number of objects deleted.
        Idempotent: does not error if objects are already gone.
        """
        return await self._delete_prefix(
            bucket=settings.s3_exports_bucket,
            prefix=f"{estate_id}/",
            label="exports",
        )

    async def verify_prefix_empty(self, estate_id: UUID, bucket: str) -> bool:
        """Verify that no objects exist under the estate's prefix."""
        async with self._session.client("s3") as s3:
            response = await s3.list_objects_v2(
                Bucket=bucket,
                Prefix=f"{estate_id}/",
                MaxKeys=1,
            )
            count = response.get("KeyCount", 0)
            if count > 0:
                logger.warning(
                    "Prefix %s/ in bucket %s still has objects after deletion",
                    estate_id,
                    bucket,
                )
                return False
            return True

    # ── Internal helpers ──────────────────────────────────────────────────

    async def _delete_prefix(self, bucket: str, prefix: str, label: str) -> int:
        """
        List and batch-delete all objects under a prefix.
        S3 DeleteObjects supports up to 1000 keys per call.
        Idempotent — does not error on already-deleted objects.
        """
        total_deleted = 0

        async with self._session.client("s3") as s3:
            # Paginate through all objects under the prefix
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                contents = page.get("Contents", [])
                if not contents:
                    continue

                # Batch delete (max 1000 per call)
                objects_to_delete = [{"Key": obj["Key"]} for obj in contents]
                response = await s3.delete_objects(
                    Bucket=bucket,
                    Delete={"Objects": objects_to_delete, "Quiet": True},
                )

                errors = response.get("Errors", [])
                if errors:
                    logger.error(
                        "S3 batch delete errors in %s bucket: %s",
                        label,
                        errors,
                    )
                    raise RuntimeError(
                        f"Failed to delete {len(errors)} objects from {label} bucket"
                    )

                total_deleted += len(objects_to_delete)

        logger.info(
            "Deleted %d objects from %s bucket (prefix: %s)",
            total_deleted,
            label,
            prefix,
        )
        return total_deleted


# Module-level singleton
s3_service = S3Service()
