from fastapi import APIRouter
from pydantic import BaseModel
import uuid

router = APIRouter(
    prefix="/internal",
    tags=["classification"]
)

class ClassificationRequest(BaseModel):
    document_id: uuid.UUID
    s3_key: str

@router.post("/classify")
def classify_document(req: ClassificationRequest):
    # Mock OCR and classification
    # In a real app, this would use Google Cloud Vision and update DB
    mock_result = {
        "doc_type": "life_insurance_policy",
        "ocr_extracted_json": {
            "policy_number": "POL-987654321",
            "institution": "LIC",
            "sum_assured": 5000000
        }
    }
    return {"message": "Classification complete", "result": mock_result}

class MatchRequest(BaseModel):
    document_id: uuid.UUID
    asset_id: uuid.UUID

@router.post("/match")
def match_document(req: MatchRequest):
    # Mock fuzzy matching
    return {"message": "Document matched to asset", "matched": True}
