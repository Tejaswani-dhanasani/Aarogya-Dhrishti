-- Table 39 of 58: tbl_referral_status_history

CREATE TABLE tbl_referral_status_history (               -- APPEND-ONLY
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES tbl_referrals(id),
    from_status referral_status,
    to_status   referral_status NOT NULL,
    changed_by  UUID NOT NULL REFERENCES tbl_users(id),
    reason      TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_ref_hist_referral       ON tbl_referral_status_history (referral_id, changed_at);

-- triggers
CREATE TRIGGER trg_tbl_referral_status_history_append_only BEFORE UPDATE OR DELETE ON tbl_referral_status_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
