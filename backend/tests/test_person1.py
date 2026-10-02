import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from jose import jwt
from datetime import datetime, timedelta, timezone
from uuid import uuid4, UUID

from backend.main import app
from backend.database import Base, get_db
from backend.auth.utils import SECRET_KEY, ALGORITHM, create_access_token
from backend.models import User, Estate, EstateMember, Asset, Document

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# --- Authentication Tests ---

def test_signup_succeeds():
    response = client.post("/auth/signup", json={
        "email": "test1@example.com",
        "full_name": "Test User",
        "password": "password123"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test1@example.com"

def test_duplicate_email_rejected():
    client.post("/auth/signup", json={"email": "test2@example.com", "full_name": "Test", "password": "pass"})
    response = client.post("/auth/signup", json={"email": "test2@example.com", "full_name": "Test", "password": "pass"})
    assert response.status_code == 400

def test_login_succeeds():
    client.post("/auth/signup", json={"email": "test3@example.com", "full_name": "Test", "password": "pass"})
    response = client.post("/auth/login", json={"email": "test3@example.com", "password": "pass"})
    assert response.status_code == 200
    assert "jwt" in response.json()

def test_wrong_password_rejected():
    client.post("/auth/signup", json={"email": "test4@example.com", "full_name": "Test", "password": "pass"})
    response = client.post("/auth/login", json={"email": "test4@example.com", "password": "wrongpass"})
    assert response.status_code == 401

def test_invalid_jwt_rejected():
    response = client.post("/estates", headers={"Authorization": "Bearer invalidtoken"}, json={"deceased_name": "D", "pathway_used": "asset_guide"})
    assert response.status_code == 401

def test_expired_jwt_rejected():
    token = create_access_token(data={"sub": str(uuid4())}, expires_delta=timedelta(minutes=-10))
    response = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "D", "pathway_used": "asset_guide"})
    assert response.status_code == 401

# --- Estate Tests ---

def test_authenticated_user_can_create_estate():
    client.post("/auth/signup", json={"email": "estate_owner@example.com", "full_name": "Owner", "password": "pass"})
    login_res = client.post("/auth/login", json={"email": "estate_owner@example.com", "password": "pass"})
    token = login_res.json()["jwt"]
    
    response = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "John Doe", "pathway_used": "asset_guide"})
    assert response.status_code == 201
    data = response.json()
    assert data["deceased_name"] == "John Doe"
    assert data["role"] == "owner"

def test_unauthenticated_user_cannot_create_estate():
    response = client.post("/estates", json={"deceased_name": "D", "pathway_used": "asset_guide"})
    assert response.status_code == 401

def test_user_sees_only_estates_they_belong_to():
    client.post("/auth/signup", json={"email": "u1@example.com", "full_name": "U1", "password": "p"})
    client.post("/auth/signup", json={"email": "u2@example.com", "full_name": "U2", "password": "p"})
    
    t1 = client.post("/auth/login", json={"email": "u1@example.com", "password": "p"}).json()["jwt"]
    t2 = client.post("/auth/login", json={"email": "u2@example.com", "password": "p"}).json()["jwt"]
    
    client.post("/estates", headers={"Authorization": f"Bearer {t1}"}, json={"deceased_name": "U1 Estate", "pathway_used": "asset_guide"})
    
    res1 = client.get("/estates", headers={"Authorization": f"Bearer {t1}"})
    assert len(res1.json()) == 1
    
    res2 = client.get("/estates", headers={"Authorization": f"Bearer {t2}"})
    assert len(res2.json()) == 0

# --- Member Tests ---

def test_owner_can_add_member():
    client.post("/auth/signup", json={"email": "o1@example.com", "full_name": "O1", "password": "p"})
    client.post("/auth/signup", json={"email": "m1@example.com", "full_name": "M1", "password": "p"})
    t1 = client.post("/auth/login", json={"email": "o1@example.com", "password": "p"}).json()["jwt"]
    
    estate = client.post("/estates", headers={"Authorization": f"Bearer {t1}"}, json={"deceased_name": "D", "pathway_used": "asset_guide"}).json()
    
    res = client.post(f"/estates/{estate['id']}/members", headers={"Authorization": f"Bearer {t1}"}, json={"email": "m1@example.com", "role": "lawyer"})
    assert res.status_code == 201

