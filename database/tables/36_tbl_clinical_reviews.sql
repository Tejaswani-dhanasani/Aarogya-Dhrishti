-- Table 36 of 58: tbl_clinical_reviews

CREATE TABLE tbl_clinical_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id        UUID NOT NULL UNIQUE REFERENCES tbl_screenings(id),
    doctor_id           UUID NOT NULL REFERENCES tbl_users(id),
    finding             TEXT NOT NULL,
    impression          TEXT,
    ai_assessment_id    UUID REFERENCES tbl_ai_assessments(id),
    ai_discrepancy_note TEXT,                             -- clinician may disagree with AI
    decision            review_decision,
    version             INT NOT NULL DEFAULT 1,
    signed_at           TIMESTAMPTZ,
    signature_hash      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_sign_needs_decision CHECK (signed_at IS NULL OR decision IS NOT NULL)
);

-- indexes
CREATE INDEX idx_reviews_doctor          ON tbl_clinical_reviews (doctor_id, signed_at);

-- triggers
CREATE TRIGGER trg_tbl_clinical_reviews_updated_at BEFORE UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_review_doctor_role BEFORE INSERT OR UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('doctor_id', 'MEDICAL_OFFICER');
CREATE TRIGGER trg_review_guard BEFORE UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_review_guard();
CREATE TRIGGER trg_review_snapshot AFTER INSERT OR UPDATE ON tbl_clinical_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_review_snapshot();
