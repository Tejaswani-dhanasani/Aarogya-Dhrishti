-- Table 52 of 58: tbl_case_escalations

CREATE TABLE tbl_case_escalations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID NOT NULL REFERENCES tbl_followup_tasks(id),
    referral_id  UUID NOT NULL REFERENCES tbl_referrals(id),
    level        SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    escalated_by UUID REFERENCES tbl_users(id),            -- NULL = overdue rule fired
    escalated_to UUID REFERENCES tbl_users(id),
    reason       TEXT NOT NULL,
    status       escalation_status NOT NULL DEFAULT 'OPEN',
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

-- indexes
CREATE INDEX idx_escalations_task        ON tbl_case_escalations (task_id, status);
