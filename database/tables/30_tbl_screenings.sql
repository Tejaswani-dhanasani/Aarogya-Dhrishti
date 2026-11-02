-- Table 30 of 58: tbl_screenings

CREATE TABLE tbl_screenings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES tbl_patients(id),
    examiner_id       UUID NOT NULL REFERENCES tbl_users(id),
    facility_id       BIGINT NOT NULL REFERENCES mst_facilities(id),
    screening_site_id BIGINT REFERENCES mst_screening_sites(id),
    screening_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    case_state        case_state NOT NULL DEFAULT 'DRAFT',
    consent_id        UUID,
    tobacco_current   BOOLEAN,
    chief_complaint   TEXT,
    notes             TEXT,
    version           INT NOT NULL DEFAULT 1,
    idempotency_key   TEXT,
    client_created_at TIMESTAMPTZ,                        -- device time for offline drafts
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, patient_id),
    UNIQUE (examiner_id, idempotency_key),
    FOREIGN KEY (consent_id, patient_id) REFERENCES tbl_patient_consents (id, patient_id),  -- same patient only
    CONSTRAINT ck_consent_gate CHECK (case_state = 'DRAFT' OR consent_id IS NOT NULL)
);

-- indexes
CREATE INDEX idx_screenings_patient      ON tbl_screenings (patient_id, screening_date DESC);
CREATE INDEX idx_screenings_facility     ON tbl_screenings (facility_id, case_state);
CREATE INDEX idx_screenings_examiner     ON tbl_screenings (examiner_id);

-- triggers
CREATE TRIGGER trg_tbl_screenings_updated_at BEFORE UPDATE ON tbl_screenings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_screening_state BEFORE UPDATE OF case_state ON tbl_screenings
    FOR EACH ROW EXECUTE FUNCTION fn_check_case_transition();
