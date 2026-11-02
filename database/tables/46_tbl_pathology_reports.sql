-- Table 46 of 58: tbl_pathology_reports

CREATE TABLE tbl_pathology_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES tbl_investigation_orders(id),
    report_key      TEXT NOT NULL UNIQUE,                  -- private object key
    checksum_sha256 CHAR(64) NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
    is_simulated    BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_simulated),
    summary_text    TEXT,
    uploaded_by     UUID NOT NULL REFERENCES tbl_users(id),
    reported_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_report_key_private CHECK (report_key !~* '^(https?:)?//')
);

-- indexes
CREATE INDEX idx_path_reports_order      ON tbl_pathology_reports (order_id);
