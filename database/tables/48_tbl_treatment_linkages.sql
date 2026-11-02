-- Table 48 of 58: tbl_treatment_linkages

CREATE TABLE tbl_treatment_linkages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id         UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id          UUID NOT NULL REFERENCES tbl_patients(id),
    pathology_review_id UUID REFERENCES tbl_pathology_reviews(id),
    hospital_id         BIGINT REFERENCES mst_hospitals(id),
    linkage_type        TEXT NOT NULL CHECK (linkage_type IN
                          ('SURGERY','RADIOTHERAPY','CHEMOTHERAPY','PALLIATIVE','OBSERVATION','OTHER')),
    status              linkage_status NOT NULL DEFAULT 'PLANNED',
    planned_date        DATE,
    linked_by           UUID NOT NULL REFERENCES tbl_users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_treatment_referral      ON tbl_treatment_linkages (referral_id);

-- triggers
CREATE TRIGGER trg_tbl_treatment_linkages_updated_at BEFORE UPDATE ON tbl_treatment_linkages
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
