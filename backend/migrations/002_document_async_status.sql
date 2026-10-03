ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS processing_error TEXT;

UPDATE documents SET status = 'completed' WHERE status = 'completed';   -- no-op, just documents intent

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
