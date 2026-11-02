-- Table 49 of 58: tbl_followup_tasks

CREATE TABLE tbl_followup_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id   UUID NOT NULL REFERENCES tbl_referrals(id),
    patient_id    UUID NOT NULL REFERENCES tbl_patients(id),
    owner_id      UUID NOT NULL REFERENCES tbl_users(id),   -- navigator
    task_type     followup_task_type NOT NULL,
    trigger_event TEXT,                                     -- e.g. appointment missed
    due_at        TIMESTAMPTZ NOT NULL,
    status_id     BIGINT NOT NULL REFERENCES mst_followup_statuses(id),
    closed_at     TIMESTAMPTZ,
    closure_reason TEXT,
    created_by    UUID REFERENCES tbl_users(id),            -- NULL = system generated
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_followup_owner_due      ON tbl_followup_tasks (owner_id, due_at) WHERE closed_at IS NULL;
CREATE INDEX idx_followup_patient        ON tbl_followup_tasks (patient_id);

-- triggers
CREATE TRIGGER trg_tbl_followup_tasks_updated_at BEFORE UPDATE ON tbl_followup_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
