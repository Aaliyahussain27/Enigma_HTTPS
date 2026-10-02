import uuid
import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from botocore.exceptions import ClientError

from closure.database import get_db
from closure.core.auth import get_estate_membership, EstateMembership
from closure.config import settings
from closure.models.db_models import Document

router = APIRouter(prefix="/estates/{estate_id}/documents", tags=["documents"])

# Initialize S3 Client (assuming AWS credentials are in your environment or config)
s3_client = boto3.client(
    's3',
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key
)

@router.post("")
async def upload_document(
    estate_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    membership: EstateMembership = Depends(get_estate_membership)
):
    """
    Upload a document to the estate vault (S3).
    Storage convention: s3://estateclear-vault/{estate_id}/{document_id}/{original_filename}
    """
    document_id = uuid.uuid4()
    s3_key = f"{str(estate_id)}/{str(document_id)}/{file.filename}"
    
    try:
        # 1. Upload to S3
        s3_client.upload_fileobj(
            file.file,
            settings.s3_vault_bucket,
            s3_key,
            ExtraArgs={"ContentType": file.content_type}
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 Upload failed: {str(e)}")
        
    # Get file size
    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    
    # 2. Save to Database
    new_doc = Document(
        id=document_id,
        estate_id=estate_id,
        uploaded_by_user_id=membership.user_id,
        s3_key=s3_key,
        file_name_original=file.filename,
        mime_type=file.content_type,
        size_bytes=size_bytes
    )
    db.add(new_doc)
    await db.commit()
    
    # Note: In a real architecture, you'd trigger a background job here 
    # (like BullMQ or arq) to call the Classification Service for OCR asynchronously.
    
    return {
        "message": "Document uploaded successfully",
        "document_id": document_id,
        "s3_key": s3_key
    }

@router.get("")
async def list_documents(
    estate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: EstateMembership = Depends(get_estate_membership)
):
    """List all documents for the estate"""
    result = await db.execute(select(Document).where(Document.estate_id == estate_id))
    documents = result.scalars().all()
    return {"documents": documents}

@router.get("/{document_id}/download")
async def download_document(
    estate_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: EstateMembership = Depends(get_estate_membership)
):
    """Generate a signed URL for secure download (5 min expiry)"""
    result = await db.execute(select(Document).where(Document.id == document_id, Document.estate_id == estate_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.s3_vault_bucket, 'Key': doc.s3_key},
            ExpiresIn=300 # 5 minutes
        )
        return {"download_url": url}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Could not generate URL: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    estate_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: EstateMembership = Depends(get_estate_membership)
):
    """Remove a single document"""
    result = await db.execute(select(Document).where(Document.id == document_id, Document.estate_id == estate_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        s3_client.delete_object(Bucket=settings.s3_vault_bucket, Key=doc.s3_key)
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Could not delete from S3: {str(e)}")
        
    await db.delete(doc)
    await db.commit()
    
    return status.HTTP_204_NO_CONTENT
