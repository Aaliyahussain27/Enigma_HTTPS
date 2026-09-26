from fastapi import APIRouter, Path
from pydantic import BaseModel
import uuid
from typing import List, Optional

router = APIRouter(
    prefix="/estates",
    tags=["estates"]
)

@router.get("/{estate_id}/estate-map")
def get_estate_map(estate_id: uuid.UUID = Path(...)):
    # Stub response matching the spec for hour 1
    return {
        "estate_id": str(estate_id),
        "deceased_name": "Ramesh Kumar", # Mocked
        "summary": {
            "assets_found": 3,
            "critical_tasks_remaining": 5,
            "estimated_total_value": 7500000,
            "avg_claim_timeline_days": 30
        },
        "assets": [
            {
                "id": str(uuid.uuid4()),
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
