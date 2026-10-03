from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta
from pathlib import Path
import hashlib

from backend.database import get_db
from backend.models import User, Estate, EstateMember, Asset, Document, RequiredDocument, ClosureSchedule, Tombstone
from backend.schemas import EstateCreate, EstateResponse, EstateMemberCreate, EstateMemberResponse
from backend.auth.dependencies import get_current_user, require_owner, require_estate_access

router = APIRouter(prefix="/estates", tags=["estates"])

@router.post("", response_model=EstateResponse, status_code=status.HTTP_201_CREATED)
def create_estate(estate_in: EstateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        new_estate = Estate(
            owner_user_id=current_user.id,
            deceased_name=estate_in.deceased_name,
            pathway_used=estate_in.pathway_used
        )
        db.add(new_estate)
        db.flush() 

        new_member = EstateMember(
            estate_id=new_estate.id,
            user_id=current_user.id,
            role="owner"
        )
        db.add(new_member)
        db.commit()
        db.refresh(new_estate)
        
        response = EstateResponse.model_validate(new_estate)
        response.role = "owner"
        return response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[EstateResponse])
def list_estates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(EstateMember).filter(
        EstateMember.user_id == current_user.id,
        EstateMember.access_revoked_at == None
    ).all()
    
    estate_ids = [m.estate_id for m in memberships]
    role_map = {m.estate_id: m.role for m in memberships}
    
    estates = db.query(Estate).filter(Estate.id.in_(estate_ids)).all()
    
    results = []
    for estate in estates:
        res = EstateResponse.model_validate(estate)
        res.role = role_map.get(estate.id)
        results.append(res)
    return results

