-- Table 35 of 58: tbl_ai_assessment_logs

CREATE TABLE tbl_ai_assessment_logs (                    -- APPEND-ONLY, no image content / PHI
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES tbl_ai_assessments(id),
    event         TEXT NOT NULL,                          -- QUEUED / CALLED / TIMEOUT / FAILED / COMPLETED
    http_status   INT,
    latency_ms    INT CHECK (latency_ms >= 0),
    error_code    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_ai_logs_assessment      ON tbl_ai_assessment_logs (assessment_id);

-- triggers
CREATE TRIGGER trg_tbl_ai_assessment_logs_append_only BEFORE UPDATE OR DELETE ON tbl_ai_assessment_logs
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
