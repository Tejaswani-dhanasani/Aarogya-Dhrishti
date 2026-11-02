-- Table 56 of 58: tbl_sync_conflicts

CREATE TABLE tbl_sync_conflicts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id       UUID REFERENCES tbl_offline_sync_queue(id),
    entity_type    TEXT NOT NULL,
    entity_id      UUID NOT NULL,
    local_version  INT,
    server_version INT,
    local_payload  JSONB,
    server_payload JSONB,
    resolution     conflict_resolution NOT NULL DEFAULT 'OPEN',
    resolved_by    UUID REFERENCES tbl_users(id),
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()      -- both payloads kept: clinician notes never discarded
);

-- indexes
CREATE INDEX idx_conflicts_open          ON tbl_sync_conflicts (resolution) WHERE resolution = 'OPEN';
