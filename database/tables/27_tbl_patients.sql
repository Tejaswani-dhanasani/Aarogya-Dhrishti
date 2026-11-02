-- Table 27 of 58: tbl_patients

CREATE TABLE tbl_patients (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synthetic_code         TEXT NOT NULL UNIQUE,         -- e.g. DEMO-P-001
    full_name              TEXT NOT NULL,
    sex                    sex_type NOT NULL DEFAULT 'UNDISCLOSED',
    date_of_birth          DATE,
    age_years              SMALLINT CHECK (age_years BETWEEN 0 AND 120),
    village_id             BIGINT REFERENCES mst_villages(id),
    address_line           TEXT,
    contact_phone          TEXT,                         -- synthetic numbers only; encrypt in app layer
    preferred_language_id  BIGINT REFERENCES mst_languages(id),
    registered_facility_id BIGINT NOT NULL REFERENCES mst_facilities(id),
    registered_by          UUID NOT NULL REFERENCES tbl_users(id),
    duplicate_hint         TEXT,                         -- normalized hash for duplicate warning
    idempotency_key        TEXT,
    is_synthetic           BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic),   -- blocks real data
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT ck_patient_age_known CHECK (date_of_birth IS NOT NULL OR age_years IS NOT NULL),
    UNIQUE (registered_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_patients_facility       ON tbl_patients (registered_facility_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_village        ON tbl_patients (village_id);
CREATE INDEX idx_patients_duplicate      ON tbl_patients (duplicate_hint);

-- triggers
CREATE TRIGGER trg_tbl_patients_updated_at BEFORE UPDATE ON tbl_patients
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
