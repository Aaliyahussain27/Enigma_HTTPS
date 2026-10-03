"""
backend/tasks/document_tasks.py
--------------------------------
Celery task that runs Gemini OCR + Asset creation in the background.

Task: run_document_analysis(document_id: str)

Lifecycle
---------
1.  Fetch Document row (status == "processing")
2.  Run process_document_with_gemini() against the local file path stored
    in doc.s3_key  (Phase A uses local filesystem; swap for MinIO in Phase B)
3.  Create Asset + RequiredDocument rows from the Gemini response
4.  Set doc.status = "completed"

On any unrecoverable error:
    doc.status = "failed"
    doc.processing_error = concise message (≤500 chars)

Retry policy
------------
Transient Gemini errors (429 / 503) are retried up to MAX_RETRIES times
with exponential back-off via Celery's built-in retry mechanism *in
addition* to the 3 inline retries already present in gemini.py.
Non-transient errors immediately mark the document as failed.
"""

import json
import os
from uuid import UUID

from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from backend.celery_app import celery_app
from backend.database import SessionLocal
from backend.models import Asset, Document, RequiredDocument
from backend.classification.gemini import process_document_with_gemini

logger = get_task_logger(__name__)

_TRANSIENT_MARKERS = ("503", "unavailable", "high demand", "rate limit", "429")
MAX_RETRIES = 3


def _is_transient(exc: Exception) -> bool:
    return any(m in str(exc).lower() for m in _TRANSIENT_MARKERS)


def _get_document(db: Session, document_id: str) -> Document | None:
    return db.query(Document).filter(Document.id == UUID(document_id)).first()


def _mark_failed(db: Session, doc: Document, error: str) -> None:
    doc.status = "failed"
    doc.processing_error = str(error)[:500]
    db.commit()


@celery_app.task(
    bind=True,
    name="backend.tasks.document_tasks.run_document_analysis",
    max_retries=MAX_RETRIES,
    default_retry_delay=10,   
    acks_late=True,
)
def run_document_analysis(self, document_id: str) -> dict:
    """
    Background task: OCR a document with Gemini and persist the results.

    Parameters
    ----------
    document_id : str
        UUID string of the Document row created by the upload endpoint.
    """
    db: Session = SessionLocal()
    try:
        doc = _get_document(db, document_id)
        if not doc:
            logger.error("Document %s not found – task abandoned.", document_id)
            return {"status": "not_found", "document_id": document_id}

        if doc.status not in ("processing",):
            logger.info("Document %s already in status=%s, skipping.", document_id, doc.status)
            return {"status": doc.status, "document_id": document_id}

        logger.info("Starting Gemini analysis for document %s (file=%s)", document_id, doc.s3_key)

        mime_type = doc.mime_type or "application/pdf"
        try:
            analysis = process_document_with_gemini(doc.s3_key, mime_type)
        except Exception as exc:
            if _is_transient(exc):
                logger.warning(
                    "Transient Gemini error on document %s (attempt %d/%d): %s",
                    document_id, self.request.retries + 1, MAX_RETRIES, exc,
                )
                raise self.retry(
                    exc=exc,
                    countdown=10 * (2 ** self.request.retries),
                )
            # Non-transient – permanent failure
            logger.error("Permanent Gemini failure for document %s: %s", document_id, exc)
            _mark_failed(db, doc, str(exc))
            return {"status": "failed", "document_id": document_id, "error": str(exc)}

        extracted_data = analysis.model_dump()
        doc.ocr_extracted_json = json.dumps(extracted_data)

        amount_val = (
            analysis.amounts.outstanding_amount
            or analysis.amounts.principal_outstanding
            or analysis.amounts.opening_balance
            or analysis.amounts.closing_balance
            or analysis.amounts.policy_sum_assured
        )
        str_val = str(amount_val) if amount_val is not None else None

        # Create the primary Asset
        asset = Asset(
            estate_id=doc.estate_id,
            category=analysis.category,
            institution_name=analysis.institution_name,
            reference_number=(
                analysis.account_number
                or analysis.policy_number
                or analysis.loan_number
                or analysis.reference_number
            ),
            estimated_value=str_val,
            urgency="important" if len(analysis.actions) > 0 else "can_wait",
            next_step_text=analysis.summary,
        )
        db.add(asset)
        db.flush()  # get asset.id before linking

        doc.asset_id = asset.id

        # Required documents checklist
        for req_doc_type in analysis.required_documents:
            db.add(RequiredDocument(
                asset_id=asset.id,
                doc_type=req_doc_type,
                is_satisfied="false",
            ))

        # Action items (stored as lightweight Asset rows, same pattern as before)
        for action in analysis.actions:
            db.add(Asset(
                estate_id=doc.estate_id,
                category="action_item",
                institution_name=analysis.institution_name,
                next_step_text=action.title,
                urgency=action.priority.lower(),
            ))

        doc.status = "completed"
        db.commit()

        logger.info("Document %s analysis completed successfully.", document_id)
        return {"status": "completed", "document_id": document_id, "asset_id": str(asset.id)}

    except Exception as exc:
        # Safety net: if anything unexpected blows up after the Gemini call
        # (e.g. a DB write error) we mark the document failed and re-raise
        # so Celery logs the traceback.
        db.rollback()
        try:
            doc = _get_document(db, document_id)
            if doc:
                _mark_failed(db, doc, f"Unexpected worker error: {exc}")
        except Exception:
            pass
        logger.exception("Unexpected error processing document %s", document_id)
        raise
    finally:
        db.close()
