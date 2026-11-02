-- Table 51 of 58: tbl_transport_support_records

CREATE TABLE tbl_transport_support_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID REFERENCES tbl_followup_tasks(id),
    referral_id      UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id       UUID NOT NULL REFERENCES tbl_patients(id),
    from_village_id  BIGINT REFERENCES mst_villages(id),
    to_hospital_id   BIGINT REFERENCES mst_hospitals(id),
    travel_date      DATE,
    mode             TEXT,
    status           transport_status NOT NULL DEFAULT 'REQUESTED',
    amount_inr       NUMERIC(10,2) CHECK (amount_inr >= 0),
    arranged_by      UUID REFERENCES tbl_users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_transport_referral      ON tbl_transport_support_records (referral_id);

-- triggers
CREATE TRIGGER trg_tbl_transport_support_records_updated_at BEFORE UPDATE ON tbl_transport_support_records
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
