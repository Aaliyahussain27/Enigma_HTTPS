from datetime import date, datetime, timedelta

from backend.closure.services.closure_service import (
    ClosureService,
    build_tombstone,
    compute_reminder_schedule,
    schedule_deletion,
)


def test_schedule_deletion_uses_valid_retention_choices():
    scheduled = schedule_deletion("30_days", confirm_text="DELETE")

    assert scheduled["retention_choice"] == "30_days"
    assert scheduled["status"] == "scheduled"
    assert scheduled["deletion_scheduled_at"] > datetime.utcnow().isoformat()


def test_compute_reminder_schedule_produces_expected_windows():
    schedule = compute_reminder_schedule(
        deletion_time=datetime.utcnow() + timedelta(days=7),
        current_time=datetime.utcnow(),
    )

    assert "7d" in schedule["reminders"]
    assert "1d" in schedule["reminders"]
    assert "1h" in schedule["reminders"]


def test_build_tombstone_omits_pii_and_keeps_reason():
    tombstone = build_tombstone(
        original_estate_id="estate-123",
        owner_user_id="user-42",
        asset_count=4,
        document_count=9,
        member_count=3,
        pdf_exported=True,
        deletion_reason="user_initiated_early",
    )

    assert tombstone["original_estate_id"] == "estate-123"
    assert tombstone["deletion_reason"] == "user_initiated_early"
    assert "owner" not in tombstone
    assert "full_name" not in tombstone
    assert tombstone["pdf_was_exported"] is True


def test_closure_service_builds_pdf_export_metadata():
    export_meta = ClosureService().build_pdf_export(
        estate_id="estate-123",
        members=["owner@example.com", "executor@example.com"],
        include_appendix=True,
    )

    assert export_meta["estate_id"] == "estate-123"
    assert export_meta["include_appendix"] is True
    assert export_meta["download_url"].startswith("https://")