@router.post("/{estate_id}/members", response_model=EstateMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(estate_id: UUID, member_in: EstateMemberCreate, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    valid_roles = ["owner", "executor", "lawyer", "accountant", "viewer"]
    if member_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    target_user = db.query(User).filter(User.email == member_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found. Please ask them to create an account first.")
    
    existing_membership = db.query(EstateMember).filter(
        EstateMember.estate_id == estate_id,
        EstateMember.user_id == target_user.id,
        EstateMember.access_revoked_at == None
    ).first()
    
    if existing_membership:
        raise HTTPException(status_code=400, detail="User is already an active member of this estate")
    
    new_member = EstateMember(
        estate_id=estate_id,
        user_id=target_user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.delete("/{estate_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_member(estate_id: UUID, user_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    if membership.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own access. Transfer ownership first.")
    
    target_membership = db.query(EstateMember).filter(
        EstateMember.estate_id == estate_id,
        EstateMember.user_id == user_id,
        EstateMember.access_revoked_at == None
    ).first()
    
    if not target_membership:
        raise HTTPException(status_code=404, detail="Active membership not found")

    target_membership.access_revoked_at = datetime.now(timezone.utc)
    db.commit()
    
from backend.models import User, Estate, EstateMember, Asset, Document, RequiredDocument
from pydantic import BaseModel
import json
from backend.classification.ask import answer_estate_question

@router.get("/{estate_id}/estate-map")
def get_estate_map(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    documents = db.query(Document).filter(Document.estate_id == estate_id).all()
    
    total_val = 0.0
    for a in assets:
        if a.estimated_value:
            try:
                total_val += float(a.estimated_value)
            except ValueError:
                pass
    
    action_items = [a for a in assets if a.category == 'action_item']
    pending_actions = len(action_items)
    
    req_docs = db.query(RequiredDocument).join(Asset).filter(Asset.estate_id == estate_id).all()
    missing_docs = len([r for r in req_docs if r.is_satisfied == 'false'])
    
    masked_assets = []
    for a in assets:
        ref = a.reference_number
        if ref and len(ref) > 4:
            ref = "XXXX" + ref[-4:]
            
        a_reqs = [r for r in req_docs if r.asset_id == a.id]
        
        masked_assets.append({
            "id": str(a.id),
            "category": a.category,
            "institution_name": a.institution_name,
            "urgency": a.urgency,
            "status": a.status,
            "next_step_text": a.next_step_text,
            "estimated_value": a.estimated_value,
            "reference_number": ref,
            "documents": [
                {
                    "id": str(document.id),
                    "name": document.file_name_original or document.s3_key.split("/")[-1],
                    "status": "Uploaded"
                }
                for document in documents if document.asset_id == a.id
            ],
            "requirements": [
                {"id": str(r.id), "doc_type": r.doc_type, "is_satisfied": r.is_satisfied == 'true'}
                for r in a_reqs
            ]
        })

    return {
        "estate_id": str(estate_id),
        "deceased_name": estate.deceased_name,
        "summary": {
            "assets_found": len(assets) - pending_actions,
            "critical_tasks_remaining": pending_actions,
            "documents_needed": missing_docs,
            "estimated_total_value": total_val,
            "avg_claim_timeline_days": 30
        },
        "assets": masked_assets,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/{estate_id}/report")
def get_estate_report(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    requirements = db.query(RequiredDocument).join(Asset).filter(Asset.estate_id == estate_id).all()
    report_assets = []
    report_actions = []

    for asset in assets:
        if asset.category == "action_item":
            report_actions.append({
                "title": asset.next_step_text,
                "institution": asset.institution_name,
                "urgency": asset.urgency,
                "status": asset.status,
            })
            continue
        report_assets.append({
            "category": asset.category,
            "institution": asset.institution_name,
            "estimated_value": asset.estimated_value,
            "status": asset.status,
            "next_step": asset.next_step_text,
            "requirements": [
                {"name": req.doc_type, "complete": req.is_satisfied == "true"}
                for req in requirements if req.asset_id == asset.id
            ],
        })

    total_value = 0.0
    for asset in assets:
        if asset.category != "action_item" and asset.estimated_value:
            try:
                total_value += float(asset.estimated_value)
            except (TypeError, ValueError):
                continue
    return {
        "estate_id": str(estate_id),
        "deceased_name": estate.deceased_name,
        "status": estate.status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "asset_count": len(report_assets),
            "action_count": len(report_actions),
            "estimated_total_value": total_value,
            "requirements_remaining": sum(1 for req in requirements if req.is_satisfied != "true"),
        },
        "assets": report_assets,
        "actions": report_actions,
    }

class ReqToggle(BaseModel):
    is_satisfied: bool

@router.patch("/{estate_id}/assets/{asset_id}/requirements/{req_id}")
def toggle_requirement(estate_id: UUID, asset_id: UUID, req_id: UUID, toggle: ReqToggle, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    req = db.query(RequiredDocument).filter(RequiredDocument.id == req_id, RequiredDocument.asset_id == asset_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    req.is_satisfied = 'true' if toggle.is_satisfied else 'false'
    db.commit()
    return {"status": "success"}


class AssetStatusUpdate(BaseModel):
    status: str


class ClosureScheduleRequest(BaseModel):
    scheduled_for: datetime
    confirm_text: str
    deletion_reason: str = "User requested estate deletion"


class ClosureRescheduleRequest(BaseModel):
    scheduled_for: datetime
    confirm_text: str


def _validate_deletion_request(scheduled_for: datetime, confirm_text: str):
    if confirm_text != "DELETE":
        raise HTTPException(status_code=400, detail="Type DELETE to confirm permanent estate deletion.")
    if scheduled_for.tzinfo is None:
        scheduled_for = scheduled_for.replace(tzinfo=timezone.utc)
    minimum = datetime.now(timezone.utc) + timedelta(days=1)
    if scheduled_for < minimum:
        raise HTTPException(status_code=400, detail="Deletion must be scheduled at least one day in the future.")
    return scheduled_for


def _schedule_payload(schedule: ClosureSchedule | None):
    if not schedule:
        return None
    return {
        "id": str(schedule.id),
        "scheduled_for": schedule.scheduled_for.isoformat(),
        "status": schedule.status,
        "deletion_reason": schedule.deletion_reason,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
        "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None,
    }


def _execute_estate_deletion(estate_id: UUID, db: Session, reason: str):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    if not estate:
        raise HTTPException(status_code=404, detail="Estate not found")

    documents = db.query(Document).filter(Document.estate_id == estate_id).all()
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    asset_ids = [asset.id for asset in assets]
    required_documents = db.query(RequiredDocument).filter(RequiredDocument.asset_id.in_(asset_ids)).all() if asset_ids else []
    members = db.query(EstateMember).filter(EstateMember.estate_id == estate_id).all()
    owner_hash = hashlib.sha256(str(estate.owner_user_id).encode()).hexdigest()

    for document in documents:
        if document.s3_key:
            Path(document.s3_key).unlink(missing_ok=True)
    upload_dir = Path("uploads")
    if upload_dir.exists():
        for path in upload_dir.glob(f"{estate_id}_*"):
            path.unlink(missing_ok=True)

    db.query(RequiredDocument).filter(RequiredDocument.asset_id.in_(asset_ids)).update(
        {RequiredDocument.satisfied_by_document_id: None}, synchronize_session=False
    ) if asset_ids else None
    for required_document in required_documents:
        db.delete(required_document)
    for document in documents:
        db.delete(document)
    for asset in assets:
        db.delete(asset)
    for member in members:
        db.delete(member)
    schedule = db.query(ClosureSchedule).filter(ClosureSchedule.estate_id == estate_id).first()
    if schedule:
        db.delete(schedule)

    tombstone = Tombstone(
        estate_id_hash=owner_hash,
        deletion_job_id=str(uuid4()),
        deletion_reason=reason,
        documents_deleted=str(len(documents)),
        required_documents_deleted=str(len(required_documents)),
        assets_deleted=str(len(assets)),
        members_deleted=str(len(members)),
    )
    db.delete(estate)
    db.flush()
    db.add(tombstone)
    db.commit()
    return tombstone


@router.post("/{estate_id}/closure/schedule")
def schedule_estate_deletion(estate_id: UUID, request: ClosureScheduleRequest, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    scheduled_for = _validate_deletion_request(request.scheduled_for, request.confirm_text)
    existing = db.query(ClosureSchedule).filter(ClosureSchedule.estate_id == estate_id).first()
    if existing and existing.status not in ("cancelled", "executed"):
        raise HTTPException(status_code=409, detail="A deletion schedule already exists for this estate.")

    if existing:
        db.delete(existing)
    schedule = ClosureSchedule(
        estate_id=estate_id,
        requested_by_user_id=membership.user_id,
        scheduled_for=scheduled_for,
        deletion_reason=request.deletion_reason,
        status="scheduled",
    )
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    estate.status = "closing"
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return _schedule_payload(schedule)


@router.patch("/{estate_id}/closure/schedule")
def reschedule_estate_deletion(estate_id: UUID, request: ClosureRescheduleRequest, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    scheduled_for = _validate_deletion_request(request.scheduled_for, request.confirm_text)
    schedule = db.query(ClosureSchedule).filter(ClosureSchedule.estate_id == estate_id).first()
    if not schedule or schedule.status != "scheduled":
        raise HTTPException(status_code=404, detail="Active deletion schedule not found")
    schedule.scheduled_for = scheduled_for
    db.commit()
    db.refresh(schedule)
    return _schedule_payload(schedule)


@router.delete("/{estate_id}/closure/schedule")
def cancel_estate_deletion(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    schedule = db.query(ClosureSchedule).filter(ClosureSchedule.estate_id == estate_id).first()
    if not schedule or schedule.status != "scheduled":
        raise HTTPException(status_code=404, detail="Active deletion schedule not found")
    schedule.status = "cancelled"
    schedule.cancelled_at = datetime.now(timezone.utc)
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    estate.status = "active"
    db.commit()
    return {"status": "cancelled"}


@router.post("/{estate_id}/closure/delete-now")
def delete_estate_now(estate_id: UUID, request: ClosureScheduleRequest, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    if request.confirm_text != "DELETE":
        raise HTTPException(status_code=400, detail="Type DELETE to confirm permanent estate deletion.")
    tombstone = _execute_estate_deletion(estate_id, db, request.deletion_reason)
    return {
        "status": "executed",
        "tombstone_id": str(tombstone.id),
        "documents_deleted": int(tombstone.documents_deleted),
        "assets_deleted": int(tombstone.assets_deleted),
    }


def _closure_state(estate_id: UUID, db: Session) -> dict:
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    requirements = db.query(RequiredDocument).join(Asset).filter(Asset.estate_id == estate_id).all()
    pending_actions = [asset for asset in assets if asset.category == "action_item" and asset.status != "done"]
    pending_requirements = [requirement for requirement in requirements if requirement.is_satisfied != "true"]
    return {
        "ready": not pending_actions and not pending_requirements,
        "pending_actions": len(pending_actions),
        "pending_documents": len(pending_requirements),
    }


@router.get("/{estate_id}/closure")
def get_closure_state(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    state = _closure_state(estate_id, db)
    schedule = db.query(ClosureSchedule).filter(ClosureSchedule.estate_id == estate_id).first()
    return {"estate_id": str(estate_id), "status": estate.status, "schedule": _schedule_payload(schedule), **state}


@router.post("/{estate_id}/closure")
def close_estate(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    state = _closure_state(estate_id, db)
    if not state["ready"]:
        raise HTTPException(status_code=409, detail="Complete all actions and required documents before closing the estate.")
    estate.status = "closed"
    db.commit()
    return {"estate_id": str(estate_id), "status": estate.status, "ready": True}


@router.get("/{estate_id}/documents")
def list_documents(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    documents = db.query(Document).filter(Document.estate_id == estate_id).order_by(Document.uploaded_at.desc()).all()

    payload = []
    for doc in documents:
        payload.append({
            "id": str(doc.id),
            "name": doc.file_name_original or doc.s3_key.split("/")[-1],
            "status": "Uploaded",
            "asset_id": str(doc.asset_id) if doc.asset_id else None,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "summary": None,
        })
    return payload


@router.patch("/{estate_id}/assets/{asset_id}")
def update_asset_status(estate_id: UUID, asset_id: UUID, payload: AssetStatusUpdate, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.estate_id == estate_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    normalized = payload.status.strip().lower()
    status_map = {
        "action needed": "discovered",
        "needs attention": "discovered",
        "action_needed": "discovered",
        "in progress": "in_progress",
        "in_progress": "in_progress",
        "done": "done",
        "completed": "done",
        "discovered": "discovered",
    }

    asset.status = status_map.get(normalized, normalized or asset.status)
    db.commit()
    db.refresh(asset)
    return {"id": str(asset.id), "status": asset.status}

class AskRequest(BaseModel):
    question: str

@router.post("/{estate_id}/ask")
def ask_estate_question(estate_id: UUID, req: AskRequest, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    context = []
    for a in assets:
        context.append(f"Category: {a.category}, Institution: {a.institution_name}, Value: {a.estimated_value}, Status: {a.status}, Action: {a.next_step_text}")
    
    try:
        answer = answer_estate_question(req.question, "\n".join(context))
        return {"answer": answer.answer}
    except Exception as e:
        message = str(e)
        print(f"Estate Q&A failed: {message}")
        status_code = 503 if any(marker in message.lower() for marker in ("503", "unavailable", "high demand", "rate limit", "429")) else 500
        detail = "Gemini is temporarily unavailable. Please retry in a moment." if status_code == 503 else "AI could not process your request at this time."
        raise HTTPException(status_code=status_code, detail=detail)
