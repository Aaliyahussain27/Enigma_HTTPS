from fastapi import APIRouter, Path, UploadFile, File, BackgroundTasks
import uuid
import os

router = APIRouter(
    tags=["documents"]
)

def upload_to_s3(file_bytes, s3_key):
    print(f"Mock S3 upload to {s3_key}")

@router.post("/estates/{estate_id}/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    estate_id: uuid.UUID = Path(...),
    file: UploadFile = File(...)
):
    document_id = uuid.uuid4()
    original_filename = file.filename
    s3_key = f"{estate_id}/{document_id}/{original_filename}"
    
    file_bytes = await file.read()
    
    upload_to_s3(file_bytes, s3_key)
    
    background_tasks.add_task(trigger_classification, document_id, s3_key)
    
    return {
        "document_id": str(document_id),
        "s3_key": s3_key
    }

@router.get("/estates/{estate_id}/documents")
def list_documents(estate_id: uuid.UUID = Path(...)):
    return [
        {
            "id": str(uuid.uuid4()),
            "estate_id": str(estate_id),
            "doc_type": "policy_document",
            "s3_key": f"{estate_id}/{uuid.uuid4()}/policy.pdf",
            "file_name_original": "policy.pdf",
            "uploaded_at": "2026-09-26T10:00:00Z"
        }
    ]

@router.get("/documents/{document_id}/download")
def get_download_url(document_id: uuid.UUID = Path(...)):
    return {
        "download_url": f"https://s3.mock.com/estateclear-vault/mock-estate-id/{document_id}/mock.pdf?signature=123&Expires=123"
    }

@router.delete("/documents/{document_id}")
def delete_document(document_id: uuid.UUID = Path(...)):
    return {"message": "Document deleted"}

def trigger_classification(document_id: uuid.UUID, s3_key: str):
    import httpx
    print(f"Triggered classification for {document_id}")
