from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import json

from closure.database import get_db
from closure.core.auth import get_estate_membership, EstateMembership
from closure.models.db_models import Document

router = APIRouter(tags=["classification"])

@router.post("/internal/classify")
async def classify_document(document_id: UUID, s3_key: str, db: AsyncSession = Depends(get_db)):
    """
    Internal endpoint triggered async after upload.
    Runs OCR -> document type classifier -> structured extraction -> writes to DB.
    """
    # 1. Fetch the document record
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2. OCR (Optical Character Recognition)
    # In a real environment, you would download the image from S3 and pass it to Google Cloud Vision
    # e.g., vision_client.document_text_detection(image=vision.Image(content=file_bytes))
    extracted_text = "MOCK_OCR_TEXT: HDFC Life Insurance Policy. Account No: 123456789. Amount: Rs 5,000,000"
    
    # 3. Document Type Classifier & LLM Structured Extraction
    # In a real environment, you would pass `extracted_text` to an LLM like Gemini or OpenAI
    # to categorize it and pull out the relevant structured fields.
    doc_type = "life_insurance_policy"
    extracted_json = {
        "institution_name": "HDFC Life",
        "reference_number": "123456789", # Note: Spec says to encrypt this PII field later
        "estimated_value": 5000000,
        "category": "life_insurance"
    }
    
    # 4. Update Document Record in Database
    doc.doc_type = doc_type
    doc.ocr_extracted_json = extracted_json
    await db.commit()

    return {
        "status": "processing_complete",
        "doc_type": doc_type,
        "extracted_data": extracted_json
    }

@router.post("/internal/match")
async def match_documents_to_asset(db: AsyncSession = Depends(get_db)):
    """Fuzzy-matches related documents to an asset (e.g. policy + claim form -> same asset)"""
    # TODO: Implement fuzzy matching logic (e.g., matching reference_number across documents)
    return {"matched_count": 0}

@router.get("/estates/{estate_id}/estate-map")
async def get_estate_map(
    estate_id: UUID,
    db: AsyncSession = Depends(get_db),
    membership: EstateMembership = Depends(get_estate_membership)
):
    """
    THE core dashboard payload.
    This is the exact contract Section 15's PDF renderer consumes.
    """
    return {
        "estate_id": str(estate_id),
        "deceased_name": "John Doe",
        "summary": {
            "assets_found": 3,
            "critical_tasks_remaining": 5,
            "estimated_total_value": 7500000,
            "avg_claim_timeline_days": 30
        },
        "assets": [
            {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "category": "life_insurance",
                "institution_name": "HDFC Life",
                "urgency": "critical",
                "claim_deadline": "2026-10-26",
                "estimated_value": 5000000,
                "status": "docs_pending",
                "next_step_text": "Submit claim form to HDFC branch, Bandra",
                "required_documents": [
                    { "doc_type": "policy_document", "is_satisfied": True },
                    { "doc_type": "death_certificate", "is_satisfied": True },
                    { "doc_type": "id_proof", "is_satisfied": False },
                    { "doc_type": "claim_form", "is_satisfied": False }
                ]
            }
        ],
        "generated_at": "2026-09-26T10:00:00Z"
    }
