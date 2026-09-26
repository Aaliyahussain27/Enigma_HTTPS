from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import User, Estate, EstateMember
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
        db.flush() # flush to get the id without committing

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

@router.post("/{id}/members", response_model=EstateMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(id: UUID, member_in: EstateMemberCreate, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    valid_roles = ["owner", "executor", "lawyer", "accountant", "viewer"]
    if member_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    target_user = db.query(User).filter(User.email == member_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found. Please ask them to create an account first.")
    
    existing_membership = db.query(EstateMember).filter(
        EstateMember.estate_id == id,
        EstateMember.user_id == target_user.id,
        EstateMember.access_revoked_at == None
    ).first()
    
    if existing_membership:
        raise HTTPException(status_code=400, detail="User is already an active member of this estate")
    
    new_member = EstateMember(
        estate_id=id,
        user_id=target_user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.delete("/{id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_member(id: UUID, user_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_owner)):
    if membership.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own access. Transfer ownership first.")
    
    target_membership = db.query(EstateMember).filter(
        EstateMember.estate_id == id,
        EstateMember.user_id == user_id,
        EstateMember.access_revoked_at == None
    ).first()
    
    if not target_membership:
        raise HTTPException(status_code=404, detail="Active membership not found")
    
from backend.models import User, Estate, EstateMember, Asset, Document

@router.get("/{estate_id}/estate-map")
def get_estate_map(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    estate = db.query(Estate).filter(Estate.id == estate_id).first()
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    
    total_val = sum([float(a.estimated_value) for a in assets if a.estimated_value])
    
    actions_pending = len(assets) # simplified logic
    
    # Mask account numbers
    masked_assets = []
    for a in assets:
        ref = a.reference_number
        if ref and len(ref) > 4:
            ref = "XXXX" + ref[-4:]
        
        masked_assets.append({
            "id": str(a.id),
            "category": a.category,
            "institution_name": a.institution_name,
            "urgency": a.urgency,
            "status": a.status,
            "next_step_text": a.next_step_text,
            "estimated_value": a.estimated_value,
            "reference_number": ref
        })

    return {
        "estate_id": str(estate_id),
        "deceased_name": estate.deceased_name,
        "summary": {
            "assets_found": len(assets),
            "critical_tasks_remaining": actions_pending,
            "estimated_total_value": total_val,
            "avg_claim_timeline_days": 30
        },
        "assets": masked_assets,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
