from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
import os
import shutil
import json

from backend.database import get_db
from backend.models import User, Estate, Document, Asset
from backend.auth.dependencies import require_estate_access
from backend.classification.service import process_pdf

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
    # Check for duplicates based on original file name for demo
    existing = db.query(Document).filter(
        Document.estate_id == estate_id,
        Document.file_name_original == file.filename
    ).first()
    
    if existing:
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
    
    # Process PDF OCR and Classification
    extracted_data = process_pdf(file_path)
    if extracted_data:
        doc.ocr_extracted_json = json.dumps(extracted_data)
        
        # Create asset
        asset = Asset(
            estate_id=estate_id,
            category=extracted_data.get('category'),
            institution_name=extracted_data.get('institution_name'),
            reference_number=extracted_data.get('reference_number'),
            estimated_value=extracted_data.get('estimated_value'),
            urgency=extracted_data.get('urgency', 'important'),
            next_step_text=extracted_data.get('next_step_text', 'Review asset details')
        )
        db.add(asset)
        db.flush()
        
        doc.asset_id = asset.id
        
        # If extra actions are returned (like Sunrise loan), we can store them in DB 
        # For simplicity, we just add them as separate 'action' assets or handle it in estate-map
        if 'extra_actions' in extracted_data:
            for action in extracted_data['extra_actions']:
                a = Asset(
                    estate_id=estate_id,
                    category="action_item",
                    institution_name=extracted_data.get('institution_name'),
                    next_step_text=action['title'],
                    urgency=action['urgency']
                )
                db.add(a)
                
        db.commit()
        
    return {"message": "Document processed", "document_id": doc.id}
