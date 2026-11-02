-- Table 45 of 58: tbl_investigation_status_history

CREATE TABLE tbl_investigation_status_history (          -- APPEND-ONLY
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES tbl_investigation_orders(id),
    from_status_id BIGINT REFERENCES mst_investigation_statuses(id),
    to_status_id   BIGINT NOT NULL REFERENCES mst_investigation_statuses(id),
    changed_by     UUID NOT NULL REFERENCES tbl_users(id),
    reason         TEXT,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX idx_inv_hist_order          ON tbl_investigation_status_history (order_id, changed_at);

-- triggers
CREATE TRIGGER trg_tbl_investigation_status_history_append_only BEFORE UPDATE OR DELETE ON tbl_investigation_status_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
