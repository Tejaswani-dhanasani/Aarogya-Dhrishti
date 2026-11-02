-- Table 42 of 58: tbl_hospital_appointments

CREATE TABLE tbl_hospital_appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id         UUID NOT NULL REFERENCES tbl_referrals(id),
    hospital_id         BIGINT NOT NULL REFERENCES mst_hospitals(id),
    specialty_id        BIGINT NOT NULL REFERENCES mst_specialties(id),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status_id           BIGINT NOT NULL REFERENCES mst_appointment_statuses(id),
    attendance          attendance_status NOT NULL DEFAULT 'PENDING',
    clinician_outcome   TEXT,
    outcome_recorded_by UUID REFERENCES tbl_users(id),
    booked_by           UUID NOT NULL REFERENCES tbl_users(id),
    rescheduled_from_id UUID REFERENCES tbl_hospital_appointments(id),
    idempotency_key     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (booked_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_appt_referral           ON tbl_hospital_appointments (referral_id);
CREATE INDEX idx_appt_sched              ON tbl_hospital_appointments (scheduled_at, status_id);

-- triggers
CREATE TRIGGER trg_tbl_hospital_appointments_updated_at BEFORE UPDATE ON tbl_hospital_appointments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
