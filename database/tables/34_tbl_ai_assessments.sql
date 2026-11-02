-- Table 34 of 58: tbl_ai_assessments

CREATE TABLE tbl_ai_assessments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_code            TEXT NOT NULL UNIQUE,        -- e.g. DEMO-AI-009
    photo_id                 UUID NOT NULL REFERENCES tbl_screening_photos(id),
    ai_model_id              BIGINT NOT NULL REFERENCES mst_ai_models(id),
    status                   ai_status NOT NULL DEFAULT 'QUEUED',
    research_label           TEXT,                        -- e.g. suspicious_example
    score                    NUMERIC(5,4) CHECK (score BETWEEN 0 AND 1),   -- NOT a probability of cancer
    clinical_use             BOOLEAN NOT NULL DEFAULT FALSE CHECK (clinical_use = FALSE),
    requires_clinician_review BOOLEAN NOT NULL DEFAULT TRUE CHECK (requires_clinician_review),
    warning                  TEXT NOT NULL DEFAULT 'NOT FOR CLINICAL USE',
    requested_by             UUID NOT NULL REFERENCES tbl_users(id),
    requested_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at             TIMESTAMPTZ
);

-- indexes
CREATE INDEX idx_ai_photo                ON tbl_ai_assessments (photo_id);