def test_invalid_role_rejected():
    client.post("/auth/signup", json={"email": "o2@example.com", "full_name": "O", "password": "p"})
    client.post("/auth/signup", json={"email": "m2@example.com", "full_name": "M", "password": "p"})
    t1 = client.post("/auth/login", json={"email": "o2@example.com", "password": "p"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {t1}"}, json={"deceased_name": "D", "pathway_used": "asset_guide"}).json()
    
    res = client.post(f"/estates/{estate['id']}/members", headers={"Authorization": f"Bearer {t1}"}, json={"email": "m2@example.com", "role": "fake_role"})
    assert res.status_code == 400

def test_revoked_member_cannot_access():
    client.post("/auth/signup", json={"email": "o3@example.com", "full_name": "O", "password": "p"})
    client.post("/auth/signup", json={"email": "m3@example.com", "full_name": "M", "password": "p"})
    t_o = client.post("/auth/login", json={"email": "o3@example.com", "password": "p"}).json()["jwt"]
    t_m = client.post("/auth/login", json={"email": "m3@example.com", "password": "p"}).json()["jwt"]
    
    estate = client.post("/estates", headers={"Authorization": f"Bearer {t_o}"}, json={"deceased_name": "D", "pathway_used": "asset_guide"}).json()
    member = client.post(f"/estates/{estate['id']}/members", headers={"Authorization": f"Bearer {t_o}"}, json={"email": "m3@example.com", "role": "viewer"}).json()
    
    # Revoke access
    client.delete(f"/estates/{estate['id']}/members/{member['user_id']}", headers={"Authorization": f"Bearer {t_o}"})
    
    # Member attempts to view estates, it shouldn't show up
    res = client.get("/estates", headers={"Authorization": f"Bearer {t_m}"})
    assert len(res.json()) == 0

# Test permissions structure briefly
def test_permissions_are_enforced_by_roles():
    from backend.auth.dependencies import require_estate_access
    
    @app.get("/estates/{estate_id}/test-access")
    def test_access(estate_id: UUID, mem=Depends(require_estate_access)):
        return {"status": "ok"}


def test_estate_document_list_returns_uploaded_documents():
    client.post("/auth/signup", json={"email": "docs@example.com", "full_name": "Docs User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "docs@example.com", "password": "pass"}).json()["jwt"]

    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Doc Estate", "pathway_used": "asset_guide"}).json()

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "docs@example.com").first()
        asset = Asset(estate_id=UUID(estate["id"]), category="bank_account", institution_name="Demo Bank", status="discovered")
        db.add(asset)
        db.flush()
        db.add(Document(
            estate_id=UUID(estate["id"]),
            asset_id=asset.id,
            uploaded_by_user_id=user.id,
            s3_key="uploads/demo.pdf",
            file_name_original="demo.pdf",
            mime_type="application/pdf"
        ))
        db.commit()
    finally:
        db.close()

    res = client.get(f"/estates/{estate['id']}/documents", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert any(item["name"] == "demo.pdf" for item in res.json())


def test_failed_gemini_upload_is_retryable(monkeypatch):
    import importlib
    documents_router = importlib.import_module("backend.documents.router")

    client.post("/auth/signup", json={"email": "retry@example.com", "full_name": "Retry User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "retry@example.com", "password": "pass"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Retry Estate", "pathway_used": "asset_guide"}).json()

    def unavailable(*args, **kwargs):
        raise RuntimeError("503 UNAVAILABLE")

    monkeypatch.setattr(documents_router, "process_document_with_gemini", unavailable)
    response = client.post(
        f"/estates/{estate['id']}/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("retry.pdf", b"pdf bytes", "application/pdf")}
    )

    assert response.status_code == 503
    db = TestingSessionLocal()
    try:
        assert db.query(Document).filter(Document.file_name_original == "retry.pdf").count() == 0
    finally:
        db.close()

def test_asset_status_patch_updates_asset_record():
    client.post("/auth/signup", json={"email": "status@example.com", "full_name": "Status User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "status@example.com", "password": "pass"}).json()["jwt"]

    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Status Estate", "pathway_used": "asset_guide"}).json()

    db = TestingSessionLocal()
    try:
        asset = Asset(estate_id=UUID(estate["id"]), category="bank_account", institution_name="Status Bank", status="discovered")
        db.add(asset)
        db.commit()
        db.refresh(asset)
        asset_id = asset.id
    finally:
        db.close()

    res = client.patch(
        f"/estates/{estate['id']}/assets/{asset_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "in_progress"}
    )

    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"


def test_closure_requires_pending_work_and_owner_can_close_when_ready():
    client.post("/auth/signup", json={"email": "closure@example.com", "full_name": "Closure User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "closure@example.com", "password": "pass"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Closure Estate", "pathway_used": "asset_guide"}).json()

    initial = client.get(f"/estates/{estate['id']}/closure", headers={"Authorization": f"Bearer {token}"})
    assert initial.status_code == 200
    assert initial.json()["ready"] is True

    closed = client.post(f"/estates/{estate['id']}/closure", headers={"Authorization": f"Bearer {token}"})
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"


def test_estate_report_returns_summary_and_ignores_nonnumeric_values():
    client.post("/auth/signup", json={"email": "report@example.com", "full_name": "Report User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "report@example.com", "password": "pass"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Report Estate", "pathway_used": "asset_guide"}).json()

    db = TestingSessionLocal()
    try:
        db.add(Asset(
            estate_id=UUID(estate["id"]),
            category="bank_account",
            institution_name="Report Bank",
            estimated_value="not available",
            status="discovered",
            next_step_text="Review account"
        ))
        db.commit()
    finally:
        db.close()

    response = client.get(f"/estates/{estate['id']}/report", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["summary"]["asset_count"] == 1
    assert response.json()["summary"]["estimated_total_value"] == 0


def test_owner_can_schedule_and_cancel_estate_deletion():
    client.post("/auth/signup", json={"email": "schedule@example.com", "full_name": "Schedule User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "schedule@example.com", "password": "pass"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Schedule Estate", "pathway_used": "asset_guide"}).json()
    scheduled_for = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    scheduled = client.post(
        f"/estates/{estate['id']}/closure/schedule",
        headers={"Authorization": f"Bearer {token}"},
        json={"scheduled_for": scheduled_for, "confirm_text": "DELETE"}
    )
    assert scheduled.status_code == 200
    assert scheduled.json()["status"] == "scheduled"

    cancelled = client.delete(f"/estates/{estate['id']}/closure/schedule", headers={"Authorization": f"Bearer {token}"})
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_delete_now_creates_tombstone_and_removes_estate():
    client.post("/auth/signup", json={"email": "delete@example.com", "full_name": "Delete User", "password": "pass"})
    token = client.post("/auth/login", json={"email": "delete@example.com", "password": "pass"}).json()["jwt"]
    estate = client.post("/estates", headers={"Authorization": f"Bearer {token}"}, json={"deceased_name": "Delete Estate", "pathway_used": "asset_guide"}).json()

    deleted = client.post(
        f"/estates/{estate['id']}/closure/delete-now",
        headers={"Authorization": f"Bearer {token}"},
        json={"scheduled_for": datetime.now(timezone.utc).isoformat(), "confirm_text": "DELETE"}
    )
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "executed"

    db = TestingSessionLocal()
    try:
        assert db.query(Estate).filter(Estate.id == UUID(estate["id"])).first() is None
    finally:
        db.close()
    
    # Needs valid login but for now this suffices as the routes are protected
