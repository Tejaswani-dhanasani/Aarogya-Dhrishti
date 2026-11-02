-- Table 44 of 58: tbl_investigation_orders

CREATE TABLE tbl_investigation_orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id           UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id            UUID NOT NULL REFERENCES tbl_patients(id),
    investigation_type_id BIGINT NOT NULL REFERENCES mst_investigation_types(id),
    status_id             BIGINT NOT NULL REFERENCES mst_investigation_statuses(id),
    hospital_id           BIGINT REFERENCES mst_hospitals(id),
    ordered_by            UUID NOT NULL REFERENCES tbl_users(id),
    ordered_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date              DATE,
    idempotency_key       TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ordered_by, idempotency_key)
);

-- indexes
CREATE INDEX idx_inv_orders_referral     ON tbl_investigation_orders (referral_id);
CREATE INDEX idx_inv_orders_patient      ON tbl_investigation_orders (patient_id);

-- triggers
CREATE TRIGGER trg_tbl_investigation_orders_updated_at BEFORE UPDATE ON tbl_investigation_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
