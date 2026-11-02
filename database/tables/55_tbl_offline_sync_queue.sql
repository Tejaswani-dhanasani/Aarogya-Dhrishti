-- Table 55 of 58: tbl_offline_sync_queue

CREATE TABLE tbl_offline_sync_queue (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES tbl_users(id),
    device_id          TEXT NOT NULL,
    idempotency_key    TEXT NOT NULL,
    entity_type        TEXT NOT NULL,
    operation          sync_operation NOT NULL,
    payload            JSONB NOT NULL,
    status             sync_status NOT NULL DEFAULT 'PENDING',
    attempts           INT NOT NULL DEFAULT 0,
    last_error         TEXT,
    client_created_at  TIMESTAMPTZ NOT NULL,
    server_ack_at      TIMESTAMPTZ,                        -- set ONLY on server acknowledgement
    resulting_entity_id UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key),                     -- replays create exactly one record
    CONSTRAINT ck_confirmed_has_ack CHECK (status <> 'CONFIRMED' OR server_ack_at IS NOT NULL)
);

-- indexes
CREATE INDEX idx_sync_status             ON tbl_offline_sync_queue (user_id, status);
