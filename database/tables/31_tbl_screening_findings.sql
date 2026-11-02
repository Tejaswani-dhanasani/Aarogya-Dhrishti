-- Table 31 of 58: tbl_screening_findings

CREATE TABLE tbl_screening_findings (                    -- clinician/health-worker findings (separate from AI)
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id    UUID NOT NULL REFERENCES tbl_screenings(id),
    finding_kind    finding_type NOT NULL,
    symptom_id      BIGINT REFERENCES mst_symptoms(id),
    oral_site       oral_view,
    description     TEXT,
    duration_days   INT CHECK (duration_days >= 0),
    recorded_by     UUID NOT NULL REFERENCES tbl_users(id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_finding_content CHECK (symptom_id IS NOT NULL OR description IS NOT NULL)
);

-- indexes
CREATE INDEX idx_findings_screening      ON tbl_screening_findings (screening_id);
