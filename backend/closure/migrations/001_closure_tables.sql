-- ============================================================================
-- EstateClear — Closure & Legacy Module
-- Migration 001: Create closure_schedules, estate_exports, tombstones tables
-- 
-- Prerequisites: The core schema must already exist (users, estates, 
-- estate_members, assets, documents, required_documents, audit_log).
-- This migration adds the three tables owned by the Closure Service.
--
-- Run: psql -d estateclear -f 001_closure_tables.sql
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. closure_schedules
-- Tracks the deletion schedule for an estate. At most one row per estate (1:1).
-- The hourly reminder-scan job queries this table to advance reminder status
-- and fire notifications. The hourly deletion-executor queries it to find
-- schedules whose deletion_scheduled_at has passed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS closure_schedules (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id             UUID        UNIQUE NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    scheduled_by_user_id  UUID        NOT NULL REFERENCES users(id),
    retention_choice      TEXT        NOT NULL
                                      CHECK (retention_choice IN (
                                          '7_days', '30_days', '90_days', '180_days', 'custom'
                                      )),
    deletion_scheduled_at TIMESTAMPTZ NOT NULL,
    status                TEXT        NOT NULL DEFAULT 'scheduled'
                                      CHECK (status IN (
                                          'scheduled',
                                          'reminder_sent_7d',
                                          'reminder_sent_1d',
                                          'reminder_sent_1h',
                                          'cancelled',
                                          'executed',
                                          'failed'
                                      )),
    cancelled_at          TIMESTAMPTZ,
    cancelled_by_user_id  UUID        REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the hourly reminder-scan job: find schedules that are still
-- active (not cancelled/executed/failed) and approaching their deletion date.
CREATE INDEX IF NOT EXISTS idx_closure_schedules_active_deletion
    ON closure_schedules (deletion_scheduled_at)
    WHERE status NOT IN ('cancelled', 'executed', 'failed');

-- Index for the hourly deletion-executor job: find schedules whose
-- deletion_scheduled_at has passed and status indicates readiness.
CREATE INDEX IF NOT EXISTS idx_closure_schedules_due_for_deletion
    ON closure_schedules (deletion_scheduled_at)
    WHERE status IN ('scheduled', 'reminder_sent_7d', 'reminder_sent_1d', 'reminder_sent_1h');

COMMENT ON TABLE closure_schedules IS
    'Tracks the deletion schedule for an estate. One row per estate at most. '
    'The status column advances through reminder stages before reaching executed.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. estate_exports
-- Every PDF export event. Stores metadata only — the actual PDF bytes live in
-- the S3 estateclear-closure-exports bucket and are subject to a 30-day
-- lifecycle expiry (defense in depth).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estate_exports (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id             UUID        NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    requested_by_user_id  UUID        NOT NULL REFERENCES users(id),
    export_s3_key         TEXT        NOT NULL,
    file_size_bytes       BIGINT,
    include_appendix      BOOLEAN     NOT NULL DEFAULT false,
    emailed_to            JSONB,      -- list of member emails it was sent to, if any
    download_expires_at   TIMESTAMPTZ NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing exports by estate (the GET /estates/:id/exports endpoint).
CREATE INDEX IF NOT EXISTS idx_estate_exports_by_estate
    ON estate_exports (estate_id, created_at DESC);

COMMENT ON TABLE estate_exports IS
    'Metadata for every PDF export of an estate map. The PDF file itself lives '
    'in S3 (estateclear-closure-exports bucket) and expires after 30 days.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. tombstones
-- The permanent, PII-free record that survives deletion. Contains NO documents,
-- NO financial figures, NO user names — only aggregate counts and a one-way
-- hash of the owner's user_id for privacy-safe traceability.
--
-- Note: original_estate_id is NOT a foreign key because the estates row it
-- references will have been deleted by the time this row is inserted.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tombstones (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    original_estate_id          UUID        NOT NULL,
    owner_user_id_hash          TEXT        NOT NULL,
    assets_count_at_deletion    INT         NOT NULL DEFAULT 0,
    documents_count_at_deletion INT         NOT NULL DEFAULT 0,
    members_count_at_deletion   INT         NOT NULL DEFAULT 0,
    pdf_was_exported            BOOLEAN     NOT NULL DEFAULT false,
    deletion_reason             TEXT        NOT NULL
                                             CHECK (deletion_reason IN (
                                                 'scheduled_auto',
                                                 'user_initiated_early',
                                                 'admin_compliance_request'
                                             )),
    deleted_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deletion_job_id             TEXT
);

-- Index for ops/compliance lookups by original estate ID.
CREATE INDEX IF NOT EXISTS idx_tombstones_by_estate
    ON tombstones (original_estate_id);

-- Index for compliance queries by deletion date range.
CREATE INDEX IF NOT EXISTS idx_tombstones_by_deleted_at
    ON tombstones (deleted_at);

COMMENT ON TABLE tombstones IS
    'Permanent, PII-free audit record proving an estate''s data was deleted. '
    'Contains only aggregate counts and a hashed owner reference. '
    'This table is deliberately minimal — it must not become a second copy '
    'of the sensitive data it certifies the destruction of.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. System audit log table (estate-agnostic)
-- For recording system-level events that must survive estate deletion.
-- The per-estate audit_log is deleted with the estate; this one persists.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_audit_log (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT        NOT NULL,
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_by_type
    ON system_audit_log (event_type, created_at DESC);

COMMENT ON TABLE system_audit_log IS
    'Estate-agnostic system audit stream. Deletion confirmations and tombstone '
    'references are written here because the per-estate audit_log table is '
    'deleted along with the estate during closure.';

COMMIT;
