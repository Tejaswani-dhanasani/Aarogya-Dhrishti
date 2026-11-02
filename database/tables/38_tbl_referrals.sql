-- Table 38 of 58: tbl_referrals

CREATE TABLE tbl_referrals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id        UUID NOT NULL REFERENCES tbl_clinical_reviews(id),
    patient_id       UUID NOT NULL REFERENCES tbl_patients(id),
    from_facility_id BIGINT NOT NULL REFERENCES mst_facilities(id),
    to_hospital_id   BIGINT NOT NULL REFERENCES mst_hospitals(id),
    specialty_id     BIGINT NOT NULL REFERENCES mst_specialties(id),
    priority_id      BIGINT NOT NULL REFERENCES mst_referral_priorities(id),
    status           referral_status NOT NULL DEFAULT 'PLANNED',
    reason           TEXT,
    created_by       UUID NOT NULL REFERENCES tbl_users(id),
    idempotency_key  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (created_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_referrals_patient       ON tbl_referrals (patient_id);
CREATE INDEX idx_referrals_hospital      ON tbl_referrals (to_hospital_id, status);
CREATE INDEX idx_referrals_review        ON tbl_referrals (review_id);

-- triggers
CREATE TRIGGER trg_tbl_referrals_updated_at BEFORE UPDATE ON tbl_referrals
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_referral_author_role BEFORE INSERT ON tbl_referrals
    FOR EACH ROW EXECUTE FUNCTION fn_require_role('created_by', 'MEDICAL_OFFICER');
