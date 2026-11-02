-- Table 57 of 58: tbl_demo_datasets

CREATE TABLE tbl_demo_datasets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,                  -- e.g. JURY_12_CASES
    description     TEXT,
    expected_counts JSONB NOT NULL DEFAULT '{}'::jsonb,    -- e.g. {"cases":12,"referrals":4}
    seeded_by       UUID REFERENCES tbl_users(id),
    seeded_at       TIMESTAMPTZ,
    last_reset_at   TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
