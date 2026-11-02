-- Table 53 of 58: tbl_audit_logs

CREATE TABLE tbl_audit_logs (                            -- APPEND-ONLY; metadata must not contain PHI
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id      UUID REFERENCES tbl_users(id),
    actor_role    TEXT,
    event         TEXT NOT NULL,                           -- IMAGE_VIEW, REVIEW_SIGNED, DIAGNOSIS_ENTERED, PERMISSION_CHANGED ...
    resource_type TEXT NOT NULL,
    resource_id   TEXT,
    patient_id    UUID,                                    -- no FK: audit must outlive record changes
    ip_address    INET,
    request_id    TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- indexes
CREATE INDEX idx_audit_resource          ON tbl_audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_actor_time        ON tbl_audit_logs (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_patient           ON tbl_audit_logs (patient_id, occurred_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_audit_logs_append_only BEFORE UPDATE OR DELETE ON tbl_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
