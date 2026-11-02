-- Table 28 of 58: tbl_patient_medical_histories

CREATE TABLE tbl_patient_medical_histories (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES tbl_patients(id),
    exposure_type_id  BIGINT REFERENCES mst_exposure_types(id),
    condition_text    TEXT,
    duration_years    NUMERIC(4,1) CHECK (duration_years >= 0),
    frequency_per_day SMALLINT CHECK (frequency_per_day >= 0),
    is_current        BOOLEAN,
    recorded_by       UUID NOT NULL REFERENCES tbl_users(id),
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_history_has_content CHECK (exposure_type_id IS NOT NULL OR condition_text IS NOT NULL)
);

-- indexes
CREATE INDEX idx_history_patient         ON tbl_patient_medical_histories (patient_id);
