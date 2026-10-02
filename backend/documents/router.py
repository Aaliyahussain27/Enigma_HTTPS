from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
import os
import shutil
import json

from backend.database import get_db
from backend.models import User, Estate, Document, Asset, RequiredDocument
from backend.auth.dependencies import require_estate_access
from backend.classification.gemini import process_document_with_gemini
from backend.classification.ask import explain_document_with_gemini

router = APIRouter(prefix="/estates", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{estate_id}/documents")
async def upload_document(
    estate_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    membership=Depends(require_estate_access)
):
    # Level 1 duplicate detection based on file name
    existing = db.query(Document).filter(
        Document.estate_id == estate_id,
        Document.file_name_original == file.filename
    ).first()
    
    if existing:
        try:
            previous_result = json.loads(existing.ocr_extracted_json or "{}")
        except json.JSONDecodeError:
            previous_result = {}
        if previous_result.get("status") == "ai_failed":
            db.delete(existing)
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Possible duplicate document")

    file_path = os.path.join(UPLOAD_DIR, f"{estate_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = Document(
        estate_id=estate_id,
        uploaded_by_user_id=membership.user_id,
        s3_key=file_path,
        file_name_original=file.filename,
        mime_type=file.content_type
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Process PDF OCR and Classification using Gemini
    try:
        mime_type = file.content_type if file.content_type else "application/pdf"
        analysis = process_document_with_gemini(file_path, mime_type)
        
        # Save structured output
        extracted_data = analysis.model_dump()
        doc.ocr_extracted_json = json.dumps(extracted_data)
        
        # Determine value (opening balance or principal outstanding usually, or sum assured)
        amount_val = None
        if analysis.amounts.outstanding_amount is not None:
            amount_val = analysis.amounts.outstanding_amount
        elif analysis.amounts.principal_outstanding is not None:
            amount_val = analysis.amounts.principal_outstanding
        elif analysis.amounts.opening_balance is not None:
            amount_val = analysis.amounts.opening_balance
        elif analysis.amounts.closing_balance is not None:
            amount_val = analysis.amounts.closing_balance
        elif analysis.amounts.policy_sum_assured is not None:
            amount_val = analysis.amounts.policy_sum_assured
            
        str_val = str(amount_val) if amount_val is not None else None

        # Create or Match Asset
        # In MVP we create a new asset. A fuller implementation would match against existing.
        asset = Asset(
            estate_id=estate_id,
            category=analysis.category,
            institution_name=analysis.institution_name,
            reference_number=analysis.account_number or analysis.policy_number or analysis.loan_number or analysis.reference_number,
            estimated_value=str_val,
            urgency="important" if len(analysis.actions) > 0 else "can_wait",
            next_step_text=analysis.summary
        )
        db.add(asset)
        db.flush()
        
        doc.asset_id = asset.id
        
        # Create Required Documents
        for req_doc in analysis.required_documents:
            rd = RequiredDocument(
                asset_id=asset.id,
                doc_type=req_doc,
                is_satisfied="false"
            )
            db.add(rd)
            
        # Create Actions (as action_item assets for now, or true actions if schema updated)
        for action in analysis.actions:
            a = Asset(
                estate_id=estate_id,
                category="action_item",
                institution_name=analysis.institution_name,
                next_step_text=action.title,
                urgency=action.priority.lower()
            )
            db.add(a)
                
        db.commit()
        
    except Exception as e:
        print(f"Gemini processing failed: {e}")
        db.rollback()
        failed_doc = db.query(Document).filter(Document.id == doc.id).first()
        if failed_doc:
            db.delete(failed_doc)
        db.commit()
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass
        status_code = 503 if any(marker in str(e).lower() for marker in ("503", "unavailable", "high demand", "rate limit", "429")) else 500
        raise HTTPException(status_code=status_code, detail="Gemini is temporarily unavailable. Your upload was not saved. Please retry in a moment.")
        
    return {"message": "Document analyzed successfully", "document_id": doc.id}


@router.get("/{estate_id}/documents/{document_id}/explain")
def explain_document(estate_id: UUID, document_id: UUID, db: Session = Depends(get_db), membership=Depends(require_estate_access)):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.estate_id == estate_id
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.ocr_extracted_json:
        raise HTTPException(status_code=409, detail="This document has not been analyzed yet")

    try:
        explanation = explain_document_with_gemini(document.ocr_extracted_json)
        return explanation.model_dump()
    except Exception as e:
        message = str(e)
        print(f"Document explanation failed: {message}")
        status_code = 503 if any(marker in message.lower() for marker in ("503", "unavailable", "high demand", "rate limit", "429")) else 500
        detail = "Gemini is temporarily unavailable. Please retry in a moment." if status_code == 503 else "We couldn't explain this document right now."
        raise HTTPException(status_code=status_code, detail=detail)
