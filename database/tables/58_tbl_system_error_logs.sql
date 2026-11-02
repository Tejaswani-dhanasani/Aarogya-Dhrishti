-- Table 58 of 58: tbl_system_error_logs

CREATE TABLE tbl_system_error_logs (                     -- sanitized; no PHI, no secrets
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    service     TEXT NOT NULL,                             -- api / ai / web / sync
    severity    error_severity NOT NULL DEFAULT 'ERROR',
    error_code  TEXT,
    message     TEXT NOT NULL,
    request_id  TEXT,
    user_id     UUID REFERENCES tbl_users(id),
    context     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- indexes
CREATE INDEX idx_errors_time             ON tbl_system_error_logs (occurred_at DESC, severity);
