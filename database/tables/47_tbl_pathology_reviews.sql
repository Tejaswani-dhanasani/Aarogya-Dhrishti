-- Table 47 of 58: tbl_pathology_reviews

CREATE TABLE tbl_pathology_reviews (                     -- diagnosis is ENTERED BY A CLINICIAN, never by AI
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id          UUID NOT NULL REFERENCES tbl_pathology_reports(id),
    reviewer_id        UUID NOT NULL REFERENCES tbl_users(id),
    diagnosis_text     TEXT NOT NULL,
    diagnosis_category diagnosis_category NOT NULL,
    signed_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_path_reviews_report     ON tbl_pathology_reviews (report_id);

-- triggers
CREATE TRIGGER trg_pathology_reviewer_role BEFORE INSERT OR UPDATE ON tbl_pathology_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('reviewer_id', 'MEDICAL_OFFICER,SPECIALIST');
