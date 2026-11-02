-- Table 29 of 58: tbl_patient_consents

CREATE TABLE tbl_patient_consents (                      -- APPEND-ONLY: withdrawal = new row, granted=false
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES tbl_patients(id),
    purpose_id      BIGINT NOT NULL REFERENCES mst_consent_purposes(id),
    language_id     BIGINT NOT NULL REFERENCES mst_languages(id),
    consent_version TEXT NOT NULL,
    granted         BOOLEAN NOT NULL,
    captured_by     UUID NOT NULL REFERENCES tbl_users(id),
    witness_name    TEXT,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, patient_id)
);

-- indexes
CREATE INDEX idx_consents_patient        ON tbl_patient_consents (patient_id, purpose_id, captured_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_patient_consents_append_only BEFORE UPDATE OR DELETE ON tbl_patient_consents
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
