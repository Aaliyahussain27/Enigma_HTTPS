"""
backend/documents/router.py
----------------------------
Document upload and retrieval endpoints.

POST /{estate_id}/documents
  - Saves file to disk (s3_key = local path, Phase A)
  - Creates a Document row with status="processing"
  - Dispatches run_document_analysis Celery task
  - Returns 202 Accepted immediately (no more HTTP timeout risk)

GET  /{estate_id}/documents
  - Returns all documents with their current status field so the frontend
    can render: "processing" -> spinner, "completed" -> success, "failed" -> alert

GET  /{estate_id}/documents/{document_id}/explain
  - Unchanged – Gemini explain call (fast, synchronous is fine here)
"""

import json
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Document, Estate
from backend.auth.dependencies import require_estate_access
from backend.classification.ask import explain_document_with_gemini
from backend.tasks.document_tasks import run_document_analysis

router = APIRouter(prefix="/estates", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{estate_id}/documents", status_code=202)
async def upload_document(
    estate_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    membership=Depends(require_estate_access),
):
    """
    Accepts a file, persists it, queues Gemini OCR, and returns immediately.
    Poll GET /documents to observe the processing -> completed | failed transition.
    """
    existing = db.query(Document).filter(
        Document.estate_id == estate_id,
        Document.file_name_original == file.filename,
    ).first()

    if existing:
        if existing.status == "failed":
            db.delete(existing)
            db.commit()
        else:
            raise HTTPException(
                status_code=400,
                detail="A document with this filename already exists for this estate.",
            )

    file_path = os.path.join(UPLOAD_DIR, f"{estate_id}_{file.filename}")
    file_bytes = await file.read()
    with open(file_path, "wb") as fh:
        fh.write(file_bytes)

    doc = Document(
        estate_id=estate_id,
        uploaded_by_user_id=membership.user_id,
        s3_key=file_path,
        file_name_original=file.filename,
        mime_type=file.content_type,
        size_bytes=str(len(file_bytes)),
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    run_document_analysis.apply_async(
        args=[str(doc.id)],
        queue="documents",
    )

    return {
        "message": "Document upload accepted. Analysis is running in the background.",
        "document_id": str(doc.id),
        "status": "processing",
    }

@router.get("/{estate_id}/documents")
def list_documents(
    estate_id: UUID,
    db: Session = Depends(get_db),
    membership=Depends(require_estate_access),
):
    """
    Returns all documents for the estate.
    The `status` field ("processing" | "completed" | "failed") lets the
    frontend render a spinner, success badge, or error alert accordingly.
    `processing_error` is populated only when status == "failed".
    """
    documents = (
        db.query(Document)
        .filter(Document.estate_id == estate_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )

    return [
        {
            "id": str(doc.id),
            "name": doc.file_name_original or doc.s3_key.split("/")[-1],
            "status": doc.status,                    
            "processing_error": doc.processing_error,  
            "asset_id": str(doc.asset_id) if doc.asset_id else None,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "summary": None,
        }
        for doc in documents
    ]

@router.get("/{estate_id}/documents/{document_id}/explain")
def explain_document(
    estate_id: UUID,
    document_id: UUID,
    db: Session = Depends(get_db),
    membership=Depends(require_estate_access),
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.estate_id == estate_id,
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status == "processing":
        raise HTTPException(
            status_code=409,
            detail="Document analysis is still in progress. Please retry shortly.",
        )

    if document.status == "failed":
        raise HTTPException(
            status_code=422,
            detail=f"Document analysis failed: {document.processing_error or 'Unknown error'}",
        )

    if not document.ocr_extracted_json:
        raise HTTPException(status_code=409, detail="This document has not been analyzed yet")

    try:
        explanation = explain_document_with_gemini(document.ocr_extracted_json)
        return explanation.model_dump()
    except Exception as e:
        message = str(e)
        print(f"Document explanation failed: {message}")
        status_code = (
            503
            if any(m in message.lower() for m in ("503", "unavailable", "high demand", "rate limit", "429"))
            else 500
        )
        detail = (
            "Gemini is temporarily unavailable. Please retry in a moment."
            if status_code == 503
            else "We couldn't explain this document right now."
        )
        raise HTTPException(status_code=status_code, detail=detail)
