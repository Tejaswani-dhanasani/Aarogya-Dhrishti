-- Table 50 of 58: tbl_patient_contact_history

CREATE TABLE tbl_patient_contact_history (               -- APPEND-ONLY
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID NOT NULL REFERENCES tbl_patients(id),
    task_id      UUID REFERENCES tbl_followup_tasks(id),
    contacted_by UUID NOT NULL REFERENCES tbl_users(id),
    channel      contact_channel NOT NULL,
    outcome      contact_outcome NOT NULL,
    notes        TEXT,
    contacted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_contact_patient         ON tbl_patient_contact_history (patient_id, contacted_at DESC);

-- triggers
CREATE TRIGGER trg_tbl_patient_contact_history_append_only BEFORE UPDATE OR DELETE ON tbl_patient_contact_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
